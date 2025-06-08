import { supabase } from '../lib/supabase';
import type { Clause, ClauseFamily, ClauseFamilyGroup, ApiResponse } from '../types/clause';
import environment from '../config/environment';

const API_URL = environment.api.url;

class ApiError extends Error {
  constructor(message: string, public status?: number, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(error.message || 'API request failed', response.status, error);
  }
  return response.json();
}

async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

async function getCommonHeaders(requireAuth: boolean = false): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = await getAuthToken();
    if (!token) {
      throw new ApiError('No active session found');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = false
): Promise<T> {
  try {
    const headers = await getCommonHeaders(requireAuth);
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    return handleApiResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error occurred');
  }
}

// Public endpoints (no auth required)
export async function fetchClauses(): Promise<ApiResponse<Clause[]>> {
  return apiCall<ApiResponse<Clause[]>>('/clauses');
}

export async function getClausesByFamily(family: ClauseFamily): Promise<ApiResponse<Clause[]>> {
  return apiCall<ApiResponse<Clause[]>>(`/clauses/family/${family}`);
}

export async function getClauseFamilies(): Promise<ApiResponse<ClauseFamilyGroup[]>> {
  return apiCall<ApiResponse<ClauseFamilyGroup[]>>('/clauses/families');
}

export async function getClauseById(id: string): Promise<ApiResponse<Clause>> {
  return apiCall<ApiResponse<Clause>>(`/clauses/${id}`);
}

export async function searchClauses(query: string): Promise<ApiResponse<Clause[]>> {
  return apiCall<ApiResponse<Clause[]>>(`/clauses/search?q=${encodeURIComponent(query)}`);
}

// Protected endpoints (auth required)
export async function bookmarkClause(clauseId: string): Promise<ApiResponse<void>> {
  return apiCall<ApiResponse<void>>(
    `/clauses/${clauseId}/bookmark`,
    { method: 'POST' },
    true
  );
}

export async function uploadDocument(file: File): Promise<ApiResponse<any>> {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiCall<ApiResponse<any>>(
    '/documents/upload',
    {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let the browser set it with the boundary
      },
    },
    true
  );
}

export async function analyzeDocument(documentId: string): Promise<ApiResponse<any>> {
  return apiCall<ApiResponse<any>>(
    `/documents/${documentId}/analyze`,
    { method: 'POST' },
    true
  );
} 