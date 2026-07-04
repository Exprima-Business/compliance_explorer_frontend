import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import type { ApiResponse, ApiError as ApiErrorObj } from '../types/api';
import environment from '../config/environment';
import { dlog } from '../utils/debugLog';
import { getCsrfToken, ensureCsrfToken, hasCookieSession, refreshCookieSession, handleSessionExpired } from './sessionBridge';

// API configuration
const API_URL = environment.api.url;

const publicEndpoints = [
  '/api/clauses',
  '/api/families',
  '/api/clauses/search',
  '/api/clauses/family',
  '/api/clauses/bookmark'
];

const protectedEndpoints = [
  '/api/documents'
];

const ORG_STORAGE_KEY = 'orgId';
const PROJECT_STORAGE_KEY = 'projectId';
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';

const getCurrentOrgId = (): string => {
  if (typeof window === 'undefined') return DEFAULT_ORG_ID;
  const stored = localStorage.getItem(ORG_STORAGE_KEY);
  // Return stored value only when it's a real (non-nil) UUID
  if (stored && stored !== DEFAULT_ORG_ID) return stored;
  return DEFAULT_ORG_ID;
};

/**
 * Reads the org ID from the active Supabase JWT (user_metadata.custom_claims).
 * Falls back to getCurrentOrgId() (localStorage) if no session is available.
 * Use this in apiCall so that the very first requests after login carry the
 * correct x-org-id even before OrgContext has had a chance to write to localStorage.
 */
async function resolveOrgId(session: { user?: { user_metadata?: any } } | null): Promise<string> {
  // Prefer localStorage (already validated by OrgContext)
  const stored = getCurrentOrgId();
  if (stored !== DEFAULT_ORG_ID) return stored;

  // Fall back to JWT claim
  if (session?.user?.user_metadata) {
    const meta = session.user.user_metadata;
    const claimedOrgId =
      meta?.custom_claims?.organizationId ||
      meta?.organizationId ||
      null;
    if (claimedOrgId && claimedOrgId !== DEFAULT_ORG_ID) {
      dlog('[api] resolveOrgId: using org ID from JWT claim', { claimedOrgId });
      return claimedOrgId;
    }
  }

  return DEFAULT_ORG_ID;
}

const getCurrentProjectId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PROJECT_STORAGE_KEY) || null;
};

class ApiError extends Error {
  constructor(message: string, public status?: number, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    dlog('[api] Unexpected content type:', { contentType, status: response.status });
    throw new ApiError(`Invalid content type: ${contentType}`, response.status);
  }

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new ApiError(error.message || 'API request failed', response.status, error);
    } catch (e) {
      throw new ApiError(`API request failed: ${response.statusText}`, response.status);
    }
  }

  try {
    return await response.json();
  } catch (e) {
    throw new ApiError('Failed to parse API response', response.status);
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      dlog('[api] Failed to get auth session:', error.message);
      return null;
    }
    return session?.access_token ?? null;
  } catch (error) {
    dlog('[api] Error getting auth token:', error);
    return null;
  }
}

async function getCommonHeaders(requireAuth: boolean = false): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': window.location.origin,
  };

  if (requireAuth) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      dlog('[api] Auth token not available for protected endpoint');
    }
  }

  headers['x-org-id'] = getCurrentOrgId();
  if (getCurrentProjectId()) {
    headers['x-project-id'] = getCurrentProjectId()!;
  }

  return headers;
}

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
  /** Override the default 30 s request timeout (in milliseconds). */
  timeout?: number;
}

