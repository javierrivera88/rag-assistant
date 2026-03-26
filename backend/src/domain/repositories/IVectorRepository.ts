// src/domain/repositories/IVectorRepository.ts
import { DocumentChunk, ChunkMetadata } from '../entities/Document';
import { RetrievedSource } from '../entities/Conversation';

export interface VectorDocument {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface IVectorRepository {
  upsertChunks(chunks: DocumentChunk[], embeddings: number[][]): Promise<void>;
  similaritySearch(query: string, topK?: number): Promise<RetrievedSource[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
  indexExists(): Promise<boolean>;
}
