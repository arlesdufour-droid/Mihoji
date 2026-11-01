import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { samples } from '@/lib/site/samples';
import { sectionTypes, sectionVariants } from '@/lib/site/schema';
import { styles } from '@/lib/site/themes';

export const instant = false;

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ style?: string; palette?: string; sample?: string }> }) {
  await connection();
  const session = await getSession();
  if (!session || !isAdmin(session)) redirect('/');
  const params = await searchParams;
  const style = styles.find((candidate) => candidate.id === params.style) ?? styles[0];
  const palette = style.palettes.find((candidate) => candidate.id === params.palette) ?? style.palettes[0];
  const sample = samples.find((candidate) => candidate.id === params.sample) ?? samples.find((candidate) => candidate.style === style.id) ?? samples[0];
  const query = (extra: Record<string, string>) => new URLSearchParams({ style: style.id, palette: palette.id, ...extra }).toString();
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Design des sites générés</h1>
      <p className="mt-2 max-w-3xl text-slate-400">{style.tagline}</p>
      <nav aria-label="Styles" className="mt-6 flex flex-wrap gap-2">
        {styles.map((candidate) => <Link key={candidate.id} href={`/admin/design?style=${candidate.id}`} aria-current={candidate.id === style.id ? 'page' : undefined} className={`rounded-lg px-4 py-2 text-sm ${candidate.id === style.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{candidate.label}</Link>)}
      </nav>
      <nav aria-label="Palettes" className="mt-3 flex flex-wrap gap-2 text-sm">
        {style.palettes.map((candidate) => <Link key={candidate.id} href={`/admin/design?style=${style.id}&palette=${candidate.id}`} aria-current={candidate.id === palette.id ? 'page' : undefined} className={`flex items-center gap-2 rounded-full border px-3 py-1 ${candidate.id === palette.id ? 'border-indigo-400 text-white' : 'border-slate-700 text-slate-400'}`}><span className="h-3 w-3 rounded-full" style={{ background: candidate.primary }} />{candidate.label}</Link>)}
      </nav>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Site d’exemple : {sample.label}</h2>
        <iframe title={`Site d’exemple ${sample.label}`} src={`/admin/design/render?${query({ sample: sample.id })}`} className="mt-4 h-[80vh] w-full rounded-xl border border-slate-700 bg-white" />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Catalogue des sections</h2>
        <p className="mt-1 text-sm text-slate-400">{sectionTypes.length} types de sections, chacun en 2 ou 3 variantes.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sectionTypes.map((type) => (
            <li key={type} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <a href={`/admin/design/render?${query({ catalogue: type })}`} target="_blank" rel="noopener" className="font-semibold text-indigo-300 hover:underline">{type}</a>
              <p className="mt-1 text-xs text-slate-500">{sectionVariants[type].join(' · ')}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
