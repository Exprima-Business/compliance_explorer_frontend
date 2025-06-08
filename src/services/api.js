var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import environment from '../config/environment';
import { supabase } from '../lib/supabase';

// Custom error class for API errors
class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Helper function to handle API responses
async function handleApiResponse(response) {
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
async function getAuthToken() {
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
async function getCommonHeaders() {
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
async function apiCall(fetchFn) {
  try {
    return await fetchFn();
  } catch (error) {
    if (error instanceof ApiError) {
      // If it's already an ApiError, just rethrow it
      throw error;
    }
    
    // Handle network errors
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new ApiError('Network error. Please check your connection.', 0);
    }
    
    // Handle other errors
    console.error('API call failed:', error);
    throw new ApiError('An unexpected error occurred', 500);
  }
}

// API functions
export async function fetchClauses() {
  return apiCall(async () => {
    const headers = await getCommonHeaders();
    const response = await fetch(`${environment.api.url}/api/clauses`, {
      credentials: 'include',
      headers
    });
    return handleApiResponse(response);
  });
}

export async function getClausesByFamily(familyName) {
  return apiCall(async () => {
    const headers = await getCommonHeaders();
    const response = await fetch(
      `${environment.api.url}/api/clauses/family/${encodeURIComponent(familyName)}`,
      {
        credentials: 'include',
        headers
      }
    );
    return handleApiResponse(response);
  });
}

export async function getClauseFamilies() {
  return apiCall(async () => {
    const headers = await getCommonHeaders();
    const response = await fetch(`${environment.api.url}/api/clauses/families`, {
      credentials: 'include',
      headers
    });
    return handleApiResponse(response);
  });
}

export async function bookmarkClause(clauseId) {
  return apiCall(async () => {
    const headers = await getCommonHeaders();
    const response = await fetch(`${environment.api.url}/api/clauses/${clauseId}/bookmark`, {
      method: 'POST',
      credentials: 'include',
      headers
    });
    return handleApiResponse(response);
  });
}
