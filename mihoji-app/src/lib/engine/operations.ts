import { z } from 'zod';
import { createHash } from 'node:crypto';

const safePath = z.string().min(1).refine((path) => !path.startsWith('/') && !path.split('/').includes('..'), 'invalid_path');
export const operationSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('create'), path: safePath, content: z.string() }),
  z.object({ op: z.literal('edit'), path: safePath, search: z.string().min(1), replace: z.string() }),
  z.object({ op: z.literal('delete'), path: safePath }),
]);
export const operationPlanSchema = z.object({ summary: z.string(), operations: z.array(operationSchema) });
export type OperationPlan = z.infer<typeof operationPlanSchema>;
export type ProjectFiles = Map<string, string>;

export function hashContent(content: string) {
  return createHash('sha256').update(content).digest('hex');
}

export function applyOperations(files: ProjectFiles, plan: OperationPlan): ProjectFiles {
  const next = new Map(files);
  for (const operation of plan.operations) {
    if (operation.op === 'create') {
      if (next.has(operation.path)) throw new Error(`create_conflict:${operation.path}`);
      next.set(operation.path, operation.content);
    } else if (operation.op === 'delete') {
      if (!next.has(operation.path)) throw new Error(`delete_missing:${operation.path}`);
      next.delete(operation.path);
    } else {
      const current = next.get(operation.path);
      if (current === undefined) throw new Error(`edit_missing:${operation.path}`);
      const occurrences = current.split(operation.search).length - 1;
      if (occurrences !== 1) throw new Error(`edit_ambiguous:${operation.path}`);
      next.set(operation.path, current.replace(operation.search, operation.replace));
    }
  }
  return next;
}

export function filesManifest(files: ProjectFiles) {
  return Object.fromEntries([...files.entries()].map(([path, content]) => [path, hashContent(content)]));
}
