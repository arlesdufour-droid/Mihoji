import 'server-only';

import type { AppSession } from '@/lib/auth';

export function isAdmin(session: AppSession) {
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  return Boolean(session.user.email && allowed.includes(session.user.email.toLowerCase()));
}

export function requireAdmin(session: AppSession | null) {
  if (!session || !isAdmin(session)) throw new Error('admin_forbidden');
  return session;
}
