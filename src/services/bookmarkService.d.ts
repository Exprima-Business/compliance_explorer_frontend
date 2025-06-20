export interface Bookmark {
    id: string;
    organizationId: string;
    projectId?: string;
    clauseId: string;
    status?: string;
    priority?: string;
    notes?: string;
    complianceStatus?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}
export declare const bookmarkService: {
    getBookmarks: (orgId: string) => Promise<Bookmark[]>;
};
