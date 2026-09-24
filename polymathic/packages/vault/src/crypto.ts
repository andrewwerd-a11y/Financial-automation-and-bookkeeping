import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Envelope encryption with AES-256-GCM.
 *
 * - Each user gets their own data key (DEK). All of their records are
 *   encrypted with it.
 * - DEKs are stored only in wrapped (encrypted) form, under a master key
 *   (KEK). In production the KEK lives in a KMS/HSM and never touches disk.
 * - Every ciphertext is bound to its owner and record id through GCM
 *   additional authenticated data, so a record copied to another user or
 *   slot fails to decrypt instead of leaking.
 */

const ALG = 'aes-256-gcm';
const VERSION = 'v1';

export function generateKey(): Buffer {
  return randomBytes(32);
}

export function seal(key: Buffer, plaintext: Buffer, aad: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join('.');
}

export function open(key: Buffer, sealed: string, aad: string): Buffer {
  const [version, iv, tag, ct] = sealed.split('.');
  if (version !== VERSION || !iv || !tag || ct === undefined) throw new Error('Unrecognized ciphertext format');
  const decipher = createDecipheriv(ALG, key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]);
}

export interface Keyring {
  activeKeyId: string;
  keys: Map<string, Buffer>;
}

/**
 * Parses `VAULT_MASTER_KEYS="k1:<base64>,k2:<base64>"` and `VAULT_ACTIVE_KEY=k2`.
 * Old keys stay listed so existing data keys can still be unwrapped during rotation.
 */
export function keyringFromEnv(env: Record<string, string | undefined>): Keyring {
  const raw = env.VAULT_MASTER_KEYS;
  if (!raw) throw new Error('VAULT_MASTER_KEYS is not set');
  const keys = new Map<string, Buffer>();
  for (const entry of raw.split(',')) {
    const [id, b64] = entry.trim().split(':');
    if (!id || !b64) throw new Error('VAULT_MASTER_KEYS entries must look like id:base64key');
    const key = Buffer.from(b64, 'base64');
    if (key.length !== 32) throw new Error(`Master key ${id} must be 32 bytes`);
    keys.set(id, key);
  }
  const activeKeyId = env.VAULT_ACTIVE_KEY ?? [...keys.keys()].at(-1)!;
  if (!keys.has(activeKeyId)) throw new Error(`VAULT_ACTIVE_KEY ${activeKeyId} not in VAULT_MASTER_KEYS`);
  return { activeKeyId, keys };
}

/** For local development and tests only. */
export function ephemeralKeyring(): Keyring {
  return { activeKeyId: 'dev', keys: new Map([['dev', generateKey()]]) };
}
