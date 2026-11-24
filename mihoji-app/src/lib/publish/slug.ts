// Sous-domaine d'un site publié : règles pures (aucune base de données ici).
// 3 à 40 caractères, a–z, 0–9 et tirets, jamais au début ni à la fin, jamais deux tirets de suite (réservé aux noms internationaux « xn-- »).

export const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

// Noms qui ne peuvent jamais être pris par un client : infrastructure, courrier, pages de l'application, usurpation de la marque ou de services de paiement.
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  'www', 'app', 'admin', 'api', 'mail', 'email', 'smtp', 'imap', 'pop', 'ftp', 'ns', 'ns1', 'ns2', 'dns', 'mx', 'webmail', 'autodiscover',
  'static', 'assets', 'cdn', 'img', 'images', 'media', 'files', 'fonts', 'studio', 'login', 'logout', 'signup', 'register', 'auth', 'oauth', 'sso',
  'account', 'compte', 'settings', 'dashboard', 'agency', 'agence', 'onboarding', 'billing', 'payment', 'paiement', 'pay', 'checkout', 'stripe', 'webhook', 'webhooks',
  'support', 'help', 'aide', 'contact', 'status', 'blog', 'docs', 'doc', 'demo', 'exemples', 'exemple', 'pro', 'staging', 'preview', 'dev', 'test', 'tests', 'prod', 'production',
  'sites', 'site', 'mihoji', 'root', 'administrator', 'postmaster', 'hostmaster', 'abuse', 'security', 'securite', 'legal', 'localhost',
]);

export type SubdomainProblem = 'trop_court' | 'trop_long' | 'caracteres' | 'tirets' | 'reserve';

export const SUBDOMAIN_PROBLEM_LABELS: Record<SubdomainProblem, string> = {
  trop_court: 'L’adresse doit faire au moins 3 caractères.',
  trop_long: 'L’adresse doit faire 40 caractères au plus.',
  caracteres: 'Utilisez seulement des lettres sans accent, des chiffres et des tirets.',
  tirets: 'L’adresse ne peut ni commencer ni finir par un tiret, ni en contenir deux de suite.',
  reserve: 'Cette adresse est réservée : choisissez-en une autre.',
};

export function validateSubdomain(value: string): SubdomainProblem | null {
  if (value.length < 3) return 'trop_court';
  if (value.length > 40) return 'trop_long';
  if (!/^[a-z0-9-]+$/.test(value)) return 'caracteres';
  if (value.startsWith('-') || value.endsWith('-') || value.includes('--')) return 'tirets';
  if (RESERVED_SUBDOMAINS.has(value)) return 'reserve';
  return null;
}

// « Boulangerie Lemoine & Fils » → « boulangerie-lemoine-fils ».
export function slugify(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}

// Adresse proposée pour un nom d'entreprise, la première libre : nom, nom-2, nom-3… (« taken » : adresses déjà prises).
export function suggestSubdomain(name: string, taken: ReadonlySet<string> | ((candidate: string) => boolean) = new Set()): string {
  const isTaken = typeof taken === 'function' ? taken : (candidate: string) => taken.has(candidate);
  let base = slugify(name).slice(0, 36).replace(/-+$/g, '');
  if (base.length < 3 || validateSubdomain(base) === 'reserve') base = base.length >= 3 ? `${base}-site` : base ? `${base}-site` : 'mon-site';
  if (validateSubdomain(base) !== null && validateSubdomain(base) !== 'reserve') base = 'mon-site';
  if (!isTaken(base)) return base;
  for (let n = 2; n < 10_000; n += 1) {
    const candidate = `${base.slice(0, 40 - String(n).length - 1)}-${n}`.replace(/--/g, '-');
    if (validateSubdomain(candidate) === null && !isTaken(candidate)) return candidate;
  }
  throw new Error('subdomain_exhausted');
}
