export const aiModels = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'] as const;
export type AiModel = (typeof aiModels)[number];
