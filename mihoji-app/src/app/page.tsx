'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const router = useRouter();

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    router.push('/studio/demo');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-6 md:p-24 selection:bg-indigo-500 selection:text-white">
      {/* En-tête minimaliste */}
      <nav className="w-full max-w-5xl flex justify-between items-center py-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-lg">
            M
          </div>
          <span className="font-bold text-xl tracking-tight">Mihoji</span>
        </div>
      </nav>

      {/* Section Centrale */}
      <div className="w-full max-w-3xl flex flex-col items-center text-center my-auto space-y-8 py-12">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs md:text-sm font-medium">
          <span>✨ Créez des sites web par simple discussion</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Que souhaitez-vous <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            créer aujourd&apos;hui ?
          </span>
        </h1>

        <p className="text-slate-400 text-base md:text-lg max-w-xl">
          Décrivez votre idée de site ou d&apos;application, et laissez l&apos;IA générer l&apos;interface pour vous en quelques secondes.
        </p>

        {/* Barre de Prompt Principale */}
        <form onSubmit={handleGenerate} className="w-full relative">
          <div className="relative flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl focus-within:border-indigo-500 transition-all">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Un site e-commerce pour une boutique de vêtement..."
              className="w-full bg-transparent px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm md:text-base"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 flex-shrink-0"
            >
              Générer
            </button>
          </div>
        </form>

        {/* Exemples rapides */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <span className="text-xs text-slate-500 self-center mr-2">Suggestions :</span>
          {[
            "Dashboard SaaS",
            "Site de Photographe",
            "Landing Page Startup",
          ].map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                setPrompt(suggestion);
                router.push('/studio/demo');
              }}
              className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg transition-all"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Pied de page */}
      <footer className="w-full max-w-5xl text-center text-xs text-slate-600 py-4 border-t border-slate-900/50">
        Mihoji © 2026
      </footer>
    </main>
  );
}