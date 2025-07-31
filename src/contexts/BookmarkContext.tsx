import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { bookmarkService } from '../services/bookmarkService';
import type { Bookmark } from '../services/bookmarkService';
import { clauseService } from '../services/clauseService';
import { supabase } from '../lib/supabase';
import { useOrg } from './OrgContext';
import { useProject } from './ProjectContext';
import { dlog } from '../utils/debugLog';

interface BookmarkContextValue {
  bookmarks: Bookmark[];
  loading: boolean;
  toggleBookmark: (clauseId: string) => Promise<void>;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  isClauseBookmarked: (clauseId: string) => boolean;
}

const BookmarkContext = createContext<BookmarkContextValue | undefined>(undefined);

// Connection management constants
const KEEP_ALIVE_INTERVAL = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrg } = useOrg();
  const { currentProject } = useProject();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const connectionStatusRef = useRef(connectionStatus);
  
  // Connection management refs
  const channelRef = useRef<any>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isReconnectingRef = useRef(false);

  // keep ref in sync
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

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
    
    // Clear keep-alive interval
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    
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

  // Keep-alive ping function
  const sendKeepAlive = useCallback(() => {
    if (channelRef.current && connectionStatusRef.current === 'connected') {
      dlog('Sending keep-alive ping');
      channelRef.current.send({
        type: 'broadcast',
        event: 'keep-alive',
        payload: { timestamp: Date.now() }
      }).catch((err: unknown) => {
        console.warn('Keep-alive ping failed:', err);
        setConnectionStatus('error');
      });
    }
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
          // Backend's comprehensive payload logging
          console.log('=== REALTIME EVENT DEBUG ===');
          console.log('Event type:', payload.eventType);
          console.log('Table:', payload.table);
          console.log('Schema:', payload.schema);
          console.log('Commit timestamp:', payload.commit_timestamp);
          console.log('Event timestamp:', (payload as any).event_timestamp);
          console.log('Errors:', payload.errors);
          console.log('Payload:', JSON.stringify(payload, null, 2));
          console.log('Payload keys:', Object.keys(payload));
          console.log('Payload type:', typeof payload);
          console.log('Payload length:', payload ? Object.keys(payload).length : 'null');
          
          // Specifically log the old/new objects for DELETE events
          if (payload.eventType === 'DELETE') {
            console.log('DELETE old object:', JSON.stringify(payload.old, null, 2));
            console.log('DELETE old object keys:', payload.old ? Object.keys(payload.old) : 'null');
            console.log('DELETE new object:', JSON.stringify(payload.new, null, 2));
            console.log('DELETE new object keys:', payload.new ? Object.keys(payload.new) : 'null');
          }
          
          console.log('=== END DEBUG ===');

          // Generic log for every event before any filtering – helps debug missing DELETEs
          dlog('RT payload', {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            table: payload.table,
            filterOrg: currentOrg.id,
            filterProject: currentProject.id,
          });

          dlog('Bookmark realtime event received:', {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            currentProject: currentProject.id,
            table: payload.table,
            schema: payload.schema,
            commit_timestamp: payload.commit_timestamp,
            errors: payload.errors
          });

          if (payload.eventType === 'INSERT') {
            const b = payload.new as Bookmark;
            dlog('Processing INSERT event:', { bookmark: b, currentProject: currentProject.id });
            
            // Only process changes for the current project
            if (b.projectId !== currentProject.id) {
              dlog('Skipping INSERT - wrong project:', { bookmarkProject: b.projectId, currentProject: currentProject.id });
              return;
            }
            
            setBookmarks(prev => {
              // avoid duplicates by checking both id and clauseId
              const exists = prev.some(item => item.id === b.id || item.clauseId === b.clauseId);
              if (exists) {
                dlog('Skipping INSERT - bookmark already exists:', { bookmarkId: b.id, clauseId: b.clauseId });
                return prev;
              }
              dlog('Adding bookmark to state:', { bookmark: b, newCount: prev.length + 1 });
              return [...prev, b];
            });
          } else if (payload.eventType === 'DELETE') {
            // Since we now handle UI updates immediately via API response,
            // DELETE events are mainly for multi-user synchronization
            // We can safely ignore them since the UI is already updated
            dlog('DELETE event received - UI already updated via API response, skipping');
            return;
          } else if (payload.eventType === 'UPDATE') {
            const b = payload.new as Bookmark;
            dlog('Processing UPDATE event:', { bookmark: b, currentProject: currentProject.id });
            
            // Only process changes for the current project
            if (b.projectId !== currentProject.id) {
              dlog('Skipping UPDATE - wrong project:', { bookmarkProject: b.projectId, currentProject: currentProject.id });
              return;
            }
            
            setBookmarks(prev => prev.map(item => item.id === b.id ? b : item));
          } else {
            dlog('Unknown event type:', (payload as any).eventType);
          }
        }
      )
      .subscribe((status) => {
        console.log('=== SUBSCRIPTION STATUS ===');
        console.log('Status:', status);
        console.log('Channel:', channel);
        console.log('=== END STATUS ===');
        
        dlog('Realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          isReconnectingRef.current = false;
          reconnectAttemptsRef.current = 0;
          
          // Backend's subscription verification logging
          console.log('Realtime subscription established for bookmarks');
          
          // Start keep-alive ping
          keepAliveIntervalRef.current = setInterval(sendKeepAlive, KEEP_ALIVE_INTERVAL);
          dlog('Realtime subscription established, keep-alive started');
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
  }, [currentOrg, currentProject, cleanupConnection, sendKeepAlive, attemptReconnect]);

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

  const toggleBookmark = async (clauseId: string) => {
    if (!currentProject) {
      console.warn('toggleBookmark called without currentProject');
      return;
    }

    dlog('toggleBookmark called:', {
      clauseId,
      currentProject: currentProject.id,
      currentOrg: currentOrg?.id
    });

    try {
      const resp = await clauseService.bookmarkClause(clauseId);
      if (resp.error) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
        throw new Error(msg);
      }

      dlog('API response received:', {
        clauseId,
        response: resp.data,
        isBookmarked: resp.data?.isBookmarked
      });

      // ---------------------------------------------
      // IMMEDIATE UI UPDATE USING API RESPONSE
      // ---------------------------------------------
      // Use the API response to update UI immediately, then let realtime events
      // handle multi-user synchronization and verification
      if (resp.data) {
        const { id: responseClauseId, isBookmarked } = resp.data;
        
        if (isBookmarked) {
          // Add bookmark to state immediately
          setBookmarks(prev => {
            // Check if bookmark already exists
            const exists = prev.some(item => item.clauseId === responseClauseId);
            if (exists) {
              dlog('Bookmark already exists in state, skipping add:', { clauseId: responseClauseId });
              return prev;
            }
            
            // Create a minimal bookmark object for immediate UI update
            const newBookmark: Bookmark = {
              id: '', // Will be filled by realtime event
              clauseId: responseClauseId,
              organizationId: currentOrg?.id || '',
              projectId: currentProject.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            dlog('Adding bookmark to state immediately:', { 
              clauseId: responseClauseId, 
              newCount: prev.length + 1 
            });
            return [...prev, newBookmark];
          });
        } else {
          // Remove bookmark from state immediately
          setBookmarks(prev => {
            const newState = prev.filter(item => item.clauseId !== responseClauseId);
            const removed = prev.length - newState.length;
            
            dlog('Removing bookmark from state immediately:', {
              clauseId: responseClauseId,
              oldCount: prev.length,
              newCount: newState.length,
              removed
            });
            
            return newState;
          });
        }
      }
    } catch (err) {
      console.error('toggle bookmark failed', err);
    }
  };

  // Helper function to check if a clause is bookmarked
  const isClauseBookmarked = useCallback((clauseId: string): boolean => {
    return bookmarks.some(bookmark => bookmark.clauseId === clauseId);
  }, [bookmarks]);

  const value: BookmarkContextValue = { 
    bookmarks, 
    loading, 
    toggleBookmark,
    connectionStatus,
    isClauseBookmarked
  };
  
  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>;
};

export const useBookmarks = (): BookmarkContextValue => {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error('useBookmarks must be within BookmarkProvider');
  return ctx;
}; 