// src/application/usecases/AskQuestionUseCase.ts
import { Conversation } from '../../domain/entities/Conversation';
import { IVectorRepository } from '../../domain/repositories/IVectorRepository';
import { ILLMService } from '../../domain/services/IServices';
import { AskQuestionDTO, AskQuestionResponseDTO } from '../dtos';

// In-memory conversation store (can be replaced with a proper repository)
const conversationStore = new Map<string, Conversation>();

export class AskQuestionUseCase {
  constructor(
    private readonly vectorRepository: IVectorRepository,
    private readonly llmService: ILLMService
  ) {}

  async execute(dto: AskQuestionDTO): Promise<AskQuestionResponseDTO> {
    const startTime = Date.now();

    // Step 1: Get or create conversation
    let conversation = dto.conversationId
      ? conversationStore.get(dto.conversationId) ?? new Conversation()
      : new Conversation();

    // Step 2: Add user message
    conversation = conversation.addMessage('user', dto.question);

    // Step 3: Retrieve relevant context from Pinecone
    console.log(`[AskQuestion] Searching for relevant context...`);
    const retrievedSources = await this.vectorRepository.similaritySearch(
      dto.question,
      dto.topK ?? 5
    );

    console.log(`[AskQuestion] Found ${retrievedSources.length} relevant chunks`);

    // Step 4: Build conversation history for context
    const conversationHistory = conversation
      .getLastMessages(6)
      .slice(0, -1) // Exclude the current user message
      .map((m) => ({ role: m.role, content: m.content }));

    // Step 5: Generate answer with LLM
    console.log(`[AskQuestion] Generating answer with Mistral...`);
    const answer = await this.llmService.generateAnswer({
      question: dto.question,
      context: retrievedSources,
      conversationHistory,
    });

    // Step 6: Update conversation with assistant response
    conversation = conversation.addMessage('assistant', answer, retrievedSources);

    // Step 7: Persist conversation
    conversationStore.set(conversation.id, conversation);

    const processingTime = Date.now() - startTime;

    return {
      answer,
      conversationId: conversation.id,
      sources: retrievedSources.map((s) => ({
        documentName: s.documentName,
        excerpt: s.content.substring(0, 200) + (s.content.length > 200 ? '...' : ''),
        relevanceScore: Math.round(s.score * 100) / 100,
      })),
      processingTime,
    };
  }
}
