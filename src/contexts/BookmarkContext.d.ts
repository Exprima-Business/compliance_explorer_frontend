import React from 'react';
import type { Bookmark } from '../services/bookmarkService';
interface BookmarkContextValue {
    bookmarks: Bookmark[];
    loading: boolean;
    toggleBookmark: (clauseId: string) => Promise<void>;
    connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
    isClauseBookmarked: (clauseId: string) => boolean;
    bookmarkError: string | null;
    clearBookmarkError: () => void;
}
export declare const BookmarkProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useBookmarks: () => BookmarkContextValue;
export {};
