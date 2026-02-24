import { supabase } from '../lib/supabase';
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      dlog('UserStateService: Getting user state', {
        userId: session.user.id,
        hasToken: !!session.access_token
      });

      // 12-second timeout — prevents infinite spinner when Railway is deploying
      // or unreachable.  AbortController is supported in all modern browsers.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      let response: Response;
      try {
        response = await fetch(`${environment.api.url}/api/auth/user-state`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
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