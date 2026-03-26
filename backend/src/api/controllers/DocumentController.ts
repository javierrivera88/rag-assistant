// src/api/controllers/DocumentController.ts
import { Request, Response } from 'express';
import { UploadDocumentUseCase } from '../../application/usecases/UploadDocumentUseCase';

export class DocumentController {
  constructor(private readonly uploadDocumentUseCase: UploadDocumentUseCase) {}

  async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded. Please provide a PDF file.' });
        return;
      }

      const { originalname, buffer, mimetype } = req.file;

      if (mimetype !== 'application/pdf') {
        res.status(400).json({ error: 'Only PDF files are supported.' });
        return;
      }

      const result = await this.uploadDocumentUseCase.execute({
        fileName: originalname,
        fileBuffer: buffer,
        mimeType: mimetype,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('[DocumentController] Error:', error);
      res.status(500).json({
        error: 'Failed to process document',
        message: (error as Error).message,
      });
    }
  }
}
