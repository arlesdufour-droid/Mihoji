import 'server-only';

import { Sandbox } from '@e2b/code-interpreter';
import type { SandboxHandle, SandboxProvider, SandboxRunResult } from './index';

export class E2BSandboxProvider implements SandboxProvider {
  private readonly sandboxes = new Map<string, Sandbox>();

  constructor(private readonly apiKey = process.env.E2B_API_KEY) {
    if (!apiKey) throw new Error('e2b_not_configured');
  }

  async create(projectId: string): Promise<SandboxHandle> {
    const sandbox = await Sandbox.create({ apiKey: this.apiKey, timeoutMs: 15 * 60 * 1000, allowInternetAccess: true, envs: {} });
    const handle = { id: sandbox.sandboxId, projectId };
    this.sandboxes.set(handle.id, sandbox);
    return handle;
  }

  async writeFiles(handle: SandboxHandle, files: Map<string, string>) {
    const sandbox = this.requireSandbox(handle);
    await sandbox.files.write([...files.entries()].map(([path, data]) => ({ path: `/home/user/${path}`, data })));
  }

  async run(handle: SandboxHandle, command: string, options: { timeoutMs: number }): Promise<SandboxRunResult> {
    const sandbox = this.requireSandbox(handle);
    const timeoutMs = Math.min(Math.max(options.timeoutMs, 1), 120_000);
    const result = await sandbox.commands.run(command, { cwd: '/home/user', timeoutMs });
    return { exitCode: result.exitCode ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  }

  async previewUrl(handle: SandboxHandle): Promise<string> {
    return this.requireSandbox(handle).getHost(3000);
  }

  async destroy(handle: SandboxHandle) {
    const sandbox = this.requireSandbox(handle);
    this.sandboxes.delete(handle.id);
    await sandbox.kill();
  }

  private requireSandbox(handle: SandboxHandle) {
    const sandbox = this.sandboxes.get(handle.id);
    if (!sandbox) throw new Error('e2b_sandbox_not_found');
    return sandbox;
  }
}
