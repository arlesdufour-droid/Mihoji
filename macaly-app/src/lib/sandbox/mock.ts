import type { SandboxHandle, SandboxProvider, SandboxRunResult } from './index';

const projects = new Map<string, Map<string, string>>();

export class MockSandboxProvider implements SandboxProvider {
  async create(projectId: string) {
    const handle = { id: `mock-${projectId}`, projectId };
    projects.set(handle.id, new Map());
    return handle;
  }

  async writeFiles(handle: SandboxHandle, files: Map<string, string>) {
    projects.set(handle.id, new Map(files));
  }

  async run(handle: SandboxHandle, command: string, options: { timeoutMs: number }): Promise<SandboxRunResult> {
    if (options.timeoutMs <= 0) return { exitCode: 124, stdout: '', stderr: 'Command timed out.' };
    const files = projects.get(handle.id);
    if (!files) return { exitCode: 1, stdout: '', stderr: 'Sandbox not found.' };
    if ([...files.values()].some((content) => content.includes('// MIHOJI_FORCE_BUILD_ERROR')) && command.includes('build')) {
      return { exitCode: 1, stdout: '', stderr: 'Build failed: forced Mihoji test error.' };
    }
    return { exitCode: 0, stdout: command.includes('build') ? 'Build successful.' : 'Dependencies installed.', stderr: '' };
  }

  async previewUrl(handle: SandboxHandle) {
    return `https://preview.local/${encodeURIComponent(handle.projectId)}`;
  }

  async destroy(handle: SandboxHandle) {
    projects.delete(handle.id);
  }
}
