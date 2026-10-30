import 'server-only';

import type { SandboxHandle, SandboxProvider, SandboxRunResult } from './index';

export class E2BSandboxProvider implements SandboxProvider {
  constructor(private readonly apiKey = process.env.E2B_API_KEY) {
    if (!apiKey) throw new Error('e2b_not_configured');
  }

  private blocked(): never {
    throw new Error('e2b_integration_blocked: install the approved E2B SDK and configure an account');
  }

  async create(projectId: string): Promise<SandboxHandle> {
    void projectId;
    return this.blocked();
  }

  async writeFiles(handle: SandboxHandle, files: Map<string, string>) {
    void handle;
    void files;
    return this.blocked();
  }

  async run(handle: SandboxHandle, command: string, options: { timeoutMs: number }): Promise<SandboxRunResult> {
    void handle;
    void command;
    void options;
    return this.blocked();
  }

  async previewUrl(handle: SandboxHandle): Promise<string> {
    void handle;
    return this.blocked();
  }

  async destroy(handle: SandboxHandle) {
    void handle;
    return this.blocked();
  }
}
