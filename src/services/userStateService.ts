import { supabase } from '../lib/supabase';
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

      const response = await fetch('/api/auth/user-state', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

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

      const data: UserStateResponse = await response.json();
      
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
      
      // If we can't get user state, assume setup is needed
      return {
        needsSetup: true,
        organizations: [],
        permissions: [],
        role: 'unassigned'
      };
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