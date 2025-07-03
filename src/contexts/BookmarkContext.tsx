import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { bookmarkService } from '../services/bookmarkService';
import type { Bookmark } from '../services/bookmarkService';
import { clauseService } from '../services/clauseService';
import { supabase } from '../lib/supabase';
import { useOrg } from './OrgContext';
import { useProject } from './ProjectContext';

interface BookmarkContextValue {
  bookmarks: Bookmark[];
  loading: boolean;
  toggleBookmark: (clauseId: string) => Promise<void>;
}

const BookmarkContext = createContext<BookmarkContextValue | undefined>(undefined);

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (!currentOrg || !currentProject) return;
      const list = await bookmarkService.getBookmarks(currentOrg.id);
      setBookmarks(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load bookmarks', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrg, currentProject]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------------------------------------
  // Realtime subscription: keep bookmarks in sync
  // ---------------------------------------------
  useEffect(() => {
    if (!currentOrg || !currentProject) return;

    // Subscribe to all row changes for this organisation
    const channel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `organizationId=eq.${currentOrg.id} AND projectId=eq.${currentProject.id}`
        },
        (payload) => {
          // We receive INSERT, UPDATE, DELETE events.
          const b = payload.new as Bookmark;
          if (payload.eventType === 'INSERT') {
            setBookmarks(prev => {
              // avoid duplicates by checking both id and clauseId
              const exists = prev.some(item => item.id === b.id || item.clauseId === b.clauseId);
              return exists ? prev : [...prev, b];
            });
          } else if (payload.eventType === 'DELETE') {
            setBookmarks(prev => prev.filter(item => item.id !== (payload.old as any).id));
          } else if (payload.eventType === 'UPDATE') {
            setBookmarks(prev => prev.map(item => item.id === (payload.new as any).id ? (payload.new as Bookmark) : item));
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
  }, [currentOrg, currentProject]);

  const toggleBookmark = async (clauseId: string) => {
    if (!currentProject) {
      console.warn('toggleBookmark called without currentProject');
      return;
    }

    try {
      const resp = await clauseService.bookmarkClause(clauseId);
      if (resp.error) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
        throw new Error(msg);
      }
      // Let realtime subscription handle state updates to avoid conflicts
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