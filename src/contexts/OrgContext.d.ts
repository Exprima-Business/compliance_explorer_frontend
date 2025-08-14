import React from 'react';
export interface Organization {
    id: string;
    name: string;
    slug: string;
    role?: string;
}
interface OrgContextValue {
    orgs: Organization[];
    currentOrg: Organization | null;
    setCurrentOrg: (org: Organization) => void;
    refreshOrgs: () => Promise<void>;
    createOrg: (name: string) => Promise<void>;
    initialized: boolean;
}
export declare const OrgProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useOrg: () => OrgContextValue;
export {};
