import { apiCall } from './api';
import type { ApiResponse } from '../types/clause';

export interface Bookmark {
  id: string;
  organizationId: string;
  projectId?: string;
  clauseId: string;
  status?: string;
  priority?: string;
  notes?: string;
  complianceStatus?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const bookmarkService = {
  getBookmarks: async (orgId: string): Promise<Bookmark[]> => {
    const resp = await apiCall<any>('/api/bookmarks', {
      headers: {
        'x-org-id': orgId
      }
    });

    if (resp.error) {
      throw new Error(resp.error);
    }

    // The backend often wraps the actual bookmarks array inside a `data` property.
    // `apiCall` will only unwrap this automatically if the payload ALSO contains an
    // `error` key, which our endpoint omits. Therefore we defensively handle both
    // shapes here.
    const payload = resp.data;

    // Case 1: payload is already an array of bookmarks
    if (Array.isArray(payload)) {
      return payload;
    }

    // Case 2: payload is an object that contains the array in its own `data` prop
    if (payload && Array.isArray(payload.data)) {
      return payload.data as Bookmark[];
    }

    // Anything else – return an empty list so the UI degrades gracefully
    console.warn('Unexpected bookmarks response shape', payload);
    return [];
  }
}; 