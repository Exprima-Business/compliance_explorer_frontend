import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

export interface AssistantAnswer {
  answer: string;
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
};
