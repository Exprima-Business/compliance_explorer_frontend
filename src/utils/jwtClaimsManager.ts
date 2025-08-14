import { supabase } from '../lib/supabase';
import { dlog } from './debugLog';

export interface JWTCustomClaims {
  organizationId: string;
  organizationSlug: string;
  organizationName?: string;
  updatedAt?: string;
}

export class JWTClaimsManager {
  private static readonly CLAIMS_KEY = 'jwt_organization_claims';
  
  /**
   * Update JWT with custom claims for organization context
   */
  static async updateClaims(org: { id: string; slug: string; name: string }): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { success: false, error: 'No active session' };
      }

      // Prepare claims data
      const claims = {
        organizationId: org.id,
        organizationSlug: org.slug,
        organizationName: org.name,
        updatedAt: new Date().toISOString()
      };
      
      // Store claims in localStorage for persistence across refreshes
      localStorage.setItem(this.CLAIMS_KEY, JSON.stringify(claims));

      // Update JWT claims via Supabase
      const { error } = await supabase.auth.updateUser({
        data: claims
      });

      if (error) {
        dlog('JWT claims update failed:', error);
        return { success: false, error: error.message };
      }

      dlog('JWT claims updated successfully', claims);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dlog('Error updating JWT claims:', errorMessage);
      return { 
        success: false, 
        error: `Failed to update JWT claims: ${errorMessage}` 
      };
    }
  }

  /**
   * Restore claims from localStorage after token refresh
   */
  static async restoreClaims(): Promise<{
    success: boolean;
    claims?: JWTCustomClaims;
    error?: string;
  }> {
    try {
      const storedClaims = localStorage.getItem(this.CLAIMS_KEY);
      if (!storedClaims) {
        return { success: false, error: 'No stored claims found' };
      }

      const claims = JSON.parse(storedClaims) as JWTCustomClaims;
      
      // Verify claims are still valid
      if (this.isClaimsValid(claims)) {
        const result = await this.updateClaims({
          id: claims.organizationId,
          slug: claims.organizationSlug,
          name: claims.organizationName || ''
        });
        
        return { 
          success: result.success, 
          claims: result.success ? claims : undefined,
          error: result.error 
        };
      }

      return { success: false, error: 'Stored claims are invalid or expired' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        success: false, 
        error: `Failed to restore claims: ${errorMessage}` 
      };
    }
  }

  /**
   * Validate current JWT claims
   */
  static async validateCurrentClaims(): Promise<{
    isValid: boolean;
    claims?: JWTCustomClaims;
    error?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { isValid: false, error: 'No active session' };
      }

      const claims = session.user?.user_metadata as JWTCustomClaims;
      
      if (!claims?.organizationId || !claims?.organizationSlug) {
        return { 
          isValid: false, 
          error: 'Missing required custom claims: organizationId or organizationSlug' 
        };
      }

      return { isValid: true, claims };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        isValid: false, 
        error: `JWT validation failed: ${errorMessage}` 
      };
    }
  }

  /**
   * Clear stored claims (for logout)
   */
  static clearStoredClaims(): void {
    localStorage.removeItem(this.CLAIMS_KEY);
    dlog('Stored JWT claims cleared');
  }

  /**
   * Debug utility to log current JWT claims
   */
  static async debugCurrentClaims(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current JWT Claims:', {
        hasSession: !!session,
        userMetadata: session?.user?.user_metadata,
        customClaims: session?.user?.user_metadata as JWTCustomClaims,
        storedClaims: localStorage.getItem(this.CLAIMS_KEY)
      });
    } catch (error) {
      console.error('Error debugging JWT claims:', error);
    }
  }

  /**
   * Validate claims structure
   */
  private static isClaimsValid(claims: JWTCustomClaims): boolean {
    return !!(claims.organizationId && claims.organizationSlug);
  }
} 