# RAG Assistant — Mistral + Pinecone + LangChain

Asistente virtual con RAG (Retrieval Augmented Generation) usando arquitectura DDD.

## Stack

| Capa | Tecnología |
|---|---|
| LLM | Mistral Medium (`mistral-medium-latest`) |
| Embeddings | Mistral Embed (`mistral-embed`) |
| Vector Store | Pinecone |
| Backend | TypeScript + Express + LangChain |
| PDF | pdf-parse |
| Frontend | HTML/CSS/JS vanilla |

---

## Requisito previo: Crear el índice en Pinecone

Antes de correr el proyecto, crea el índice en tu dashboard de Pinecone:

- **Nombre**: `rag-con-mistral`
- **Dimensión**: `1024` (dimensión del modelo `mistral-embed`)
- **Métrica**: `cosine`
- **Cloud**: Serverless (AWS us-east-1 recomendado)

---

## Variables de entorno

```env
PINECONE_API_KEY=pcsk_7L3kk_...
PINECONE_INDEX_NAME=rag-con-mistral
MISTRAL_API_KEY=7VWheAXtZLrqI...
PORT=3000
```

---

## Desarrollo local

```bash
# 1. Instalar dependencias
cd backend
npm install

# 2. Configurar .env
cp .env.example .env  # editar con tus claves

# 3. Compilar y correr
npm run dev
```

Abre http://localhost:3000

---

## Estructura del proyecto

```
rag-assistant/
├── backend/
│   └── src/
│       ├── domain/
│       │   ├── entities/         # Document, Conversation
│       │   ├── repositories/     # IVectorRepository
│       │   └── services/         # IEmbeddingService, ILLMService, IDocumentProcessor
│       ├── application/
│       │   ├── dtos/             # DTOs entrada/salida
│       │   └── usecases/         # UploadDocumentUseCase, AskQuestionUseCase
│       ├── infrastructure/
│       │   ├── pinecone/         # PineconeVectorRepository
│       │   ├── mistral/          # MistralLLMService, MistralEmbeddingService
│       │   └── pdf/              # PDFDocumentProcessor
│       └── api/
│           ├── controllers/      # DocumentController, ConversationController
│           └── routes/           # Express routes
├── frontend/
│   └── index.html                # SPA sin dependencias externas
├── Dockerfile
├── railway.toml
└── package.json
```

---

## API REST

### `GET /api/health`
Estado del servicio.

### `POST /api/documents/upload`
Sube y procesa un PDF.

```
Content-Type: multipart/form-data
Body: { pdf: <archivo.pdf> }
```

Respuesta:
```json
{
  "documentId": "uuid",
  "documentName": "archivo.pdf",
  "chunksProcessed": 42,
  "message": "..."
}
```

### `POST /api/chat/ask`
Hace una pregunta al asistente.

```json
{
  "question": "¿Cuál es el tema principal?",
  "conversationId": "uuid (opcional)",
  "topK": 5
}
```

Respuesta:
```json
{
  "answer": "El tema principal es...",
  "conversationId": "uuid",
  "sources": [
    {
      "documentName": "archivo.pdf",
      "excerpt": "...",
      "relevanceScore": 0.89
    }
  ],
  "processingTime": 1230
}
```

---

## Deploy en Railway

### Opción A — Con Nixpacks (recomendado)

1. Conecta tu repo a Railway
2. Railway detecta automáticamente el `railway.toml`
3. Agrega las variables de entorno en el dashboard
4. Deploy automático

### Opción B — Con Docker

1. En Railway, selecciona "Deploy from Dockerfile"
2. Railway usa el `Dockerfile` en la raíz
3. Agrega las variables de entorno
4. Deploy

---

## Flujo RAG

```
PDF → Extracción de texto → Chunking (1000 chars, 200 overlap)
    → Embeddings (mistral-embed, 1024 dims)
    → Pinecone upsert

Pregunta → Embedding → Búsqueda en Pinecone (cosine similarity)
         → Top-K chunks → Prompt con contexto → Mistral Medium
         → Respuesta con fuentes
```
