import type { Clause, ClauseFamily } from '../types/clause';
import environment from '../config/environment';

// Helper function to handle API responses
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || response.statusText;
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      data: errorData,
      url: response.url
    });
    throw new Error(errorMessage);
  }
  return response.json();
}

// API functions
export async function fetchClauses(): Promise<Clause[]> {
  try {
    const response = await fetch(`${environment.api.url}/api/clauses`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    return handleApiResponse<Clause[]>(response);
  } catch (error) {
    console.error('Error fetching clauses:', error);
    throw error;
  }
}

export async function getClausesByFamily(familyName: string): Promise<Clause[]> {
  try {
    const response = await fetch(`${environment.api.url}/api/clauses/family/${encodeURIComponent(familyName)}`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    return handleApiResponse<Clause[]>(response);
  } catch (error) {
    console.error('Error fetching clauses by family:', error);
    throw error;
  }
}

export async function getClauseFamilies(): Promise<ClauseFamily[]> {
  try {
    const response = await fetch(`${environment.api.url}/api/clauses/families`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    return handleApiResponse<ClauseFamily[]>(response);
  } catch (error) {
    console.error('Error fetching clause families:', error);
    throw error;
  }
} 