import { describe, expect, it } from 'vitest';
import { MemoryVaultStorage, Vault, autofill, ephemeralKeyring, generateKey, keyringFromEnv, open, seal } from '../src/index.js';

const ctx = { actor: 'w_alex', purpose: 'test' };

function setup() {
  const storage = new MemoryVaultStorage();
  const keyring = ephemeralKeyring();
  const vault = new Vault(storage, keyring, () => new Date('2026-09-23T12:00:00Z'));
  return { storage, keyring, vault };
}

describe('crypto', () => {
  it('round-trips and detects tampering', () => {
    const key = generateKey();
    const sealed = seal(key, Buffer.from('hello'), 'aad');
    expect(open(key, sealed, 'aad').toString()).toBe('hello');
    const parts = sealed.split('.');
    parts[3] = Buffer.from('HELLO').toString('base64url');
    expect(() => open(key, parts.join('.'), 'aad')).toThrow();
  });

  it('binds ciphertext to its owner and slot', () => {
    const key = generateKey();
    const sealed = seal(key, Buffer.from('123-45-6789'), 'w_alex/field:ssn');
    expect(() => open(key, sealed, 'w_sam/field:ssn')).toThrow();
  });

  it('parses and validates master keys from env', () => {
    const k1 = generateKey().toString('base64');
    const k2 = generateKey().toString('base64');
    const ring = keyringFromEnv({ VAULT_MASTER_KEYS: `k1:${k1},k2:${k2}`, VAULT_ACTIVE_KEY: 'k1' });
    expect(ring.activeKeyId).toBe('k1');
    expect(() => keyringFromEnv({ VAULT_MASTER_KEYS: 'k1:c2hvcnQ=' })).toThrow(/32 bytes/);
    expect(() => keyringFromEnv({})).toThrow(/not set/);
  });
});

describe('vault', () => {
  it('never stores plaintext', () => {
    const { storage, vault } = setup();
    vault.setField('w_alex', 'ssn', '123-45-6789', ctx);
    vault.addDocument('w_alex', { title: 'General liability policy', category: 'insurance', text: 'Policy GL-99887 Acme Mutual', tags: ['insurance'] }, ctx);
    const disk = storage.dump();
    expect(disk).not.toContain('123-45-6789');
    expect(disk).not.toContain('GL-99887');
    expect(disk).not.toContain('General liability');
    expect(vault.getField('w_alex', 'ssn', ctx)).toBe('123-45-6789');
  });

  it('keeps users isolated', () => {
    const { vault } = setup();
    vault.setField('w_alex', 'ein', '12-3456789', ctx);
    expect(vault.getField('w_sam', 'ein', ctx)).toBeUndefined();
  });

  it('finds documents by keyword with snippets', () => {
    const { vault } = setup();
    vault.addDocument('w_alex', { title: 'EPA 608 Universal card', category: 'certification', text: 'Section 608 technician certification, Universal type.', tags: ['hvac'] }, ctx);
    vault.addDocument('w_alex', { title: 'Truck registration', category: 'other', text: 'Vehicle registration renewal', tags: [] }, ctx);
    const hits = vault.searchDocuments('w_alex', 'hvac certification', ctx);
    expect(hits[0]!.title).toBe('EPA 608 Universal card');
    expect(hits[0]!.snippet).toContain('certification');
    expect(hits).toHaveLength(1);
  });

  it('flags expiring documents without decrypting them', () => {
    const { vault } = setup();
    vault.addDocument('w_alex', { title: 'COI', category: 'insurance', text: '', tags: [], expiresAt: '2026-10-10' }, ctx);
    vault.addDocument('w_alex', { title: 'License', category: 'license', text: '', tags: [], expiresAt: '2027-06-01' }, ctx);
    const before = vault.auditLog('w_alex').length;
    expect(vault.expiringDocuments('w_alex', 30).map((d) => d.category)).toEqual(['insurance']);
    expect(vault.auditLog('w_alex')).toHaveLength(before);
  });

  it('audits every read with actor and purpose', () => {
    const { vault } = setup();
    vault.setField('w_alex', 'phone', '512-555-0100', ctx);
    vault.getField('w_alex', 'phone', { actor: 'assistant', purpose: 'bid form' });
    expect(vault.auditLog('w_alex').at(-1)).toMatchObject({ actor: 'assistant', action: 'read_field', target: 'phone', purpose: 'bid form' });
  });

  it('survives master key rotation', () => {
    const { storage, keyring, vault } = setup();
    vault.setField('w_alex', 'legal_name', 'Alex Rivera', ctx);
    keyring.keys.set('k2', generateKey());
    keyring.activeKeyId = 'k2';
    vault.rotate('w_alex', ctx);
    expect(storage.getKey('w_alex')!.kekId).toBe('k2');
    keyring.keys.delete('dev');
    expect(vault.getField('w_alex', 'legal_name', ctx)).toBe('Alex Rivera');
  });
});

describe('autofill', () => {
  it('fills a W-9 from saved fields, masks the tax id, and lists what is missing', () => {
    const { vault } = setup();
    for (const [k, v] of Object.entries({ legal_name: 'Alex Rivera', entity_type: 'Sole proprietor', ssn: '123-45-6789', city: 'Austin', state: 'TX' })) {
      vault.setField('w_alex', k, v, ctx);
    }
    const r = autofill(vault, 'w_alex', 'w9', { actor: 'w_alex' });
    const tin = r.fields.find((f) => f.label.includes('Taxpayer ID'))!;
    expect(tin).toMatchObject({ value: '•••6789', sourceKey: 'ssn', masked: true });
    expect(r.missing).toEqual(['Line 5 – Address', 'Line 6 – ZIP']);
    expect(autofill(vault, 'w_alex', 'w9', { actor: 'w_alex', revealSensitive: true }).fields.find((f) => f.sourceKey === 'ssn')!.value).toBe('123-45-6789');
  });

  it('prefers an EIN over an SSN when both exist', () => {
    const { vault } = setup();
    vault.setField('w_alex', 'ssn', '123-45-6789', ctx);
    vault.setField('w_alex', 'ein', '12-3456789', ctx);
    expect(autofill(vault, 'w_alex', 'w9', { actor: 'w_alex' }).fields.find((f) => f.label.includes('Taxpayer'))!.sourceKey).toBe('ein');
  });
});
