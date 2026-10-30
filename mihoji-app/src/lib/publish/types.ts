export type PublishRequest = { projectId: string; versionId: string; files: Record<string, string>; siteName: string };
export type PublishResult = { url: string };

export interface PublishProvider {
  publish(request: PublishRequest): Promise<PublishResult>;
}
