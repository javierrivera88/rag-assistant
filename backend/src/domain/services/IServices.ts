// src/domain/services/IEmbeddingService.ts
export interface IEmbeddingService {
  embedTexts(texts: string[]): Promise<number[][]>;
  embedQuery(query: string): Promise<number[]>;
}

// src/domain/services/ILLMService.ts
import { RetrievedSource } from '../entities/Conversation';

export interface GenerateAnswerParams {
  question: string;
  context: RetrievedSource[];
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ILLMService {
  generateAnswer(params: GenerateAnswerParams): Promise<string>;
}

// src/domain/services/IDocumentProcessor.ts
import { Document, DocumentChunk } from '../entities/Document';

export interface IDocumentProcessor {
  extractText(fileBuffer: Buffer, fileName: string): Promise<string>;
  splitIntoChunks(document: Document, chunkSize?: number, overlap?: number): DocumentChunk[];
}
