import { supabase } from '../lib/supabase';
import type { ApiResponse, ApiError as ApiErrorObj } from '../types/api';
import environment from '../config/environment';
import { dlog } from '../utils/debugLog';

// API configuration
const API_URL = environment.api.url;

const ENABLE_URL_BASED_ROUTING = import.meta.env.VITE_ENABLE_URL_BASED_ROUTING === 'true';

// Get current organization and project IDs for header-based fallback
const getCurrentOrgId = (): string => {
  if (typeof window === 'undefined') return '00000000-0000-0000-0000-000000000000';
  return localStorage.getItem('orgId') || '00000000-0000-0000-0000-000000000000';
};

const getCurrentProjectId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('projectId');
};

async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

// Simplified API call that accepts context directly
export const urlBasedApiCall = async <T>(
  endpoint: string, 
  options: ApiOptions = {},
  context?: { orgSlug?: string; projectSlug?: string }
): Promise<ApiResponse<T>> => {
  const { requireAuth = false, ...fetchOptions } = options;

  try {
    // Retrieve current session token (if any)
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    // Try URL-based first if enabled and context is provided
    if (ENABLE_URL_BASED_ROUTING && context?.orgSlug && context?.projectSlug) {
      try {
        const urlBasedEndpoint = `/api/${context.orgSlug}/${context.projectSlug}${endpoint}`;
        const urlBasedHeaders = {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...fetchOptions.headers,
        };

        dlog('Trying URL-based API call:', {
          endpoint: urlBasedEndpoint,
          orgSlug: context.orgSlug,
          projectSlug: context.projectSlug
        });

        const response = await fetch(`${API_URL}${urlBasedEndpoint}`, {
          ...fetchOptions,
          headers: urlBasedHeaders,
          credentials: 'include',
        });

        if (response.ok) {
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
        }
      } catch (error) {
        console.warn('URL-based API call failed, falling back to header-based:', error);
      }
    }

    // Fallback to header-based API call
    const headerBasedHeaders = {
      'Content-Type': 'application/json',
      'x-org-id': getCurrentOrgId(),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(getCurrentProjectId() ? { 'x-project-id': getCurrentProjectId()! } : {}),
      ...fetchOptions.headers,
    };

    dlog('Using header-based API call:', {
      endpoint,
      'x-org-id': headerBasedHeaders['x-org-id'],
      'x-project-id': headerBasedHeaders['x-project-id']
    });

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers: headerBasedHeaders,
      credentials: 'include',
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