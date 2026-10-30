import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Votre application',
  description: 'Une application construite avec Mihoji.',
  openGraph: { title: 'Votre application', description: 'Une application construite avec Mihoji.' },
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
