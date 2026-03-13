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
    organizationId?: string;
}
export declare class OrganizationValidationService {
    private static readonly VALIDATION_ENDPOINT;
    /**
     * Validate user's organization access and get validated organization context
     */
    static validateOrganization(request?: OrganizationValidationRequest): Promise<OrganizationValidationResponse>;
    /**
     * Get user's validated organizations (for multi-org users)
     */
    static getUserOrganizations(): Promise<OrganizationValidationResponse>;
    /**
     * Validate and set specific organization context
     */
    static setOrganizationContext(organizationId: string): Promise<OrganizationValidationResponse>;
}
