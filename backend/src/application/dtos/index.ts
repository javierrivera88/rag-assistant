// src/application/dtos/index.ts

export interface UploadDocumentDTO {
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
}

export interface UploadDocumentResponseDTO {
  documentId: string;
  documentName: string;
  chunksProcessed: number;
  message: string;
}

export interface AskQuestionDTO {
  question: string;
  conversationId?: string;
  topK?: number;
}

export interface AskQuestionResponseDTO {
  answer: string;
  conversationId: string;
  sources: SourceDTO[];
  processingTime: number;
}

export interface SourceDTO {
  documentName: string;
  excerpt: string;
  relevanceScore: number;
}
