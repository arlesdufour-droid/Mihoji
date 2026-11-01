import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { LoginForm } from '@/components/auth/login-form';
import { getSession } from '@/lib/auth';
import { intentFromParams } from '@/lib/intent';
import { applyIntent } from '@/lib/intent-server';

export const instant = false;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ intent?: string; siret?: string; manual?: string }> }) {
  await connection();
  const intent = intentFromParams(await searchParams);
  if (intent) {
    // Un visiteur déjà connecté va directement à sa destination, sans repasser par le choix de l'espace.
    const session = await getSession();
    if (session) redirect(await applyIntent(session, intent));
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-50"><LoginForm intent={intent} /></main>;
}
