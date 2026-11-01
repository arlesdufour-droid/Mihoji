import Link from 'next/link';
import { DashboardPreview } from '@/components/marketing/dashboard-preview';
import { MarketingTopBar } from '@/components/marketing/top-bar';

export const metadata = { title: 'Mihoji Pro — sites conformes pour vos clients, sous votre marque' };

const assets = [
  { title: 'Marque blanche', text: 'Vos clients voient votre nom, vos couleurs et votre domaine.' },
  { title: 'Code exportable', text: 'Récupérez le code de chaque site à tout moment, sans dépendance.' },
  { title: 'Transfert au client', text: 'Remettez le site et son hébergement à votre client en un clic.' },
  { title: 'Conformité automatique', text: 'Mentions légales, RGPD et accessibilité vérifiés avant chaque mise en ligne.' },
];

export default function ProPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500 selection:text-white">
      <MarketingTopBar audience="agency" />
      <main>
        <section className="mx-auto max-w-4xl px-5 pb-12 pt-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Agences web et freelances : livrez des sites conformes à vos clients en une heure, sous votre marque.</h1>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login?intent=agency" className="rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500">Créer mon espace agence</Link>
            <a href="#demo" className="rounded-xl border border-slate-600 px-6 py-3 text-base font-semibold text-slate-100 hover:bg-slate-800">Voir une démo</a>
          </div>
        </section>

        <section id="demo" aria-labelledby="tableau-de-bord" className="mx-auto max-w-4xl scroll-mt-6 px-5 pb-16">
          <h2 id="tableau-de-bord" className="sr-only">Le tableau de bord clients</h2>
          <DashboardPreview />
        </section>

        <section aria-labelledby="atouts" className="mx-auto max-w-6xl px-5 pb-20">
          <h2 id="atouts" className="text-2xl font-bold">Pensé pour les professionnels du web</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {assets.map((asset) => (
              <li key={asset.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="font-semibold">{asset.title}</p>
                <p className="mt-2 text-sm text-slate-400">{asset.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">Mihoji © 2026</footer>
    </div>
  );
}
