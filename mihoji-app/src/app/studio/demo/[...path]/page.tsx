import { getLatestProjectPath, getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

export const instant = false;

export default async function StudioDemoPathRedirect() {
  await connection();
  const session = await getSession();
  if (!session) redirect('/login');
  redirect((await getLatestProjectPath(session)) ?? '/onboarding');
}
