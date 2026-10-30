import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { EnvironmentBadge } from "@/components/environment-badge";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mihoji | Le site de votre entreprise",
  description: "Créez et mettez en ligne le site de votre entreprise avec Mihoji.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${fraunces.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-slate-950 font-sans text-slate-50">{children}<EnvironmentBadge /></body>
    </html>
  );
}
