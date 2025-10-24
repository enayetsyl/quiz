import { env } from "@/config";

const safeTokens = (value: number | undefined | null): number => {
  if (!value || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, value);
};

export const estimateLlmCostUsd = (
  tokensIn: number | undefined,
  tokensOut: number | undefined,
): number => {
  const normalizedIn = safeTokens(tokensIn);
  const normalizedOut = safeTokens(tokensOut);

  const inputCost = (normalizedIn / 1000) * env.LLM_INPUT_COST_PER_1K_USD;
  const outputCost = (normalizedOut / 1000) * env.LLM_OUTPUT_COST_PER_1K_USD;
  const total = inputCost + outputCost;

  return Number(total.toFixed(5));
};
