export type SandboxHandle = { id: string; projectId: string };
export type SandboxRunResult = { exitCode: number; stdout: string; stderr: string };

export interface SandboxProvider {
  create(projectId: string): Promise<SandboxHandle>;
  writeFiles(handle: SandboxHandle, files: Map<string, string>): Promise<void>;
  run(handle: SandboxHandle, command: string, options: { timeoutMs: number }): Promise<SandboxRunResult>;
  previewUrl(handle: SandboxHandle): Promise<string>;
  destroy(handle: SandboxHandle): Promise<void>;
}

export async function getSandboxProvider(): Promise<SandboxProvider> {
  if (process.env.E2B_API_KEY) {
    const { E2BSandboxProvider } = await import('./e2b');
    return new E2BSandboxProvider();
  }
  if (process.env.NODE_ENV === 'production') throw new Error('e2b_not_configured');
  const { MockSandboxProvider } = await import('./mock');
  return new MockSandboxProvider();
}
