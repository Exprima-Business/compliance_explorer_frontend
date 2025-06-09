import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Clause, ClauseFamily, ClauseFamilyGroup, ApiResponse } from '../types/clause';
import environment from '../config/environment';

// Ensure API URL has no trailing slash
const API_URL = environment.api.url.replace(/\/$/, '');
console.log('API URL:', API_URL); // Log the API URL for debugging

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

async function getAuthToken(): Promise<string | null> {
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

  return headers;
}

export async function apiCall<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    requireAuth?: boolean;
  } = {}
): Promise<T> {
  const { method = 'GET', body, requireAuth = false } = options;

  // Ensure endpoint starts with /api
  const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
  
  const isPublicEndpoint = publicEndpoints.some(ep => apiEndpoint.startsWith(ep));
  const isProtectedEndpoint = protectedEndpoints.some(ep => apiEndpoint.startsWith(ep));

  const shouldRequireAuth = requireAuth || isProtectedEndpoint;
  const fullUrl = `${API_URL}${apiEndpoint}`;
  console.log(`Making ${method} request to:`, fullUrl);

  try {
    const headers = await getCommonHeaders(shouldRequireAuth);
    console.log('Request headers:', headers);

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: shouldRequireAuth ? 'include' : 'omit',
      mode: 'cors',
    });

    console.log('Response status:', response.status);
    // Log headers in a TypeScript-safe way
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    console.log('Response headers:', responseHeaders);

    return await handleApiResponse<T>(response);
  } catch (error) {
    console.error('API call error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown API error',
      500
    );
  }
}

// Public endpoints (no auth required)
export async function fetchClauses(): Promise<ApiResponse<Clause[]>> {
  try {
    return await apiCall<ApiResponse<Clause[]>>('/api/clauses');
  } catch (error) {
    console.error('Error fetching clauses:', error);
    throw error;
  }
}

export async function getClausesByFamily(family: ClauseFamily): Promise<ApiResponse<Clause[]>> {
  try {
    return await apiCall<ApiResponse<Clause[]>>(`/api/clauses/family/${family}`);
  } catch (error) {
    console.error(`Error fetching clauses for family ${family}:`, error);
    throw error;
  }
}

export async function getClauseFamilies(): Promise<ApiResponse<ClauseFamilyGroup[]>> {
  try {
    return await apiCall<ApiResponse<ClauseFamilyGroup[]>>('/api/families');
  } catch (error) {
    console.error('Error fetching clause families:', error);
    throw error;
  }
}

export async function getClauseById(id: string): Promise<ApiResponse<Clause>> {
  try {
    return await apiCall<ApiResponse<Clause>>(`/api/clauses/${id}`);
  } catch (error) {
    console.error(`Error fetching clause ${id}:`, error);
    throw error;
  }
}

export async function searchClauses(query: string): Promise<ApiResponse<Clause[]>> {
  try {
    return await apiCall<ApiResponse<Clause[]>>(`/api/clauses/search?q=${encodeURIComponent(query)}`);
  } catch (error) {
    console.error('Error searching clauses:', error);
    throw error;
  }
}

// Protected endpoints (auth required)
export async function bookmarkClause(clauseId: string): Promise<ApiResponse<void>> {
  try {
    return await apiCall<ApiResponse<void>>(`/api/clauses/${clauseId}/bookmark`, {
      method: 'POST',
      requireAuth: false
    });
  } catch (error) {
    console.error(`Error bookmarking clause ${clauseId}:`, error);
    throw error;
  }
}

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