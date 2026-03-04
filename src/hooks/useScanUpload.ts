import { useState, useRef, useCallback, useEffect } from 'react';
import { scanApi, validateFile } from '../services/scanApi';
import type { ScanProgress, ScanSession, DetectedClause } from '../services/scanApi';
import { getAuthToken } from '../services/api';
import environment from '../config/environment';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScanState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

export interface ScanUploadResult {
  state: ScanState;
  progress: ScanProgress | null;
  results: DetectedClause[];
  scanId: string | null;
  fileName: string | null;
  error: string | null;
  upload: (file: File) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 3_000;
const SSE_FAILURE_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useScanUpload — state-machine hook for the full document scan lifecycle.
 *
 * States: idle -> uploading -> processing -> complete | error
 *
 * Connects via SSE for real-time progress. Falls back to polling after
 * `SSE_FAILURE_THRESHOLD` consecutive SSE failures.
 *
 * All hooks are unconditional at the top level — impossible to trigger
 * React Error #300.
 */
export function useScanUpload(initialScanId?: string): ScanUploadResult {
  // -- unconditional hooks ---------------------------------------------------
  const [state, setState] = useState<ScanState>(initialScanId ? 'processing' : 'idle');
  const [scanId, setScanId] = useState<string | null>(initialScanId ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [results, setResults] = useState<DetectedClause[]>([]);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseFailuresRef = useRef(0);
  const isMountedRef = useRef(true);

  // -- helpers ---------------------------------------------------------------

  /** Clean up SSE connection */
  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  /** Clean up polling timer */
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  /** Clean up all connections */
  const cleanup = useCallback(() => {
    closeSSE();
    stopPolling();
  }, [closeSSE, stopPolling]);

  /** Fetch completed scan results from the API */
  const fetchResults = useCallback(async (id: string) => {
    const resp = await scanApi.getScan(id);
    if (!isMountedRef.current) return;
    if (resp.error) {
      const msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
      setState('error');
      setError(msg);
      return;
    }
    if (resp.data) {
      setResults(resp.data.results ?? []);
      setFileName(prev => prev || resp.data!.fileName);
      setState('complete');
    }
  }, []);

  /** Poll the scan endpoint for status updates */
  const startPolling = useCallback(
    (id: string) => {
      if (pollTimerRef.current) return; // already polling

      const poll = async () => {
        try {
          const resp = await scanApi.getScan(id);
          if (!isMountedRef.current) return;
          if (resp.error) return; // silent fail, will retry

          const scan = resp.data;
          if (!scan) return;

          // Update progress from scan metadata
          if (scan.metadata) {
            setProgress({
              scanId: id,
              current: scan.metadata.chunksProcessed ?? 0,
              total: scan.metadata.totalChunks ?? 1,
              status: scan.status,
              message: scan.status === 'processing' ? 'Processing document...' : '',
              estimatedTimeRemaining: 0,
              pagesProcessed: scan.metadata.chunksProcessed ?? 0,
              totalPages: scan.metadata.totalChunks ?? 1,
            });
          }

          if (scan.status === 'complete') {
            stopPolling();
            setResults(scan.results ?? []);
            setState('complete');
          } else if (scan.status === 'error') {
            stopPolling();
            setState('error');
            setError('Scan processing failed on the server.');
          }
        } catch {
          // silent — we'll retry on next interval
        }
      };

      // Run immediately, then on interval
      poll();
      pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  /** Open an SSE connection for real-time progress */
  const connectSSE = useCallback(
    async (id: string) => {
      closeSSE();
      try {
        const token = await getAuthToken();
        const orgId = localStorage.getItem('orgId') ?? '';
        const projectId = localStorage.getItem('projectId') ?? '';

        let url = `${environment.api.url}/api/scans/${id}/stream?token=${encodeURIComponent(token ?? '')}`;
        if (orgId) url += `&orgId=${encodeURIComponent(orgId)}`;
        if (projectId) url += `&projectId=${encodeURIComponent(projectId)}`;

        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
          sseFailuresRef.current = 0;
        };

        es.onmessage = (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            setProgress(data as ScanProgress);

            if (data.status === 'complete') {
              closeSSE();
              fetchResults(id);
            } else if (data.status === 'error') {
              closeSSE();
              setState('error');
              setError(data.message || 'Scan failed');
            }
          } catch {
            // ignore unparseable messages
          }
        };

        es.onerror = () => {
          if (!isMountedRef.current) return;
          sseFailuresRef.current += 1;
          closeSSE();

          if (sseFailuresRef.current >= SSE_FAILURE_THRESHOLD) {
            // Fall back to polling
            startPolling(id);
          } else {
            // Reconnect with backoff
            const delay = 1_000 * Math.pow(2, sseFailuresRef.current - 1);
            setTimeout(() => {
              if (isMountedRef.current) connectSSE(id);
            }, delay);
          }
        };
      } catch {
        // SSE setup failed — fall back to polling
        startPolling(id);
      }
    },
    [closeSSE, fetchResults, startPolling],
  );

  // -- public actions --------------------------------------------------------

  const upload = useCallback(
    async (file: File) => {
      cleanup();
      setError(null);
      setResults([]);
      setProgress(null);
      setFileName(file.name);

      // Validate file first
      try {
        validateFile(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid file');
        setState('error');
        return;
      }

      setState('uploading');

      try {
        const orgId = localStorage.getItem('orgId') ?? '';
        const resp = await scanApi.uploadDocument(file, orgId);

        if (!isMountedRef.current) return;

        if (resp.error) {
          const msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
          setState('error');
          setError(msg);
          return;
        }

        const newScanId = resp.data?.scanId;
        if (!newScanId) {
          setState('error');
          setError('Upload succeeded but no scan ID was returned.');
          return;
        }

        setScanId(newScanId);
        setState('processing');
        sseFailuresRef.current = 0;
        connectSSE(newScanId);
      } catch (err) {
        if (!isMountedRef.current) return;
        setState('error');
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [cleanup, connectSSE],
  );

  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setScanId(null);
    setFileName(null);
    setProgress(null);
    setResults([]);
    setError(null);
    sseFailuresRef.current = 0;
  }, [cleanup]);

  // -- effects ---------------------------------------------------------------

  // If we were initialized with a scanId (URL param), start monitoring
  useEffect(() => {
    if (!initialScanId) return;
    // Try to fetch current status first, then decide SSE vs polling
    (async () => {
      try {
        const resp = await scanApi.getScan(initialScanId);
        if (!isMountedRef.current) return;
        if (resp.error) {
          const msg = typeof resp.error === 'string' ? resp.error : resp.error.message;
          setState('error');
          setError(msg);
          return;
        }
        const scan = resp.data;
        if (!scan) {
          setState('error');
          setError('Scan not found');
          return;
        }

        setFileName(scan.fileName);

        if (scan.status === 'complete') {
          setResults(scan.results ?? []);
          setState('complete');
        } else if (scan.status === 'error') {
          setState('error');
          setError('Scan previously failed.');
        } else {
          // Still processing — connect SSE
          setState('processing');
          connectSSE(initialScanId);
        }
      } catch {
        if (isMountedRef.current) {
          setState('error');
          setError('Failed to load scan');
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScanId]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return { state, progress, results, scanId, fileName, error, upload, reset };
}
