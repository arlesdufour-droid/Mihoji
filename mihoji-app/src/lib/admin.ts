import 'server-only';

import { existsSync, readFileSync } from 'node:fs';
import type { AppSession } from '@/lib/auth';

// Pendant les tests e2e, l'utilisateur de test est administrateur (relais écrit par le setup Playwright).
function e2eAdminEmail(): string {
  if (process.env.NODE_ENV === 'production' || !existsSync('e2e/.admin-email')) return '';
  try {
    return readFileSync('e2e/.admin-email', 'utf8').trim().toLowerCase();
  } catch {
    return '';
  }
}

export function isAdmin(session: AppSession) {
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  const e2eEmail = e2eAdminEmail();
  if (e2eEmail) allowed.push(e2eEmail);
  return Boolean(session.user.email && allowed.includes(session.user.email.toLowerCase()));
}

export function requireAdmin(session: AppSession | null) {
  if (!session || !isAdmin(session)) throw new Error('admin_forbidden');
  return session;
}
