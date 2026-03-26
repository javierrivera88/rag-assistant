// src/infrastructure/pdf/PDFDocumentProcessor.ts
import pdf from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';
import { Document, DocumentChunk } from '../../domain/entities/Document';
import { IDocumentProcessor } from '../../domain/services/IServices';

export class PDFDocumentProcessor implements IDocumentProcessor {
  async extractText(fileBuffer: Buffer, fileName: string): Promise<string> {
    try {
      console.log(`[PDFProcessor] Parsing PDF: ${fileName} (${Math.round(fileBuffer.length / 1024)}KB)`);
      const data = await pdf(fileBuffer);

      const text = data.text
        .replace(/\n{3,}/g, '\n\n')   // Normalize multiple newlines
        .replace(/\s+/g, ' ')          // Normalize whitespace
        .trim();

      console.log(`[PDFProcessor] Extracted ${text.length} characters from ${data.numpages} pages`);
      return text;
    } catch (error) {
      throw new Error(`Failed to parse PDF "${fileName}": ${(error as Error).message}`);
    }
  }

  splitIntoChunks(
    document: Document,
    chunkSize: number = 1000,
    overlap: number = 200
  ): DocumentChunk[] {
    const text = document.content;
    const chunks: DocumentChunk[] = [];

    // Split by sentences/paragraphs first, then by size
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;

      if (potentialChunk.length <= chunkSize) {
        currentChunk = potentialChunk;
      } else {
        // Save current chunk if it has content
        if (currentChunk.trim().length > 0) {
          chunks.push(this.createChunk(currentChunk.trim(), document, chunkIndex++));
        }

        // If the paragraph itself is too large, split it by sentences
        if (paragraph.length > chunkSize) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) ?? [paragraph];
          currentChunk = '';

          for (const sentence of sentences) {
            const potentialSentenceChunk = currentChunk
              ? `${currentChunk} ${sentence}`
              : sentence;

            if (potentialSentenceChunk.length <= chunkSize) {
              currentChunk = potentialSentenceChunk;
            } else {
              if (currentChunk.trim().length > 0) {
                chunks.push(this.createChunk(currentChunk.trim(), document, chunkIndex++));
              }
              // Handle overlap: take the end of the last chunk
              const overlapText = currentChunk.slice(-overlap);
              currentChunk = overlapText ? `${overlapText} ${sentence}` : sentence;
            }
          }
        } else {
          // Start new chunk with overlap from previous
          const overlapText = currentChunk.slice(-overlap);
          currentChunk = overlapText ? `${overlapText}\n\n${paragraph}` : paragraph;
        }
      }
    }

    // Add the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(currentChunk.trim(), document, chunkIndex++));
    }

    // Update total chunks count
    return chunks.map((chunk) => ({
      ...chunk,
      metadata: { ...chunk.metadata, totalChunks: chunks.length },
    }));
  }

  private createChunk(content: string, document: Document, index: number): DocumentChunk {
    return {
      id: uuidv4(),
      documentId: document.id,
      content,
      metadata: {
        documentName: document.name,
        chunkIndex: index,
        totalChunks: 0, // Will be updated after all chunks are created
        uploadedAt: document.uploadedAt.toISOString(),
      },
    };
  }
}
