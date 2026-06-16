import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

export interface AssistantAnswer {
  answer: string;
}

export interface IntakeTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface IntakeResult {
  reply: string;
  recommendedBundleId: string | null;
}

/**
 * Grounded compliance assistant — read-only Q&A over the active program's scope.
 * The backend answers strictly from the org's curated obligations/frameworks and
 * never changes compliance status.
 */
export const assistantService = {
  ask: async (programId: string, question: string): Promise<ApiResponse<AssistantAnswer>> =>
    apiCall<AssistantAnswer>('/api/assistant/ask', {
      method: 'POST',
      body: JSON.stringify({ programId, question }),
      requireAuth: true,
    }),

  /** Conversational scope setup — returns the next reply + an optional bundle recommendation. */
  intake: async (messages: IntakeTurn[]): Promise<ApiResponse<IntakeResult>> =>
    apiCall<IntakeResult>('/api/assistant/intake', {
      method: 'POST',
      body: JSON.stringify({ messages }),
      requireAuth: true,
    }),
};