export const apiCall = async <T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> => {
  const { requireAuth = false, timeout = 30_000, ...fetchOptions } = options;
  void requireAuth; // auth is attached whenever a session exists; flag kept for call-site compatibility

  const method = (fetchOptions.method || 'GET').toUpperCase();
  const isUnsafeMethod = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

  // Build headers fresh per (re)try so a token/CSRF value refreshed after a 401
  // is picked up on the retry.
  const buildHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    // session is still read for resolveOrgId (the org claim lives in the JWT);
    // the access token itself is no longer sent as a Bearer header.
    const orgId = await resolveOrgId(session);

    const headers: Record<string, string> = {
      'x-org-id': orgId,
      // Cookie auth Phase 4a: authentication now rides ENTIRELY on the HttpOnly
      // session cookie (attached via credentials:'include' below) plus the CSRF
      // header on writes. The Supabase Bearer token is no longer sent on the
      // api.ts path. The BE still ACCEPTS Bearer (Phase 2) for the remaining
      // direct-fetch callers and as a one-revert safety net, so restoring this
      // header rolls 4a back cleanly. Phase 4b removes BE Bearer acceptance and
      // disables localStorage session persistence (the actual XSS closure).
      ...(getCurrentProjectId() ? { 'x-project-id': getCurrentProjectId()! } : {}),
    };

    // Only add Content-Type for non-FormData requests
    if (!(fetchOptions.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // CSRF double-submit: echo the readable ca_csrf cookie on state-changing
    // requests. Required once the session cookie is present and the BE enforces
    // CSRF. ensureCsrfToken() recovers the token from the cookie session if it's
    // missing (e.g. local storage cleared but the session cookie survived), so a
    // cookie-authenticated POST self-heals instead of 403'ing.
    if (isUnsafeMethod) {
      await ensureCsrfToken();
      const csrf = getCsrfToken();
      if (csrf) headers['x-csrf-token'] = csrf;
    }

    return {
      ...headers,
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };
  };

  const doFetch = async (): Promise<Response> => {
    const headers = await buildHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    let response = await doFetch();

    // Cookie-session access-token expiry: rotate the cookie once and retry.
    // Gated on hasCookieSession() so pure-Bearer traffic is untouched (its own
    // refresh is handled by supabase-js autoRefreshToken on the next getSession).
    if (response.status === 401 && hasCookieSession()) {
      const refreshed = await refreshCookieSession();
      if (refreshed) {
        response = await doFetch();
      } else {
        // Refresh rejected → the cookie session is definitively gone. Redirect
        // to /login so the shell (and its interval pollers) unmount, instead of
        // sitting here 401-flooding a dead session. Guarded to fire once.
        handleSessionExpired();
      }
    }

    // Handle CORS / network-level errors
    if (response.type === 'opaque' || response.status === 0) {
      dlog('[api] CORS or network error:', { endpoint });
      return {
        data: null as unknown as T,
        error: { code: 'CORS_ERROR', message: 'Unable to reach the API. Please check your connection.' }
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errObj: ApiErrorObj =
        typeof errorData === 'object' && errorData !== null && 'message' in errorData
          ? {
              code: (errorData.code as string) || 'UNKNOWN',
              message: (errorData.message as string) || 'Request failed',
            }
          : { code: 'UNKNOWN', message: `HTTP ${response.status}: ${response.statusText}` };

      dlog('[api] API error:', { endpoint, status: response.status, error: errObj });
      throw new Error(errObj.message);
    }

    const responseData = await response.json();
    
    // If the response is already in ApiResponse format, return it directly
    if (responseData && typeof responseData === 'object' && 'data' in responseData && 'error' in responseData) {
      return responseData as ApiResponse<T>;
    }

    // Otherwise, wrap the response in ApiResponse format
    return {
      data: responseData as T,
      error: null,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      dlog('[api] Request timed out:', { endpoint });
      return {
        data: null as unknown as T,
        error: { code: 'TIMEOUT', message: 'Request timed out. Please try again.' },
      };
    }

    dlog('[api] API call failed:', {
      endpoint,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const err: ApiErrorObj =
      error && error instanceof Error
        ? { code: 'UNKNOWN', message: error.message }
        : { code: 'UNKNOWN', message: 'An error occurred' };

    return {
      data: null as unknown as T,
      error: err,
    };
  }
};

// ── Public API helpers ────────────────────────────────────────────────────────
// These thin wrappers exist for convenience; apiCall itself never throws.

export const fetchClauses = (): Promise<ApiResponse<Clause[]>> =>
  apiCall<Clause[]>('/api/clauses');

export const getClausesByFamily = (family: ClauseFamily): Promise<ApiResponse<Clause[]>> =>
  apiCall<Clause[]>(`/api/clauses/family/${encodeURIComponent(family.id)}`);

export const getClauseFamilies = (): Promise<ApiResponse<ClauseFamilyGroup[]>> =>
  apiCall<ClauseFamilyGroup[]>('/api/clauses/families');

export const getClauseById = (id: string): Promise<ApiResponse<Clause>> =>
  apiCall<Clause>(`/api/clauses/${id}`);

export const searchClauses = (query: string): Promise<ApiResponse<Clause[]>> =>
  apiCall<Clause[]>(`/api/clauses/search?q=${encodeURIComponent(query)}`);

// ── Protected API helpers ─────────────────────────────────────────────────────

export async function uploadDocument(file: File): Promise<ApiResponse<any>> {
  const formData = new FormData();
  formData.append('file', file);
  return apiCall<ApiResponse<any>>('/api/documents/upload', {
    method: 'POST',
    body: formData,
    requireAuth: true
  });
}

export const analyzeDocument = (documentId: string): Promise<ApiResponse<any>> =>
  apiCall<ApiResponse<any>>(`/api/documents/${documentId}/analyze`, {
    method: 'POST',
    requireAuth: true
  }); 