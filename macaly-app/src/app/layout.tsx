import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mihoji | Build with your ideas",
  description: "Build and publish web apps with Mihoji.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-slate-950 font-sans text-slate-50">{children}</body>
    </html>
  );
}
