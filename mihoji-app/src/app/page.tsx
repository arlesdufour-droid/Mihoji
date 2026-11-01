import Link from 'next/link';
import { MarketingTopBar } from '@/components/marketing/top-bar';
import { SiretStartForm } from '@/components/marketing/siret-start-form';
import { examples } from '@/lib/marketing-examples';

export const metadata = { title: 'Mihoji — le site de votre entreprise, en ligne en 10 minutes' };

const guarantees = [
  { title: 'Mentions légales et RGPD inclus', text: 'Vos pages obligatoires sont générées à partir de vos informations officielles.' },
  { title: 'Hébergé en France', text: 'Votre site et vos données restent en Europe.' },
  { title: 'Sans engagement', text: 'Commencez gratuitement, arrêtez quand vous voulez.' },
];

const steps = [
  { title: 'Entrez votre SIRET', text: 'Nous retrouvons automatiquement le nom, l’adresse et l’activité de votre entreprise.' },
  { title: 'Vérifiez vos informations', text: 'Complétez en quelques clics ce qui manque : horaires, téléphone, services.' },
  { title: 'Votre site est prêt', text: 'Modifiez-le en écrivant simplement ce que vous voulez, puis mettez-le en ligne.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500 selection:text-white">
      <MarketingTopBar audience="business" />
      <main>
        <section className="mx-auto max-w-4xl px-5 pb-16 pt-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Artisans, commerçants, indépendants : le site de votre entreprise, en ligne en 10 minutes.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">Conforme à la loi française. Sans connaissances techniques.</p>
          <SiretStartForm />
        </section>

        <section aria-labelledby="garanties" className="mx-auto max-w-6xl px-5 pb-16">
          <h2 id="garanties" className="sr-only">Nos garanties</h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {guarantees.map((guarantee) => (
              <li key={guarantee.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="font-semibold">✓ {guarantee.title}</p>
                <p className="mt-2 text-sm text-slate-400">{guarantee.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="exemples" className="mx-auto max-w-6xl px-5 pb-16">
          <h2 id="exemples" className="text-2xl font-bold">Des sites pour tous les métiers</h2>
          <p className="mt-2 text-slate-400">Cliquez sur un exemple pour voir le site que vous pourriez avoir.</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {examples.map((example) => (
              <li key={example.slug}>
                <Link href={`/exemples/${example.slug}`} className="block h-full rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-indigo-400 hover:bg-slate-800">
                  <span className="text-3xl" aria-hidden="true">{example.emoji}</span>
                  <span className="mt-3 block text-lg font-semibold">{example.label}</span>
                  <span className="mt-1 block text-sm text-slate-400">{example.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="comment" className="mx-auto max-w-6xl px-5 pb-20">
          <h2 id="comment" className="text-2xl font-bold">Comment ça marche</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold">{index + 1}</span>
                <p className="mt-4 font-semibold">{step.title}</p>
                <p className="mt-2 text-sm text-slate-400">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">Mihoji © 2026</footer>
    </div>
  );
}
