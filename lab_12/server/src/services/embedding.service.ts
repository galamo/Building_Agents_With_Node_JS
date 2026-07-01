export interface EmbeddingService {
  embedText(text: string): Promise<number[]>;
}
