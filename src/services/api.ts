import { supabase } from '../lib/supabase';
import type { Clause, ClauseFamily, ClauseFamilyGroup, ApiResponse } from '../types/clause';
import environment from '../config/environment';

const API_URL = environment.api.url;

const publicEndpoints = [
  '/clauses',
  '/clauses/families',
  '/clauses/search',
  '/clauses/family'
];

const protectedEndpoints = [
  '/clauses/bookmark',
  '/documents'
];

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
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function getCommonHeaders(requireAuth: boolean = false): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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

  const isPublicEndpoint = publicEndpoints.some(ep => endpoint.startsWith(ep));
  const isProtectedEndpoint = protectedEndpoints.some(ep => endpoint.startsWith(ep));

  const shouldRequireAuth = requireAuth || isProtectedEndpoint;
  const headers = getCommonHeaders(shouldRequireAuth);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
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
  return apiCall<ApiResponse<void>>(`/clauses/${clauseId}/bookmark`, {
    method: 'POST',
    requireAuth: true
  });
}

export async function uploadDocument(file: File): Promise<ApiResponse<any>> {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiCall<ApiResponse<any>>('/documents/upload', {
    method: 'POST',
    body: formData,
    requireAuth: true
  });
}

export async function analyzeDocument(documentId: string): Promise<ApiResponse<any>> {
  return apiCall<ApiResponse<any>>(`/documents/${documentId}/analyze`, {
    method: 'POST',
    requireAuth: true
  });
} 