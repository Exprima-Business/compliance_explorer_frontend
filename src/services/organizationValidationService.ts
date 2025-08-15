import { supabase } from '../lib/supabase';
import { dlog } from '../utils/debugLog';
import environment from '../config/environment';

export interface OrganizationValidationResponse {
  valid: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  jwt?: string;
  error?: string;
}

export interface OrganizationValidationRequest {
  organizationId?: string; // Optional, for specific org selection
}

export class OrganizationValidationService {
  private static readonly VALIDATION_ENDPOINT = '/api/auth/validate-organization';

  /**
   * Validate user's organization access and get validated organization context
   */
  static async validateOrganization(
    request?: OrganizationValidationRequest
  ): Promise<OrganizationValidationResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return {
          valid: false,
          error: 'No active session found'
        };
      }

      dlog('Validating organization access', { 
        hasSession: !!session, 
        userId: session.user.id,
        requestOrgId: request?.organizationId 
      });

      const response = await fetch(`${environment.api.url}${this.VALIDATION_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request || {})
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        
        dlog('Organization validation failed', { 
          status: response.status, 
          error: errorMessage 
        });

        return {
          valid: false,
          error: errorMessage
        };
      }

      const data: OrganizationValidationResponse = await response.json();
      
      dlog('Organization validation successful', { 
        valid: data.valid,
        hasOrganization: !!data.organization,
        hasMultipleOrgs: !!data.organizations,
        orgCount: data.organizations?.length || 0
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dlog('Organization validation error', { error: errorMessage });
      
      return {
        valid: false,
        error: `Organization validation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Get user's validated organizations (for multi-org users)
   */
  static async getUserOrganizations(): Promise<OrganizationValidationResponse> {
    return this.validateOrganization();
  }

  /**
   * Validate and set specific organization context
   */
  static async setOrganizationContext(organizationId: string): Promise<OrganizationValidationResponse> {
    return this.validateOrganization({ organizationId });
  }

  /**
   * Check if user has valid organization context
   */
  static async hasValidOrganizationContext(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return false;
      }

      // Decode JWT to check for custom claims
      const tokenParts = session.access_token.split('.');
      if (tokenParts.length !== 3) {
        return false;
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      const hasCustomClaims = payload.custom_claims && 
        payload.custom_claims.organizationId && 
        payload.custom_claims.organizationSlug;

      dlog('Checking organization context', { 
        hasCustomClaims,
        claims: payload.custom_claims 
      });

      return hasCustomClaims;
    } catch (error) {
      dlog('Error checking organization context', { error });
      return false;
    }
  }
} 