import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, loadEncryptionKey } from './crypto';
import { connectorHintMessage, connectorsContext, missingConnectorsFor } from './hints';
import { connectedCapabilities, connectors } from './registry';

const key = loadEncryptionKey({ CONNECTIONS_ENCRYPTION_KEY: '00'.repeat(32) });

describe('chiffrement des jetons', () => {
  it('chiffre puis déchiffre, sans jamais laisser le jeton en clair', () => {
    const payload = encryptSecret('xkeysib-secret-123', key);
    expect(payload).not.toContain('xkeysib');
    expect(payload.startsWith('v1.')).toBe(true);
    expect(decryptSecret(payload, key)).toBe('xkeysib-secret-123');
  });
  it('produit un chiffré différent à chaque fois (IV aléatoire)', () => {
    expect(encryptSecret('a-secret-value', key)).not.toBe(encryptSecret('a-secret-value', key));
  });
  it('refuse un chiffré modifié ou une mauvaise clé', () => {
    const payload = encryptSecret('a-secret-value', key);
    const [v, iv, tag, data] = payload.split('.');
    expect(() => decryptSecret([v, iv, tag, `${data.slice(0, -2)}AA`].join('.'), key)).toThrow();
    expect(() => decryptSecret(payload, loadEncryptionKey({ CONNECTIONS_ENCRYPTION_KEY: '11'.repeat(32) }))).toThrow();
  });
  it('clé : hexadécimale ou base64, 32 octets ; absente = erreur en production, clé de développement ailleurs', () => {
    expect(loadEncryptionKey({ CONNECTIONS_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') })).toHaveLength(32);
    expect(() => loadEncryptionKey({ CONNECTIONS_ENCRYPTION_KEY: 'trop-court' })).toThrow('connections_encryption_key_invalid');
    expect(() => loadEncryptionKey({ APP_ENV: 'production' })).toThrow('connections_encryption_key_missing');
    expect(() => loadEncryptionKey({ NODE_ENV: 'production' })).toThrow('connections_encryption_key_missing');
    expect(loadEncryptionKey({})).toHaveLength(32);
  });
});

describe('capacités des connecteurs', () => {
  it('chaque connecteur déclare au moins une capacité et des droits', () => {
    for (const connector of connectors) { expect(connector.capabilities.length, connector.id).toBeGreaterThan(0); expect(connector.rights.length, connector.id).toBeGreaterThan(10); }
  });
  it('les capacités utilisables sont celles des connecteurs branchés', () => {
    expect(connectedCapabilities([])).toEqual([]);
    expect(connectedCapabilities(['brevo'])).toEqual(['email.notify', 'email.newsletter']);
  });
  it('le contexte donné à l’IA liste les outils branchés et ceux à brancher', () => {
    expect(connectorsContext([])).toContain('Aucun outil branché');
    expect(connectorsContext([])).toContain('Brevo');
    expect(connectorsContext(['brevo'])).toContain('Branchés : Brevo');
  });
});

describe('propositions de connexion', () => {
  it('« rendez-vous avec acompte » propose Stripe tant qu’il n’est pas branché', () => {
    expect(missingConnectorsFor('ajoute la prise de rendez-vous avec acompte', []).map((item) => item.id)).toEqual(['stripe']);
    expect(connectorHintMessage('ajoute la prise de rendez-vous avec acompte', [])).toContain('« Connexions »');
  });
  it('ne propose rien quand la capacité est déjà branchée, ni pour une demande sans rapport', () => {
    expect(missingConnectorsFor('ajoute une inscription newsletter', ['brevo'])).toEqual([]);
    expect(connectorHintMessage('change la couleur du titre', [])).toBeNull();
  });
  it('propose de brancher Brevo pour une liste de contacts, et le dit clairement', () => {
    expect(connectorHintMessage('ajoute une newsletter', [])).toContain('branchez Brevo dans l’onglet « Connexions »');
  });
});
