export type EmbeddingResult = {
  vectors: number[][];
  inputTokens: number;
  model: string;
};

export type EmbedOptions = {
  signal?: AbortSignal;
};

export interface EmbeddingProvider {
  embed(texts: string[], options?: EmbedOptions): Promise<EmbeddingResult>;
}
