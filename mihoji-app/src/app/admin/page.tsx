import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';

export const instant = false;

export default async function AdminPage() {
  const session = await getSession();
  if (!session || !isAdmin(session)) redirect('/');
  return <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><h1 className="text-3xl font-semibold">Back-office Mihoji</h1><p className="mt-2 text-slate-400">Utilisez l’API /api/admin pour consulter les espaces, crédits, publications, signalements et demandes de support.</p></main>;
}
