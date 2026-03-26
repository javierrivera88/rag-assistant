// src/api/controllers/ConversationController.ts
import { Request, Response } from 'express';
import { AskQuestionUseCase } from '../../application/usecases/AskQuestionUseCase';

export class ConversationController {
  constructor(private readonly askQuestionUseCase: AskQuestionUseCase) {}

  async askQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { question, conversationId, topK } = req.body;

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        res.status(400).json({ error: 'Question is required and must be a non-empty string.' });
        return;
      }

      if (question.length > 2000) {
        res.status(400).json({ error: 'Question must be less than 2000 characters.' });
        return;
      }

      const result = await this.askQuestionUseCase.execute({
        question: question.trim(),
        conversationId,
        topK: topK ?? 5,
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('[ConversationController] Error:', error);
      res.status(500).json({
        error: 'Failed to generate answer',
        message: (error as Error).message,
      });
    }
  }

  async healthCheck(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }
}
