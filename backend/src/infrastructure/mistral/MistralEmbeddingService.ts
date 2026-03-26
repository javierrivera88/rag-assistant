// src/infrastructure/mistral/MistralEmbeddingService.ts
//
// Uses the Mistral REST API directly for embeddings to avoid any LangChain
// routing issues. Model: mistral-embed (output dim: 1024).
//
import { IEmbeddingService } from '../../domain/services/IServices';

const MISTRAL_EMBED_URL = 'https://api.mistral.ai/v1/embeddings';
const EMBED_MODEL = 'mistral-embed';

interface EmbedResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage?: { prompt_tokens: number; total_tokens: number };
}

export class MistralEmbeddingService implements IEmbeddingService {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async callEmbedAPI(inputs: string[]): Promise<number[][]> {
    const response = await fetch(MISTRAL_EMBED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: inputs,
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mistral Embeddings API error — HTTP ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as EmbedResponse;

    // Sort by index to guarantee order matches input order
    const sorted = [...data.data].sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    const batchSize = 32;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(texts.length / batchSize);
      console.log(`[MistralEmbed] Embedding batch ${batchNum}/${totalBatches} (${batch.length} chunks)`);

      const batchEmbeddings = await this.callEmbedAPI(batch);
      allEmbeddings.push(...batchEmbeddings);

      // Respect rate limits between batches
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    return allEmbeddings;
  }

  async embedQuery(query: string): Promise<number[]> {
    const results = await this.callEmbedAPI([query]);
    return results[0];
  }
}
