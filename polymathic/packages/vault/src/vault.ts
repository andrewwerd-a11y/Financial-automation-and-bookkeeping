import { randomUUID } from 'node:crypto';
import { generateKey, open, seal, type Keyring } from './crypto.js';

export type DocumentCategory =
  | 'identity'
  | 'tax'
  | 'insurance'
  | 'license'
  | 'certification'
  | 'contract'
  | 'invoice'
  | 'receipt'
  | 'permit'
  | 'business_formation'
  | 'other';

/** What's stored at rest. Only non-sensitive metadata is in the clear. */
export interface EncryptedRecord {
  id: string;
  userId: string;
  kind: 'field' | 'document';
  /** Clear so expiry reminders work without decrypting anything. */
  category?: DocumentCategory;
  expiresAt?: string;
  createdAt: string;
  payload: string;
}

export interface WrappedKey {
  userId: string;
  kekId: string;
  wrapped: string;
}

export interface AuditEntry {
  at: string;
  userId: string;
  actor: string;
  action: 'read_field' | 'write_field' | 'add_document' | 'read_document' | 'search' | 'rotate';
  target?: string;
  purpose?: string;
}

/** Storage backend. In-memory here; Postgres in production. Never sees plaintext. */
export interface VaultStorage {
  getKey(userId: string): WrappedKey | undefined;
  putKey(key: WrappedKey): void;
  put(record: EncryptedRecord): void;
  get(userId: string, id: string): EncryptedRecord | undefined;
  list(userId: string): EncryptedRecord[];
  audit(entry: AuditEntry): void;
  auditLog(userId: string): AuditEntry[];
}

export class MemoryVaultStorage implements VaultStorage {
  private keys = new Map<string, WrappedKey>();
  private records = new Map<string, EncryptedRecord>();
  private log: AuditEntry[] = [];
  getKey(userId: string) {
    return this.keys.get(userId);
  }
  putKey(key: WrappedKey) {
    this.keys.set(key.userId, key);
  }
  put(record: EncryptedRecord) {
    this.records.set(`${record.userId}/${record.id}`, record);
  }
  get(userId: string, id: string) {
    return this.records.get(`${userId}/${id}`);
  }
  list(userId: string) {
    return [...this.records.values()].filter((r) => r.userId === userId);
  }
  audit(entry: AuditEntry) {
    this.log.push(entry);
  }
  auditLog(userId: string) {
    return this.log.filter((e) => e.userId === userId);
  }
  /** Test helper: everything that would be written to disk. */
  dump(): string {
    return JSON.stringify({ keys: [...this.keys.values()], records: [...this.records.values()] });
  }
}

export interface AccessContext {
  actor: string;
  purpose?: string;
}

export interface VaultDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  /** Extracted text (OCR/parsing happens before storage) used for search and AI retrieval. */
  text: string;
  tags: string[];
  mimeType?: string;
  /** Original file bytes, base64. Optional: some records are text-only. */
  contentBase64?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface SearchHit {
  id: string;
  title: string;
  category: DocumentCategory;
  score: number;
  snippet: string;
  expiresAt?: string;
}

const fieldId = (key: string) => `field:${key}`;

/**
 * The user's encrypted filing cabinet: profile fields for autofill plus
 * documents (licenses, insurance, tax forms, contracts, receipts) that the
 * assistant can find and use on the user's behalf. Every read is audited.
 */
export class Vault {
  constructor(
    private storage: VaultStorage,
    private keyring: Keyring,
    private now: () => Date = () => new Date(),
  ) {}

  setField(userId: string, key: string, value: string, ctx: AccessContext): void {
    const id = fieldId(key);
    this.storage.put({
      id,
      userId,
      kind: 'field',
      createdAt: this.now().toISOString(),
      payload: seal(this.dataKey(userId), Buffer.from(value, 'utf8'), `${userId}/${id}`),
    });
    this.audit(userId, ctx, 'write_field', key);
  }

  getField(userId: string, key: string, ctx: AccessContext): string | undefined {
    const id = fieldId(key);
    const rec = this.storage.get(userId, id);
    if (!rec) return undefined;
    this.audit(userId, ctx, 'read_field', key);
    return open(this.dataKey(userId), rec.payload, `${userId}/${id}`).toString('utf8');
  }

  fieldKeys(userId: string): string[] {
    return this.storage
      .list(userId)
      .filter((r) => r.kind === 'field')
      .map((r) => r.id.slice('field:'.length));
  }

