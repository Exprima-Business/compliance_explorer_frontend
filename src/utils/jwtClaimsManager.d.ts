export interface JWTCustomClaims {
    organizationId: string;
    organizationSlug: string;
    organizationName?: string;
    updatedAt?: string;
}
export declare class JWTClaimsManager {
    private static readonly CLAIMS_KEY;
    /**
     * Update JWT with custom claims for organization context
     */
    static updateClaims(org: {
        id: string;
        slug: string;
        name: string;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Restore claims from localStorage after token refresh
     */
    static restoreClaims(): Promise<{
        success: boolean;
        claims?: JWTCustomClaims;
        error?: string;
    }>;
    /**
     * Validate current JWT claims
     */
    static validateCurrentClaims(): Promise<{
        isValid: boolean;
        claims?: JWTCustomClaims;
        error?: string;
    }>;
    /**
     * Clear stored claims (for logout)
     */
    static clearStoredClaims(): void;
    /**
     * Debug utility to log current JWT claims
     */
    static debugCurrentClaims(): Promise<void>;
    /**
     * Validate claims structure
     */
    private static isClaimsValid;
}
