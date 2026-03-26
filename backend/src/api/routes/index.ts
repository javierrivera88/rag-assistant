// src/api/routes/index.ts
import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/DocumentController';
import { ConversationController } from '../controllers/ConversationController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

export function createRoutes(
  documentController: DocumentController,
  conversationController: ConversationController
): Router {
  const router = Router();

  // Health check
  router.get('/health', (req, res) => conversationController.healthCheck(req, res));

  // Document routes
  router.post(
    '/documents/upload',
    upload.single('pdf'),
    (req, res) => documentController.uploadDocument(req, res)
  );

  // Conversation routes
  router.post('/chat/ask', (req, res) => conversationController.askQuestion(req, res));

  return router;
}