  addDocument(userId: string, doc: Omit<VaultDocument, 'id' | 'createdAt'>, ctx: AccessContext): string {
    const id = `doc:${randomUUID()}`;
    const full: VaultDocument = { ...doc, id, createdAt: this.now().toISOString() };
    this.storage.put({
      id,
      userId,
      kind: 'document',
      category: doc.category,
      expiresAt: doc.expiresAt,
      createdAt: full.createdAt,
      payload: seal(this.dataKey(userId), Buffer.from(JSON.stringify(full), 'utf8'), `${userId}/${id}`),
    });
    this.audit(userId, ctx, 'add_document', id);
    return id;
  }

  getDocument(userId: string, id: string, ctx: AccessContext): VaultDocument | undefined {
    const rec = this.storage.get(userId, id);
    if (!rec || rec.kind !== 'document') return undefined;
    this.audit(userId, ctx, 'read_document', id);
    return this.decryptDoc(userId, rec);
  }

  /**
   * Keyword search across the user's own documents. Decrypts in memory only;
   * per-user volumes are small. A blind index can replace this at scale.
   */
  searchDocuments(userId: string, query: string, ctx: AccessContext, limit = 5): SearchHit[] {
    this.audit(userId, ctx, 'search', query);
    const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 1);
    if (!terms.length) return [];
    const hits: SearchHit[] = [];
    for (const rec of this.storage.list(userId)) {
      if (rec.kind !== 'document') continue;
      const doc = this.decryptDoc(userId, rec);
      const title = doc.title.toLowerCase();
      const body = doc.text.toLowerCase();
      const tags = doc.tags.map((t) => t.toLowerCase());
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 3;
        if (tags.some((t) => t.includes(term)) || doc.category.includes(term)) score += 2;
        score += Math.min(3, countOccurrences(body, term));
      }
      if (score > 0) {
        hits.push({ id: doc.id, title: doc.title, category: doc.category, score, snippet: snippet(doc.text, terms), expiresAt: doc.expiresAt });
      }
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /** Licenses, insurance, and certs about to lapse. Uses clear metadata only. */
  expiringDocuments(userId: string, withinDays: number): { id: string; category?: DocumentCategory; expiresAt: string }[] {
    const cutoff = this.now().getTime() + withinDays * 86_400_000;
    return this.storage
      .list(userId)
      .filter((r) => r.kind === 'document' && r.expiresAt && Date.parse(r.expiresAt) <= cutoff)
      .map((r) => ({ id: r.id, category: r.category, expiresAt: r.expiresAt! }))
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  }

  /** Re-wraps the user's data key under the active master key (key rotation). */
  rotate(userId: string, ctx: AccessContext): void {
    const dek = this.dataKey(userId);
    this.storage.putKey(this.wrap(userId, dek));
    this.audit(userId, ctx, 'rotate');
  }

  auditLog(userId: string): AuditEntry[] {
    return this.storage.auditLog(userId);
  }

  private decryptDoc(userId: string, rec: EncryptedRecord): VaultDocument {
    return JSON.parse(open(this.dataKey(userId), rec.payload, `${userId}/${rec.id}`).toString('utf8')) as VaultDocument;
  }

  private dataKey(userId: string): Buffer {
    const stored = this.storage.getKey(userId);
    if (stored) {
      const kek = this.keyring.keys.get(stored.kekId);
      if (!kek) throw new Error(`Master key ${stored.kekId} unavailable`);
      return open(kek, stored.wrapped, `dek:${userId}`);
    }
    const dek = generateKey();
    this.storage.putKey(this.wrap(userId, dek));
    return dek;
  }

  private wrap(userId: string, dek: Buffer): WrappedKey {
    const kekId = this.keyring.activeKeyId;
    return { userId, kekId, wrapped: seal(this.keyring.keys.get(kekId)!, dek, `dek:${userId}`) };
  }

  private audit(userId: string, ctx: AccessContext, action: AuditEntry['action'], target?: string) {
    this.storage.audit({ at: this.now().toISOString(), userId, actor: ctx.actor, action, target, purpose: ctx.purpose });
  }
}

function countOccurrences(haystack: string, needle: string): number {
  let n = 0;
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) n++;
  return n;
}

function snippet(text: string, terms: string[], radius = 60): string {
  const lower = text.toLowerCase();
  const pos = Math.min(...terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0), text.length);
  if (pos === text.length) return text.slice(0, radius * 2);
  const start = Math.max(0, pos - radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, pos + radius)}${pos + radius < text.length ? '…' : ''}`;
}
