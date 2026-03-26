// src/domain/entities/Document.ts
import { v4 as uuidv4 } from 'uuid';

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  documentName: string;
  pageNumber?: number;
  chunkIndex: number;
  totalChunks: number;
  uploadedAt: string;
}

export class Document {
  public readonly id: string;
  public readonly name: string;
  public readonly content: string;
  public readonly uploadedAt: Date;
  public readonly chunks: DocumentChunk[];

  constructor(params: {
    name: string;
    content: string;
    chunks?: DocumentChunk[];
    id?: string;
    uploadedAt?: Date;
  }) {
    this.id = params.id ?? uuidv4();
    this.name = params.name;
    this.content = params.content;
    this.uploadedAt = params.uploadedAt ?? new Date();
    this.chunks = params.chunks ?? [];
  }

  public withChunks(chunks: DocumentChunk[]): Document {
    return new Document({
      id: this.id,
      name: this.name,
      content: this.content,
      uploadedAt: this.uploadedAt,
      chunks,
    });
  }
}
