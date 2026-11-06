import 'server-only';

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BenchmarkResults } from './benchmark';

// Lecture des exécutions du banc d'essai (docs/benchmark/<identifiant>/) et notes manuelles. Disque du serveur : développement et Codespaces.
const baseDir = () => resolve(process.cwd(), 'docs/benchmark');

export const RUN_ID = /^[0-9A-Za-z][0-9A-Za-z-]{2,40}$/;
export const FILE_NAME = /^[a-z0-9-]+\.(jpg|html)$/;

export type ManualRatings = Record<string, number>;

export function runDir(runId: string): string | null {
  if (!RUN_ID.test(runId)) return null;
  const dir = resolve(baseDir(), runId);
  return existsSync(resolve(dir, 'results.json')) ? dir : null;
}

// Exécutions disponibles, de la plus récente à la plus ancienne.
export function listRuns(): string[] {
  if (!existsSync(baseDir())) return [];
  return readdirSync(baseDir(), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && RUN_ID.test(entry.name) && existsSync(resolve(baseDir(), entry.name, 'results.json')))
    .map((entry) => entry.name)
    .sort()
    .reverse();
}

export function readRun(runId: string): BenchmarkResults | null {
  const dir = runDir(runId);
  if (!dir) return null;
  try {
    return JSON.parse(readFileSync(resolve(dir, 'results.json'), 'utf8')) as BenchmarkResults;
  } catch {
    return null;
  }
}

export function readManual(runId: string): ManualRatings {
  const dir = runDir(runId);
  if (!dir || !existsSync(resolve(dir, 'manual.json'))) return {};
  try {
    const raw = JSON.parse(readFileSync(resolve(dir, 'manual.json'), 'utf8')) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, number] => Number.isInteger(entry[1]) && (entry[1] as number) >= 1 && (entry[1] as number) <= 5));
  } catch {
    return {};
  }
}

// Enregistre (ou efface, avec null) la note manuelle d'un site, avec l'exécution.
export function writeManualRating(runId: string, siteId: string, rating: number | null): ManualRatings | null {
  const dir = runDir(runId);
  const results = readRun(runId);
  if (!dir || !results || !results.sites.some((site) => site.id === siteId)) return null;
  const ratings = readManual(runId);
  if (rating === null) delete ratings[siteId];
  else ratings[siteId] = rating;
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'manual.json'), `${JSON.stringify(ratings, null, 2)}\n`);
  return ratings;
}

export function readRunFile(runId: string, name: string): Buffer | null {
  const dir = runDir(runId);
  if (!dir || !FILE_NAME.test(name)) return null;
  const file = resolve(dir, name);
  return file.startsWith(dir) && existsSync(file) ? readFileSync(file) : null;
}
