// src/domain/entities/Conversation.ts
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: RetrievedSource[];
}

export interface RetrievedSource {
  documentName: string;
  content: string;
  score: number;
}

export class Conversation {
  public readonly id: string;
  public readonly messages: Message[];
  public readonly createdAt: Date;

  constructor(params?: { id?: string; messages?: Message[]; createdAt?: Date }) {
    this.id = params?.id ?? uuidv4();
    this.messages = params?.messages ?? [];
    this.createdAt = params?.createdAt ?? new Date();
  }

  public addMessage(role: 'user' | 'assistant', content: string, sources?: RetrievedSource[]): Conversation {
    const message: Message = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
      sources,
    };
    return new Conversation({
      id: this.id,
      messages: [...this.messages, message],
      createdAt: this.createdAt,
    });
  }

  public getLastMessages(n: number): Message[] {
    return this.messages.slice(-n);
  }
}
