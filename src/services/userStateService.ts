import environment from '../config/environment';
import { dlog } from '../utils/debugLog';

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
}

export interface UserStateResponse {
  /** Identity from the BE (cookie/token) — lets the FE rebuild auth state
   *  without a persisted supabase-js session (cookie auth Phase 4b). */
  userId?: string;
  email?: string | null;
  aal?: string;
  needsSetup: boolean;
  organizations: Organization[];
  currentOrganization?: Organization;
  currentProject?: Project;
  permissions: string[];
  role: string;
}

export class UserStateService {
  /**
   * Get complete user state in a single API call
   * This replaces the complex multi-step validation flow
   */
  static async getUserState(): Promise<UserStateResponse> {
    try {
      dlog('UserStateService: Getting user state (cookie auth)');

      // 12-second timeout — prevents infinite spinner when Railway is deploying
      // or unreachable.  AbortController is supported in all modern browsers.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      let response: Response;
      try {
        // Cookie auth (Phase 4b): authenticated by the HttpOnly session cookie
        // (credentials:include); no Bearer. No longer requires a supabase-js
        // session, so this still works once persistSession is disabled.
        response = await fetch(`${environment.api.url}/api/auth/user-state`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        dlog('UserStateService: API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });

        if (response.status === 429) {
          // Rate limited — signal to the caller to retry after a delay
          const retryAfterSec = response.headers.get('Retry-After');
          const retryMs = retryAfterSec ? parseInt(retryAfterSec) * 1000 : 15000;
          const err = new Error('Too many requests — retrying shortly');
          (err as any).isRateLimited = true;
          (err as any).retryAfterMs = retryMs;
          throw err;
        }

        if (response.status === 403) {
          // User needs organization setup
          return {
            needsSetup: true,
            organizations: [],
            permissions: [],
            role: 'unassigned'
          };
        }

        throw new Error(`Failed to get user state: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();

      // Backend wraps responses in { data: {...}, error: null }
      // Handle both wrapped and unwrapped formats for resilience
      const data: UserStateResponse = json?.data ?? json;

      dlog('UserStateService: User state received', {
        needsSetup: data.needsSetup,
        organizationsCount: data.organizations?.length || 0,
        hasCurrentOrg: !!data.currentOrganization,
        hasCurrentProject: !!data.currentProject,
        role: data.role,
        permissions: data.permissions
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dlog('UserStateService: Error getting user state', { error: errorMessage });

      // Only silently return "needs setup" for authentication errors (no session).
      // For network/server errors, re-throw so AppContent shows a proper error
      // message instead of silently routing to OrganizationSetup.
      if (errorMessage === 'No valid session found') {
        return {
          needsSetup: true,
          organizations: [],
          permissions: [],
          role: 'unassigned'
        };
      }

      // Surface the error — backend may be down, unreachable, or misconfigured.
      throw error;
    }
  }

  /**
   * Check if user needs organization setup
   * This is a fallback method for backward compatibility
   */
  static async needsSetup(): Promise<boolean> {
    try {
      const userState = await this.getUserState();
      return userState.needsSetup;
    } catch (error) {
      dlog('UserStateService: Error checking setup requirement', { error });
      return true; // Assume setup is needed if we can't determine
    }
  }
} 