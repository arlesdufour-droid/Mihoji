const suspiciousPatterns: Array<[RegExp, string]> = [
  [/(mot de passe|password|code bancaire|code de carte|num[eé]ro de carte|identifiant|login)/i, 'demande d’identifiants ou de données bancaires'],
  [/(banque|livraison|colissimo|chronopost|ameli|imp[oô]ts|caf|paypal|la poste)/i, 'imitation potentielle d’une marque ou administration'],
];

export function scanPublishedSite(files: Record<string, string>) {
  const findings = new Set<string>();
  for (const [path, content] of Object.entries(files)) {
    if (!/\.(html?|tsx?|jsx?)$/i.test(path)) continue;
    for (const [pattern, reason] of suspiciousPatterns) {
      if (pattern.test(content)) findings.add(reason);
    }
  }
  return [...findings];
}
