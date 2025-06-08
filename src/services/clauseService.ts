import { supabase } from '../lib/supabase';
import type { Clause, ClauseFamily, ClauseFamilyGroup, ApiResponse, ClauseFamilyData } from '../types/clause';
import environment from '../config/environment';
import { apiCall } from './api';

const API_URL = environment.api.url;

interface DatabaseClause {
  id: string;
  title: string;
  description: string;
  intent: string;
  status: string;
  category: string;
  family: { name: string };
  conditions: string;
  implementation_guidance: string;
  assessment_method: string;
  risk_classification: string;
  reference_url: string;
  metadata: {
    penalties: string;
    reciprocity: string;
    last_updated: string;
  };
}

interface Relationship {
  clause_id: string;
  related_clause_id: string;
  relationship_type: string;
}

// Fetch all clauses from the API
export async function getAllClauses(): Promise<Clause[]> {
  try {
    const response = await fetch(`${API_URL}/clauses`);
    const data: ApiResponse<Clause[]> = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching all clauses:', error);
    throw error;
  }
}

export async function getClausesByFamily(family: ClauseFamily): Promise<Clause[]> {
  try {
    const response = await fetch(`${API_URL}/clauses/family/${family}`);
    const data: ApiResponse<Clause[]> = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Error fetching clauses for family ${family}:`, error);
    throw error;
  }
}

export async function getClauseFamilies(): Promise<ClauseFamilyGroup[]> {
  try {
    const response = await fetch(`${API_URL}/clauses/families`);
    const data: ApiResponse<ClauseFamilyGroup[]> = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching clause families:', error);
    throw error;
  }
}

export async function bookmarkClause(clauseId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    const response = await fetch(`${API_URL}/clauses/${clauseId}/bookmark`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to bookmark clause');
    }
  } catch (error) {
    console.error('Error bookmarking clause:', error);
    throw error;
  }
}

export async function getClauseById(id: string): Promise<Clause> {
  try {
    const response = await fetch(`${API_URL}/clauses/${id}`);
    const data: ApiResponse<Clause> = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Error fetching clause ${id}:`, error);
    throw error;
  }
}

export async function searchClauses(query: string): Promise<Clause[]> {
  try {
    const response = await fetch(`${API_URL}/clauses/search?q=${encodeURIComponent(query)}`);
    const data: ApiResponse<Clause[]> = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error searching clauses:', error);
    throw error;
  }
}

export const getRelatedClauses = async (clauseId: string): Promise<Clause[]> => {
  const clauses = await getAllClauses();
  const clause = clauses.find(c => c.id === clauseId);
  if (!clause) return [];

  const relatedIds = [
    clause.parentClause,
    ...(clause.siblings || [])
  ].filter(Boolean);

  return clauses.filter(c => relatedIds.includes(c.id));
};

export const clauseService = {
  async getAllClauses(): Promise<Clause[]> {
    const response = await apiCall<Clause[]>('/clauses', { requireAuth: false });
    return response;
  },

  async getClausesByFamily(family: ClauseFamily): Promise<Clause[]> {
    const response = await apiCall<Clause[]>(`/clauses/family/${family}`, { requireAuth: false });
    return response;
  },

  async getClauseFamilies(): Promise<ClauseFamilyGroup[]> {
    const response = await apiCall<ClauseFamilyGroup[]>('/clauses/families', { requireAuth: false });
    return response;
  },

  async bookmarkClause(clauseId: string): Promise<void> {
    await apiCall(`/clauses/${clauseId}/bookmark`, {
      method: 'POST',
      requireAuth: true
    });
  },

  async getClauseById(clauseId: string): Promise<Clause> {
    const response = await apiCall<Clause>(`/clauses/${clauseId}`, { requireAuth: false });
    return response;
  },

  async searchClauses(query: string): Promise<Clause[]> {
    const response = await apiCall<Clause[]>(`/clauses/search?q=${encodeURIComponent(query)}`, { requireAuth: false });
    return response;
  }
}; 