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
export declare class UserStateService {
    /**
     * Get complete user state in a single API call
     * This replaces the complex multi-step validation flow
     */
    static getUserState(): Promise<UserStateResponse>;
    /**
     * Check if user needs organization setup
     * This is a fallback method for backward compatibility
     */
    static needsSetup(): Promise<boolean>;
}
