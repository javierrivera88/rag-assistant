// src/application/usecases/UploadDocumentUseCase.ts
import { Document } from '../../domain/entities/Document';
import { IVectorRepository } from '../../domain/repositories/IVectorRepository';
import { IEmbeddingService, IDocumentProcessor } from '../../domain/services/IServices';
import { UploadDocumentDTO, UploadDocumentResponseDTO } from '../dtos';

export class UploadDocumentUseCase {
  constructor(
    private readonly documentProcessor: IDocumentProcessor,
    private readonly embeddingService: IEmbeddingService,
    private readonly vectorRepository: IVectorRepository
  ) {}

  async execute(dto: UploadDocumentDTO): Promise<UploadDocumentResponseDTO> {
    // Step 1: Extract text from PDF
    console.log(`[UploadDocument] Extracting text from: ${dto.fileName}`);
    const textContent = await this.documentProcessor.extractText(dto.fileBuffer, dto.fileName);

    if (!textContent || textContent.trim().length === 0) {
      throw new Error('Could not extract text from the provided document');
    }

    // Step 2: Create domain entity
    const document = new Document({
      name: dto.fileName,
      content: textContent,
    });

    // Step 3: Split into chunks
    console.log(`[UploadDocument] Splitting document into chunks...`);
    const chunks = this.documentProcessor.splitIntoChunks(document, 1000, 200);
    const documentWithChunks = document.withChunks(chunks);

    console.log(`[UploadDocument] Created ${chunks.length} chunks`);

    // Step 4: Generate embeddings for all chunks
    console.log(`[UploadDocument] Generating embeddings...`);
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await this.embeddingService.embedTexts(chunkTexts);

    // Step 5: Store in vector database
    console.log(`[UploadDocument] Storing in Pinecone...`);
    await this.vectorRepository.upsertChunks(documentWithChunks.chunks, embeddings);

    console.log(`[UploadDocument] Successfully processed: ${dto.fileName}`);

    return {
      documentId: document.id,
      documentName: dto.fileName,
      chunksProcessed: chunks.length,
      message: `Document "${dto.fileName}" processed successfully with ${chunks.length} chunks stored in the vector database.`,
    };
  }
}
