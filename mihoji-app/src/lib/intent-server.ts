import 'server-only';

import { cookies } from 'next/headers';
import { getDb } from '@/db/client';
import { onboardingStates } from '@/db/schema';
import { getLatestProjectPath, type AppSession } from '@/lib/auth';
import { INTENT_COOKIE, intentTarget, parseIntent, type Intent } from '@/lib/intent';

export async function readIntentCookie(): Promise<Intent | null> {
  return parseIntent((await cookies()).get(INTENT_COOKIE)?.value);
}

// Applique l'intention du visiteur et renvoie la page où l'envoyer.
export async function applyIntent(session: AppSession, intent: Intent): Promise<string> {
  const hasProject = (await getLatestProjectPath(session)) !== null;
  const target = intentTarget(intent, hasProject);
  if (target.state && !session.isDemo) {
    await getDb().insert(onboardingStates).values({ workspaceId: session.workspaceId, kind: target.state.kind, step: target.state.step }).onConflictDoUpdate({ target: onboardingStates.workspaceId, set: { kind: target.state.kind, step: target.state.step, updatedAt: new Date() } });
  }
  return target.path;
}
