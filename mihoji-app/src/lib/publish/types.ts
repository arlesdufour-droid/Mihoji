export type PublishRequest = { projectId: string; versionId: string; files: Record<string, string>; siteName: string;
  // Origine de l'application qui sert les polices auto-hébergées des sites au nouveau format (autorisée dans font-src).
  assetOrigin?: string };
export type PublishResult = { url: string };

export interface PublishProvider {
  publish(request: PublishRequest): Promise<PublishResult>;
}
