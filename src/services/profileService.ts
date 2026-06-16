import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

/** The caller's own profile — display name + email. */
export interface UserProfile {
  fullName: string | null;
  email: string | null;
}

/**
 * Self-profile wrapper. The display name is stored on Supabase auth
 * user_metadata.full_name (server-side); the org-members picker reads it, so
 * setting it here makes the user show as a name instead of an email.
 */
export const profileService = {
  get: async (): Promise<ApiResponse<UserProfile>> =>
    apiCall<UserProfile>('/api/auth/profile', { requireAuth: true }),

  update: async (fullName: string): Promise<ApiResponse<UserProfile>> =>
    apiCall<UserProfile>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ fullName }),
      requireAuth: true,
    }),
};
