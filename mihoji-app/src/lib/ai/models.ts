export const defaultGroqModel = 'qwen/qwen3.8-27b';
export const aiModels = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'] as const;
export type AiModel = (typeof aiModels)[number];
