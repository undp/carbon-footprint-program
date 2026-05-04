/**
 * Single source of truth for token estimation in the chatbot feature.
 * Uses the conventional 4-chars-per-token heuristic. The ESLint rule
 * `chatbot/single-source-estimate-tokens` enforces that no other file
 * inlines this formula.
 */
export const estimateTokens = (text: string): number =>
  Math.ceil(text.length / 4);
