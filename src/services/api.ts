import environment from '../config/environment';
import { supabase } from '../lib/supabase';
import type { 
  Clause, 
  ClauseFamily, 
  ClauseFamilyGroup, 
  ApiResponse, 
  PaginatedResponse 
} from '../types/clause';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: any = {}
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper function to handle API responses
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || response.statusText;
    
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      // Check if we're already on the login page to prevent redirect loops
      if (!window.location.pathname.includes('/login')) {
        // Clear any existing session
        await supabase.auth.signOut();
        // Redirect to login with return URL
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
      }
      throw new ApiError('Authentication required. Please log in.', response.status, errorData);
    }

    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      data: errorData,
      url: response.url
    });
    
    throw new ApiError(errorMessage, response.status, errorData);
  }
  return response.json();
}

// Get auth token from Supabase session
async function getAuthToken(): Promise<string> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      throw new ApiError('Failed to get authentication session', 401);
    }
    
    if (!session) {
      throw new ApiError('No active session found', 401);
    }
    
    return session.access_token;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Authentication failed', 401);
  }
}

// Common headers for all API requests
async function getCommonHeaders(): Promise<HeadersInit> {
  try {
    const token = await getAuthToken();
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${token}`
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    throw error;
  }
}

// Wrapper for API calls to handle auth errors
async function apiCall<T>(fetchFn: () => Promise<T>): Promise<T> {
  try {
    return await fetchFn();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiError('Network error. Please check your connection.', 0);
    }
    
    // Handle other errors
    console.error('API call failed:', error);
    throw new ApiError('An unexpected error occurred', 500);
  }
}

// API functions
export async function fetchClauses(): Promise<ApiResponse<Clause[]>> {
  return apiCall(async () => {
    const headers = await getCommonHeaders();
    const response = await fetch(`${environment.api.url}/api/clauses`, {
      credentials: 'include',
      headers
    });
    return handleApiResponse<ApiResponse<Clause[]>>(response);
  });
}

export async function getClausesByFamily(familyName: ClauseFamily): Promise<ApiResponse<Clause[]>> {
  return apiCall(async () => {
    const headers = await getCommonHeaders();
    const response = await fetch(
      `${environment.api.url}/api/clauses/family/${encodeURIComponent(familyName)}`,
      {
        credentials: 'include',
        headers
      }
    );
    return handleApiResponse<ApiResponse<Clause[]>>(response);
  });
}

export async function getClauseFamilies(): Promise<ApiResponse<ClauseFamilyGroup[]>> {
  return apiCall(async () => {
    const headers = await getCommonHeaders();
    const response = await fetch(`${environment.api.url}/api/clauses/families`, {
      credentials: 'include',
      headers
    });
    return handleApiResponse<ApiResponse<ClauseFamilyGroup[]>>(response);
  });
}

export async function bookmarkClause(clauseId: string): Promise<ApiResponse<Clause>> {
  return apiCall(async () => {
    const headers = await getCommonHeaders();
    const response = await fetch(`${environment.api.url}/api/clauses/${clauseId}/bookmark`, {
      method: 'POST',
      credentials: 'include',
      headers
    });
    return handleApiResponse<ApiResponse<Clause>>(response);
  });
}

export async function getClauseById(clauseId: string): Promise<ApiResponse<Clause>> {
  return apiCall(async () => {
    const headers = await getCommonHeaders();
    const response = await fetch(`${environment.api.url}/api/clauses/${clauseId}`, {
      credentials: 'include',
      headers
    });
    return handleApiResponse<ApiResponse<Clause>>(response);
  });
}

export async function searchClauses(query: string): Promise<ApiResponse<PaginatedResponse<Clause>>> {
  return apiCall(async () => {
    const headers = await getCommonHeaders();
    const response = await fetch(
      `${environment.api.url}/api/clauses/search?q=${encodeURIComponent(query)}`,
      {
        credentials: 'include',
        headers
      }
    );
    return handleApiResponse<ApiResponse<PaginatedResponse<Clause>>>(response);
  });
} 