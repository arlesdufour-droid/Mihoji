import 'server-only';

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PhotoReport } from '@/lib/photos/service';
import type { SiteDescription } from './schema';

// Diagnostic facultatif (DESIGN_DEBUG_DIR) : enregistre, pour une génération, les emplacements d'images demandés par le modèle, le rapport de la recherche de photos
// et ce qui reste dans le site final, AVANT que les données d'un test ne soient nettoyées. Inactif sans la variable ; jamais utilisé en production.
const imageQueries = (value: unknown): { query: string; alt?: string }[] => {
  const found: { query: string; alt?: string }[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      if (typeof record.query === 'string') found.push({ query: record.query, alt: typeof record.alt === 'string' ? record.alt : undefined });
      Object.values(record).forEach(walk);
    }
  };
  walk(value);
  return found;
};

export function dumpDesignDebug(input: { request: string; requested: SiteDescription; final: SiteDescription; report: PhotoReport }): void {
  const dir = process.env.DESIGN_DEBUG_DIR;
  if (!dir || process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') return;
  try {
    mkdirSync(dir, { recursive: true });
    const sections = (site: SiteDescription) => site.pages[0].sections.map((section) => ({ type: section.type, slots: imageQueries(section), photos: (JSON.stringify(section).match(/"src":"[^"]*"/g) ?? []).length }));
    const services = input.final.pages[0].sections.find((section) => section.type === 'services');
    writeFileSync(resolve(dir, `generation-${Date.now()}.json`), JSON.stringify({
      request: input.request, report: input.report, requestedSections: sections(input.requested), finalSections: sections(input.final),
      servicesWithPhoto: services && services.type === 'services' ? { total: services.items.length, withPhoto: services.items.filter((item) => item.image?.src).length } : null,
      aboutWithPhoto: input.final.pages[0].sections.some((section) => section.type === 'about' && Boolean(section.image?.src)),
      requestedDescription: input.requested, finalDescription: input.final,
    }, null, 2));
  } catch (error) {
    console.warn('Design debug dump failed.', error instanceof Error ? error.message : error);
  }
}
