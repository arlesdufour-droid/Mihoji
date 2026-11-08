import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Chiffrement des jetons des connecteurs (AES-256-GCM). Format : v1.<iv>.<tag>.<texte chiffré> (base64url).
// La clé vient de CONNECTIONS_ENCRYPTION_KEY (32 octets en base64 ou 64 caractères hexadécimaux), jamais du navigateur.
// En développement sans clé, une clé fixe de développement est utilisée (simulation) ; en production, une clé absente est une erreur explicite.

export function loadEncryptionKey(env: Record<string, string | undefined> = process.env): Buffer {
  const raw = env.CONNECTIONS_ENCRYPTION_KEY?.trim();
  if (raw) {
    const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
    if (key.length !== 32) throw new Error('connections_encryption_key_invalid');
    return key;
  }
  if (env.NODE_ENV === 'production' || env.APP_ENV === 'production') throw new Error('connections_encryption_key_missing');
  return createHash('sha256').update('mihoji-development-connections-key').digest();
}

export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decryptSecret(payload: string, key: Buffer): string {
  const [version, iv, tag, data] = payload.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('connections_payload_invalid');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
