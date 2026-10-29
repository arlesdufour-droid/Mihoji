import { applyOperations, filesManifest, operationPlanSchema, type ProjectFiles } from './operations';
import type { SandboxProvider } from '@/lib/sandbox';

export type GenerationEvent = { type: 'planning' | 'editing' | 'installing' | 'building' | 'fixing' | 'ready' | 'failed'; attempt?: number; message?: string };
export type GenerationAgent = { complete(task: 'generate' | 'edit' | 'fix', files: ProjectFiles, error?: string): Promise<unknown> };

export async function runGeneration(agent: GenerationAgent, sandbox: SandboxProvider, initialFiles: ProjectFiles, emit: (event: GenerationEvent) => void, signal?: AbortSignal) {
  let files = new Map(initialFiles);
  const handle = await sandbox.create('generated-project');
  try {
    emit({ type: 'planning' });
    const plan = operationPlanSchema.parse(await agent.complete('generate', files));
    emit({ type: 'editing' });
    files = applyOperations(files, plan);
    for (let attempt = 0; attempt <= 3; attempt++) {
      if (signal?.aborted) return { status: 'draft' as const, files, manifest: filesManifest(files) };
      await sandbox.writeFiles(handle, files);
      if ([...plan.operations].some((operation) => operation.op === 'create' && operation.path === 'package.json') || attempt === 0) emit({ type: 'installing' });
      emit({ type: 'building' });
      const result = await sandbox.run(handle, 'npm run build', { timeoutMs: 120_000 });
      if (result.exitCode === 0) {
        emit({ type: 'ready' });
        return { status: 'built' as const, files, manifest: filesManifest(files), previewUrl: await sandbox.previewUrl(handle) };
      }
      if (attempt === 3) {
        emit({ type: 'failed', message: result.stderr.slice(0, 4000) });
        return { status: 'failed' as const, files, manifest: filesManifest(files), error: result.stderr.slice(0, 4000) };
      }
      emit({ type: 'fixing', attempt: attempt + 1 });
      const fix = operationPlanSchema.parse(await agent.complete('fix', files, result.stderr.slice(0, 4000)));
      files = applyOperations(files, fix);
    }
    throw new Error('generation_loop_unreachable');
  } finally {
    await sandbox.destroy(handle);
  }
}
