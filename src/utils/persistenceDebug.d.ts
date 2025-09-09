export declare function dlog(...args: any[]): void;
export declare function logPersistenceState(context: string, additionalData?: any): void;
export declare function logStateReconstruction(scanId: string, source: string, additionalData?: any): void;
export declare function logCompletionHandling(scanId: string, status: string, additionalData?: any): void;
export declare function logNavigationFlow(context: string, additionalData?: any): void;
export declare function logComponentLifecycle(trigger: string, additionalData?: any): void;
export declare function logFullStateSnapshot(context: string): void;
