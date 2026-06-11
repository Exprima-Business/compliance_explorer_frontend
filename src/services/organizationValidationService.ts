import { dlog } from '../utils/debugLog';
import environment from '../config/environment';
import { getCsrfToken } from './sessionBridge';

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
      const requestBody = request || {};
      dlog('Validating organization access (cookie auth)', {
        requestOrgId: request?.organizationId,
      });

      // Cookie auth (Phase 4b): authenticated by the HttpOnly session cookie
      // (credentials:include) + double-submit CSRF token (POST). No Bearer and
      // no supabase-js session dependency — works after persistSession is off.
      const csrf = getCsrfToken();
      const response = await fetch(`${environment.api.url}${this.VALIDATION_ENDPOINT}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'x-csrf-token': csrf } : {}),
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        
        dlog('Organization validation failed - ERROR RESPONSE DEBUG', { 
          status: response.status,
          statusText: response.statusText,
          responseHeaders: 'Headers object (not enumerable)',
          errorData: errorData,
          errorDataType: typeof errorData,
          errorDataKeys: errorData ? Object.keys(errorData) : 'null/undefined',
          error: errorMessage 
        });

        return {
          valid: false,
          error: errorMessage
        };
      }

      const rawData = await response.json();
      
      // Comprehensive response debugging
      dlog('Organization validation successful - FULL RESPONSE DEBUG', { 
        responseStatus: response.status,
        responseHeaders: 'Headers object (not enumerable)',
        responseData: rawData,
        responseDataType: typeof rawData,
        responseDataKeys: rawData ? Object.keys(rawData) : 'null/undefined',
        hasDataField: !!rawData.data,
        dataKeys: rawData.data ? Object.keys(rawData.data) : 'null/undefined',
        hasOrganization: !!rawData.data?.organization,
        organizationDetails: rawData.data?.organization,
        error: rawData.error
      });

      // Parse backend response structure to match frontend expectations
      const data: OrganizationValidationResponse = {
        valid: !!(rawData.data?.organization),
        organization: rawData.data?.organization ? {
          id: rawData.data.organization.id,
          name: rawData.data.organization.name,
          slug: rawData.data.organization.slug
        } : undefined,
        organizations: rawData.data?.organization ? [{
          id: rawData.data.organization.id,
          name: rawData.data.organization.name,
          slug: rawData.data.organization.slug
        }] : undefined,
        error: rawData.error || null
      };

      dlog('Organization validation parsed response', {
        parsedValid: data.valid,
        parsedOrganization: data.organization,
        parsedOrganizations: data.organizations,
        parsedError: data.error
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

} 