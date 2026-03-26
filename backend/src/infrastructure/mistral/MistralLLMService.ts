// src/infrastructure/mistral/MistralLLMService.ts
//
// Uses the Mistral REST API directly to avoid LangChain routing the request
// to the FIM (Fill-in-the-Middle) endpoint, which is not enabled for chat models.
//
import { ILLMService, GenerateAnswerParams } from '../../domain/services/IServices';
import { RetrievedSource } from '../../domain/entities/Conversation';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const MODEL = 'mistral-medium-latest';

type MistralRole = 'system' | 'user' | 'assistant';

interface MistralMessage {
  role: MistralRole;
  content: string;
}

interface MistralResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export class MistralLLMService implements ILLMService {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private buildSystemPrompt(context: RetrievedSource[]): string {
    if (context.length === 0) {
      return [
        'You are a helpful AI assistant.',
        'Answer questions based on your general knowledge.',
        'Be honest when you lack specific information.',
        'Respond in the same language the user uses.',
      ].join('\n');
    }

    const contextText = context
      .map((src, i) => `[Source ${i + 1} — ${src.documentName}]:\n${src.content}`)
      .join('\n\n---\n\n');

    return [
      'You are an expert AI assistant that answers questions using the document context below.',
      '',
      'CONTEXT FROM DOCUMENTS:',
      contextText,
      '',
      'INSTRUCTIONS:',
      '- Answer ONLY based on the provided context.',
      '- If the context lacks enough information, say so clearly.',
      '- Cite which document/source your answer comes from.',
      '- Be precise, clear, and helpful.',
      '- Respond in the same language the user uses.',
      '- If asked something outside the context, acknowledge it honestly.',
    ].join('\n');
  }

  async generateAnswer(params: GenerateAnswerParams): Promise<string> {
    const messages: MistralMessage[] = [
      { role: 'system', content: this.buildSystemPrompt(params.context) },
    ];

    // Add prior conversation turns (role mapping: user → user, assistant → assistant)
    if (params.conversationHistory && params.conversationHistory.length > 0) {
      for (const msg of params.conversationHistory) {
        const role: MistralRole = msg.role === 'user' ? 'user' : 'assistant';
        messages.push({ role, content: msg.content });
      }
    }

    // Current question
    messages.push({ role: 'user', content: params.question });

    console.log(`[MistralLLM] Calling ${MODEL} with ${messages.length} messages…`);

    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Mistral API error — HTTP ${response.status}: ${errorBody}`
      );
    }

    const data = (await response.json()) as MistralResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Mistral returned an empty response');
    }

    if (data.usage) {
      console.log(
        `[MistralLLM] Tokens — prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens}`
      );
    }

    return content;
  }
}
