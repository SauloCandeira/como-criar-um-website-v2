export type ModelPricing = {
  input: number;
  output: number;
};

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4o": { input: 0.000005, output: 0.000015 },
  "gpt-4o-mini": { input: 0.0000005, output: 0.0000015 },
  "gpt-4.1-mini": { input: 0.0000005, output: 0.0000015 },
  "text-embedding-3-small": { input: 0.0000001, output: 0 }
};

export const calculateCostUsd = (params: {
  model: string;
  promptTokens: number;
  completionTokens: number;
}) => {
  const pricing = MODEL_PRICING[params.model];
  if (!pricing) return 0;
  return (params.promptTokens * pricing.input) + (params.completionTokens * pricing.output);
};
