// src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// Infrastructure
import { PineconeVectorRepository } from './infrastructure/pinecone/PineconeVectorRepository';
import { MistralEmbeddingService } from './infrastructure/mistral/MistralEmbeddingService';
import { MistralLLMService } from './infrastructure/mistral/MistralLLMService';
import { PDFDocumentProcessor } from './infrastructure/pdf/PDFDocumentProcessor';

// Use Cases
import { UploadDocumentUseCase } from './application/usecases/UploadDocumentUseCase';
import { AskQuestionUseCase } from './application/usecases/AskQuestionUseCase';

// API
import { DocumentController } from './api/controllers/DocumentController';
import { ConversationController } from './api/controllers/ConversationController';
import { createRoutes } from './api/routes';

// ============================================================
// Validate Environment Variables
// ============================================================
const requiredEnvVars = ['PINECONE_API_KEY', 'PINECONE_INDEX_NAME', 'MISTRAL_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const PORT              = parseInt(process.env.PORT ?? '3000', 10);
const PINECONE_API_KEY  = process.env.PINECONE_API_KEY!;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME!;
const MISTRAL_API_KEY   = process.env.MISTRAL_API_KEY!;

// ============================================================
// Dependency Injection / Composition Root
// ============================================================
console.log('🔧 Initializing services...');

const embeddingService  = new MistralEmbeddingService(MISTRAL_API_KEY);
const llmService        = new MistralLLMService(MISTRAL_API_KEY);
const documentProcessor = new PDFDocumentProcessor();
const vectorRepository  = new PineconeVectorRepository(
  PINECONE_API_KEY, PINECONE_INDEX_NAME, embeddingService
);

const uploadDocumentUseCase = new UploadDocumentUseCase(
  documentProcessor, embeddingService, vectorRepository
);
const askQuestionUseCase    = new AskQuestionUseCase(vectorRepository, llmService);
const documentController    = new DocumentController(uploadDocumentUseCase);
const conversationController = new ConversationController(askQuestionUseCase);

// ============================================================
// Express App Setup
// ============================================================
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Frontend static path ──────────────────────────────────────
// __dirname is backend/dist/ (compiled output).
// We try multiple candidate paths so it works both locally and on Railway
// regardless of where Nixpacks sets the WORKDIR.
const frontendCandidates = [
  process.env.FRONTEND_PATH,                        // explicit override
  path.resolve(__dirname, '../../frontend'),         // local: repo root/frontend
  path.resolve(__dirname, '../../../frontend'),      // Railway WORKDIR one level up
  path.resolve(process.cwd(), 'frontend'),           // Railway cwd-relative
  path.resolve(process.cwd(), '../frontend'),        // fallback
].filter(Boolean) as string[];

const frontendPath = frontendCandidates.find(p => fs.existsSync(path.join(p, 'index.html')));

if (frontendPath) {
  console.log(`📁 Serving frontend from: ${frontendPath}`);
  app.use(express.static(frontendPath));
} else {
  console.warn('⚠️  Frontend not found. Tried:', frontendCandidates);
}

// ── API Routes ────────────────────────────────────────────────
const apiRoutes = createRoutes(documentController, conversationController);
app.use('/api', apiRoutes);

// ── SPA catch-all ─────────────────────────────────────────────
app.get('*', (_req, res) => {
  if (frontendPath) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.json({ status: 'RAG API running', endpoints: ['/api/health', '/api/documents/upload', '/api/chat/ask'] });
  }
});

// ============================================================
// Start Server
// ============================================================
async function bootstrap() {
  try {
    console.log('🔍 Verifying Pinecone index...');
    const indexExists = await vectorRepository.indexExists();
    if (!indexExists) {
      console.warn(`⚠️  Pinecone index "${PINECONE_INDEX_NAME}" not found. Dimension must be 1024.`);
    } else {
      console.log(`✅ Pinecone index "${PINECONE_INDEX_NAME}" found`);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 RAG Assistant running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`\n📋 Endpoints:`);
      console.log(`   GET  /api/health`);
      console.log(`   POST /api/documents/upload`);
      console.log(`   POST /api/chat/ask`);
    });
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
