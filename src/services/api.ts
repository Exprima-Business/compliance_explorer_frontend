import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Clause, ClauseFamily, ClauseFamilyGroup } from '../types/clause';
import type { ApiResponse, ApiError as ApiErrorObj } from '../types/api';
import environment from '../config/environment';
import { dlog } from '../utils/debugLog';

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
  return localStorage.getItem(ORG_STORAGE_KEY) || DEFAULT_ORG_ID;
};

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
    console.error('Invalid content type:', contentType);
    console.error('Response status:', response.status);
    console.error('Response status text:', response.statusText);
    const text = await response.text();
    console.error('Response body:', text);
    throw new ApiError(`Invalid content type: ${contentType}`, response.status);
  }

  if (!response.ok) {
    try {
      const error = await response.json();
      throw new ApiError(error.message || 'API request failed', response.status, error);
    } catch (e) {
      console.error('Failed to parse error response:', e);
      throw new ApiError(`API request failed: ${response.statusText}`, response.status);
    }
  }

  try {
    return await response.json();
  } catch (e) {
    console.error('Failed to parse response:', e);
    throw new ApiError('Failed to parse API response', response.status);
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Failed to get auth session:', error.message);
      return null;
    }
    return session?.access_token ?? null;
  } catch (error) {
    console.error('Error getting auth token:', error);
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
      console.warn('Auth token not available for protected endpoint');
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
}

export const apiCall = async <T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> => {
  const { requireAuth = false, ...fetchOptions } = options;

  try {
    // Retrieve current session token (if any)
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const baseHeaders: Record<string, string> = {
      'x-org-id': getCurrentOrgId(),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(getCurrentProjectId() ? { 'x-project-id': getCurrentProjectId()! } : {}),
    };

    // Only add Content-Type for non-FormData requests
    if (!(fetchOptions.body instanceof FormData)) {
      baseHeaders['Content-Type'] = 'application/json';
    }

    // Merge with any additional headers from options
    const headers = {
      ...baseHeaders,
      ...(fetchOptions.headers as Record<string, string> || {})
    };

    // Debug: log request details for scan uploads
    if (endpoint.includes('/scans')) {
      console.log('Scan API request:', {
        endpoint,
        method: fetchOptions.method || 'GET',
        hasBody: !!fetchOptions.body,
        bodyType: fetchOptions.body ? (fetchOptions.body instanceof FormData ? 'FormData' : 'JSON') : 'None',
        headers: {
          'x-org-id': headers['x-org-id'],
          'x-project-id': headers['x-project-id'],
          hasAuth: !!headers['Authorization'],
          contentType: headers['Content-Type']
        }
      });
    }

    // Debug: log headers for bookmark requests
    if (endpoint.includes('/bookmark')) {
      dlog('Bookmark request headers:', {
        endpoint,
        'x-org-id': headers['x-org-id'],
        'x-project-id': headers['x-project-id'],
        hasAuth: !!headers['Authorization']
      });
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',  // Add credentials for CORS
    });

    // Handle CORS errors
    if (response.type === 'opaque' || response.status === 0) {
      console.error('CORS Error: Unable to access the API');
      return {
        data: null as unknown as T,
        error: 'Unable to access the API. Please check CORS configuration.'
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
          : { code: 'UNKNOWN', message: `HTTP error! status: ${response.status}` };
      
      // Log detailed error information
      console.error('API Error:', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        error: errObj,
      });

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
    console.error('API call failed:', {
      endpoint,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
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

// Public endpoints (no auth required)
export async function fetchClauses(): Promise<ApiResponse<Clause[]>> {
  try {
    return await apiCall<Clause[]>('/api/clauses');
  } catch (error) {
    console.error('Error fetching clauses:', error);
    throw error;
  }
}

export async function getClausesByFamily(family: ClauseFamily): Promise<ApiResponse<Clause[]>> {
  try {
    return await apiCall<Clause[]>(`/api/clauses/family/${encodeURIComponent(family.id)}`);
  } catch (error) {
    console.error('Error fetching clauses by family:', error);
    throw error;
  }
}

export async function getClauseFamilies(): Promise<ApiResponse<ClauseFamilyGroup[]>> {
  try {
    return await apiCall<ClauseFamilyGroup[]>('/api/clauses/families');
  } catch (error) {
    console.error('Error fetching clause families:', error);
    throw error;
  }
}

export async function getClauseById(id: string): Promise<ApiResponse<Clause>> {
  try {
    return await apiCall<Clause>(`/api/clauses/${id}`);
  } catch (error) {
    console.error(`Error fetching clause ${id}:`, error);
    throw error;
  }
}

export async function searchClauses(query: string): Promise<ApiResponse<Clause[]>> {
  try {
    return await apiCall<Clause[]>(`/api/clauses/search?q=${encodeURIComponent(query)}`);
  } catch (error) {
    console.error('Error searching clauses:', error);
    throw error;
  }
}

// Protected endpoints (auth required)
export async function uploadDocument(file: File): Promise<ApiResponse<any>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    return await apiCall<ApiResponse<any>>('/api/documents/upload', {
      method: 'POST',
      body: formData,
      requireAuth: true
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

export async function analyzeDocument(documentId: string): Promise<ApiResponse<any>> {
  try {
    return await apiCall<ApiResponse<any>>(`/api/documents/${documentId}/analyze`, {
      method: 'POST',
      requireAuth: true
    });
  } catch (error) {
    console.error(`Error analyzing document ${documentId}:`, error);
    throw error;
  }
} 