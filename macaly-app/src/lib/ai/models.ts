export const aiModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] as const;
export type AiModel = (typeof aiModels)[number];
