import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { bookmarkService } from '../services/bookmarkService';
import type { Bookmark } from '../services/bookmarkService';
import { clauseService } from '../services/clauseService';

interface BookmarkContextValue {
  bookmarks: Bookmark[];
  loading: boolean;
  toggleBookmark: (clauseId: string) => Promise<void>;
}

const BookmarkContext = createContext<BookmarkContextValue | undefined>(undefined);

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await bookmarkService.getBookmarks(DEFAULT_ORG_ID);
      setBookmarks(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load bookmarks', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleBookmark = async (clauseId: string) => {
    try {
      const resp = await clauseService.bookmarkClause(clauseId);
      if (resp.error) throw new Error(resp.error);
      const isBookmarked = resp.data?.isBookmarked ?? false;
      setBookmarks(prev => {
        const exists = prev.find(b => b.clauseId === clauseId);
        if (isBookmarked) {
          // add if not exists
          if (!exists) {
            return [
              ...prev,
              { id: resp.data!.id, clauseId, organizationId: DEFAULT_ORG_ID, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Bookmark
            ];
          }
          return prev;
        } else {
          // remove
          return prev.filter(b => b.clauseId !== clauseId);
        }
      });
    } catch (err) {
      console.error('toggle bookmark failed', err);
    }
  };

  const value: BookmarkContextValue = { bookmarks, loading, toggleBookmark };
  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
};

export const useBookmarks = (): BookmarkContextValue => {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error('useBookmarks must be within BookmarkProvider');
  return ctx;
}; 