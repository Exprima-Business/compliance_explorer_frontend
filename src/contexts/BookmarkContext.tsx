import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { bookmarkService } from '../services/bookmarkService';
import type { Bookmark } from '../services/bookmarkService';
import { clauseService } from '../services/clauseService';
import { supabase } from '../lib/supabase';

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

  // ---------------------------------------------
  // Realtime subscription: keep bookmarks in sync
  // ---------------------------------------------
  useEffect(() => {
    // Subscribe to all row changes for this organisation
    const channel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `organizationId=eq.${DEFAULT_ORG_ID}`
        },
        (payload) => {
          // We receive INSERT, UPDATE, DELETE events.
          if (payload.eventType === 'INSERT') {
            setBookmarks(prev => {
              const b = payload.new as Bookmark;
              // avoid duplicates if we already have it
              return prev.some(item => item.id === b.id) ? prev : [...prev, b];
            });
          } else if (payload.eventType === 'DELETE') {
            setBookmarks(prev => prev.filter(b => b.id !== (payload.old as any).id));
          } else if (payload.eventType === 'UPDATE') {
            setBookmarks(prev => prev.map(b => b.id === (payload.new as any).id ? (payload.new as Bookmark) : b));
          }
        }
      )
      .subscribe();

    // Cleanup on unmount – gracefully attempt to unsubscribe and remove the channel.
    return () => {
      // `unsubscribe()` is preferred because it is safe to call even if the
      // WebSocket was never fully established (e.g., React Strict Mode double-mount).
      channel
        .unsubscribe()
        .catch((err: unknown) => {
          // Fallback to removeChannel just in case, but swallow errors to avoid noisy logs
          console.warn('BookmarkContext: failed to unsubscribe channel, falling back to removeChannel', err);
          supabase.removeChannel(channel).catch(() => {/* ignore */});
        });
    };
  }, []);

  const toggleBookmark = async (clauseId: string) => {
    try {
      const resp = await clauseService.bookmarkClause(clauseId);
      if (resp.error) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
        throw new Error(msg);
      }
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