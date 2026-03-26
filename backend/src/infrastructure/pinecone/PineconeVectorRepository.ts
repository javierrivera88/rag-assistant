// src/infrastructure/pinecone/PineconeVectorRepository.ts
import { Pinecone, Index } from '@pinecone-database/pinecone';
import { DocumentChunk } from '../../domain/entities/Document';
import { RetrievedSource } from '../../domain/entities/Conversation';
import { IVectorRepository } from '../../domain/repositories/IVectorRepository';
import { IEmbeddingService } from '../../domain/services/IServices';

export class PineconeVectorRepository implements IVectorRepository {
  private client: Pinecone;
  private indexName: string;
  private embeddingService: IEmbeddingService;
  private _index: Index | null = null;

  constructor(apiKey: string, indexName: string, embeddingService: IEmbeddingService) {
    this.client = new Pinecone({ apiKey });
    this.indexName = indexName;
    this.embeddingService = embeddingService;
  }

  private async getIndex(): Promise<Index> {
    if (!this._index) {
      this._index = this.client.Index(this.indexName);
    }
    return this._index;
  }

  async indexExists(): Promise<boolean> {
    try {
      const indexes = await this.client.listIndexes();
      return indexes.indexes?.some((idx) => idx.name === this.indexName) ?? false;
    } catch (error) {
      console.error('[Pinecone] Error checking index:', error);
      return false;
    }
  }

  async upsertChunks(chunks: DocumentChunk[], embeddings: number[][]): Promise<void> {
    const index = await this.getIndex();

    // Batch upserts to avoid rate limits
    const batchSize = 100;
    const vectors = chunks.map((chunk, i) => ({
      id: chunk.id,
      values: embeddings[i],
      metadata: {
        documentId: chunk.documentId,
        documentName: chunk.metadata.documentName,
        content: chunk.content,
        chunkIndex: chunk.metadata.chunkIndex,
        totalChunks: chunk.metadata.totalChunks,
        uploadedAt: chunk.metadata.uploadedAt,
      },
    }));

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
      console.log(`[Pinecone] Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
    }
  }

  async similaritySearch(query: string, topK: number = 5): Promise<RetrievedSource[]> {
    const index = await this.getIndex();

    // Embed the query
    const queryEmbedding = await this.embeddingService.embedQuery(query);

    // Query Pinecone
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    if (!queryResponse.matches) return [];

    return queryResponse.matches
      .filter((match) => match.metadata)
      .map((match) => ({
        documentName: (match.metadata!.documentName as string) ?? 'Unknown',
        content: (match.metadata!.content as string) ?? '',
        score: match.score ?? 0,
      }));
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    const index = await this.getIndex();
    // Pinecone requires fetching IDs to delete by metadata filter
    // This is a simplified implementation
    console.log(`[Pinecone] Deleting vectors for document: ${documentId}`);
    await index.deleteMany({ documentId });
  }
}
