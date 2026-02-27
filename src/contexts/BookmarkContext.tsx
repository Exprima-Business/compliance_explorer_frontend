import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { bookmarkService } from '../services/bookmarkService';
import type { Bookmark } from '../services/bookmarkService';
import { clauseService } from '../services/clauseService';
import { supabase } from '../lib/supabase';
import { useOrg } from './OrgContext';
import { useProject } from './ProjectContext';
import { dlog } from '../utils/debugLog';
import { extractErrorMessage } from '../utils/errorUtils';

interface BookmarkContextValue {
  bookmarks: Bookmark[];
  loading: boolean;
  toggleBookmark: (clauseId: string) => Promise<void>;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  isClauseBookmarked: (clauseId: string) => boolean;
  bookmarkError: string | null;
  clearBookmarkError: () => void;
}

const BookmarkContext = createContext<BookmarkContextValue | undefined>(undefined);

// Connection management constants
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const connectionStatusRef = useRef(connectionStatus);

  // Connection management refs
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isReconnectingRef = useRef(false);

  // keep ref in sync
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  const clearBookmarkError = useCallback(() => {
    setBookmarkError(null);
  }, []);

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

  // Cleanup function for connection management
  const cleanupConnection = useCallback(() => {
    dlog('Cleaning up connection resources');

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      channelRef.current
        .unsubscribe()
        .catch((err: unknown) => {
          console.warn('BookmarkContext: failed to unsubscribe channel during cleanup', err);
          supabase.removeChannel(channelRef.current).catch(() => {/* ignore */});
        });
      channelRef.current = null;
    }

    isReconnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
  }, []);

  // Reconnection logic with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (isReconnectingRef.current || !currentOrg || !currentProject) return;

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      dlog('Max reconnection attempts reached, giving up');
      setConnectionStatus('error');
      return;
    }

    isReconnectingRef.current = true;
    setConnectionStatus('connecting');

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
      MAX_RECONNECT_DELAY
    );

    dlog(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      setupRealtimeSubscription();
    }, delay);
  }, [currentOrg, currentProject]);

  // Setup realtime subscription with connection monitoring
  const setupRealtimeSubscription = useCallback(() => {
    if (!currentOrg || !currentProject) {
      dlog('Cannot setup subscription: missing org or project');
      return;
    }

    // Cleanup existing connection
    cleanupConnection();

    dlog('Setting up realtime subscription for bookmarks');
    setConnectionStatus('connecting');

    // Subscribe to all row changes for this organisation
    const channel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `organizationId=eq.${currentOrg.id}`
        },
        (payload) => {
          dlog('Bookmark realtime event received', {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            filterOrg: currentOrg.id,
            filterProject: currentProject.id,
          });

          if (payload.eventType === 'INSERT') {
            const b = payload.new as Bookmark;
            dlog('Processing INSERT event', { bookmark: b, currentProject: currentProject.id });

            // Only process changes for the current project
            if (b.projectId !== currentProject.id) {
              dlog('Skipping INSERT - wrong project', { bookmarkProject: b.projectId, currentProject: currentProject.id });
              return;
            }

            setBookmarks(prev => {
              // avoid duplicates by checking both id and clauseId
              const exists = prev.some(item => item.id === b.id || item.clauseId === b.clauseId);
              if (exists) {
                dlog('Skipping INSERT - bookmark already exists', { bookmarkId: b.id, clauseId: b.clauseId });
                return prev;
              }
              dlog('Adding bookmark to state via realtime', { bookmark: b, newCount: prev.length + 1 });
              return [...prev, b];
            });
          } else if (payload.eventType === 'DELETE') {
            // Handle DELETE for multi-tab synchronisation
            const old = payload.old as Partial<Bookmark>;
            dlog('Processing DELETE event', { old, currentProject: currentProject.id });
            if (old?.clauseId) {
              setBookmarks(prev => prev.filter(b => b.clauseId !== old.clauseId));
            }
          } else if (payload.eventType === 'UPDATE') {
            const b = payload.new as Bookmark;
            dlog('Processing UPDATE event', { bookmark: b, currentProject: currentProject.id });

            // Only process changes for the current project
            if (b.projectId !== currentProject.id) {
              dlog('Skipping UPDATE - wrong project', { bookmarkProject: b.projectId, currentProject: currentProject.id });
              return;
            }

            setBookmarks(prev => prev.map(item => item.id === b.id ? b : item));
          } else {
            dlog('Unknown event type', (payload as any).eventType);
          }
        }
      )
      .subscribe((status) => {
        dlog('Realtime subscription status', status);

        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          isReconnectingRef.current = false;
          reconnectAttemptsRef.current = 0;
          dlog('Realtime subscription established for bookmarks');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error');
          dlog('Realtime subscription error, attempting reconnection');
          attemptReconnect();
        } else if (status === 'CLOSED') {
          setConnectionStatus('disconnected');
          dlog('Realtime subscription closed');
        }
      });

    channelRef.current = channel;
  }, [currentOrg, currentProject, cleanupConnection, attemptReconnect]);

  // ---------------------------------------------
  // Realtime subscription: keep bookmarks in sync
  // ---------------------------------------------
  useEffect(() => {
    setupRealtimeSubscription();

    // Cleanup on unmount
    return () => {
      cleanupConnection();
    };
  }, [setupRealtimeSubscription, cleanupConnection]);

  // Handle system events that can affect connection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        dlog('Page became visible, checking connection status');
        if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
          dlog('Reconnecting due to page visibility change');
          attemptReconnect();
        }
      }
    };

    const handleOnline = () => {
      dlog('Network came online, checking connection status');
      if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
        dlog('Reconnecting due to network online event');
        attemptReconnect();
      }
    };

    const handleFocus = () => {
      dlog('Window gained focus, checking connection status');
      if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
        dlog('Reconnecting due to window focus event');
        attemptReconnect();
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    // Cleanup event listeners
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [connectionStatus, attemptReconnect]);

  const toggleBookmark = useCallback(async (clauseId: string) => {
    setBookmarkError(null);

    if (!currentProject) {
      setBookmarkError('No project selected');
      return;
    }

    dlog('toggleBookmark called', {
      clauseId,
      currentProject: currentProject.id,
      currentOrg: currentOrg?.id
    });

    try {
      const resp = await clauseService.bookmarkClause(clauseId);
      if (resp.error) {
        throw new Error(extractErrorMessage(resp.error, 'Bookmark operation failed'));
      }

      dlog('Bookmark API response received', {
        clauseId,
        response: resp.data,
        isBookmarked: resp.data?.isBookmarked
      });

      // ---------------------------------------------
      // IMMEDIATE UI UPDATE USING API RESPONSE
      // ---------------------------------------------
      // Use the API response to update UI immediately; realtime events handle
      // multi-user synchronisation and verification (INSERT/UPDATE).
      if (resp.data) {
        const { id: responseClauseId, isBookmarked } = resp.data;

        if (isBookmarked) {
          // Add bookmark to state immediately
          setBookmarks(prev => {
            const exists = prev.some(item => item.clauseId === responseClauseId);
            if (exists) {
              dlog('Bookmark already exists in state, skipping add', { clauseId: responseClauseId });
              return prev;
            }

            // Minimal bookmark object for immediate UI update; real record arrives via realtime INSERT
            const newBookmark: Bookmark = {
              id: '',
              clauseId: responseClauseId,
              organizationId: currentOrg?.id || '',
              projectId: currentProject.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            dlog('Adding bookmark to state immediately', { clauseId: responseClauseId, newCount: prev.length + 1 });
            return [...prev, newBookmark];
          });
        } else {
          // Remove bookmark from state immediately
          setBookmarks(prev => {
            const newState = prev.filter(item => item.clauseId !== responseClauseId);
            dlog('Removing bookmark from state immediately', {
              clauseId: responseClauseId,
              oldCount: prev.length,
              newCount: newState.length,
            });
            return newState;
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bookmark operation failed';
      console.error('toggle bookmark failed', err);
      setBookmarkError(msg);
    }
  }, [currentProject, currentOrg]);

  // Helper function to check if a clause is bookmarked
  const isClauseBookmarked = useCallback((clauseId: string): boolean => {
    return bookmarks.some(bookmark => bookmark.clauseId === clauseId);
  }, [bookmarks]);

  const value: BookmarkContextValue = {
    bookmarks,
    loading,
    toggleBookmark,
    connectionStatus,
    isClauseBookmarked,
    bookmarkError,
    clearBookmarkError,
  };

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
};

export const useBookmarks = (): BookmarkContextValue => {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error('useBookmarks must be within BookmarkProvider');
  return ctx;
};
