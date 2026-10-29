export type SandboxHandle = { id: string; projectId: string };
export type SandboxRunResult = { exitCode: number; stdout: string; stderr: string };

export interface SandboxProvider {
  create(projectId: string): Promise<SandboxHandle>;
  writeFiles(handle: SandboxHandle, files: Map<string, string>): Promise<void>;
  run(handle: SandboxHandle, command: string, options: { timeoutMs: number }): Promise<SandboxRunResult>;
  previewUrl(handle: SandboxHandle): Promise<string>;
  destroy(handle: SandboxHandle): Promise<void>;
}
