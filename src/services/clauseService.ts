import type { Clause, ClauseFamily, ClauseFamilyGroup, ApiResponse } from '../types/clause';
import { apiCall } from './api';

export const clauseService = {
  async getAllClauses(): Promise<Clause[]> {
    const response = await apiCall<Clause[]>('/clauses', { requireAuth: false });
    console.log('API Response - getAllClauses:', {
      totalClauses: response.length,
      sampleClause: response[0],
      relationships: response[0]?.relationships,
      familyInfo: response[0]?.family
    });
    return response;
  },

  async getClausesByFamily(family: ClauseFamily): Promise<Clause[]> {
    const response = await apiCall<Clause[]>(`/clauses/family/${family}`, { requireAuth: false });
    console.log('API Response - getClausesByFamily:', {
      requestedFamily: family,
      totalClauses: response.length,
      sampleClause: response[0],
      relationships: response[0]?.relationships,
      familyInfo: response[0]?.family
    });
    return response;
  },

  async getClauseFamilies(): Promise<ClauseFamilyGroup[]> {
    const response = await apiCall<ClauseFamilyGroup[]>('/clauses/families', { requireAuth: false });
    console.log('API Response - getClauseFamilies:', {
      totalFamilies: response.length,
      families: response.map(f => f.family)
    });
    return response;
  },

  async bookmarkClause(clauseId: string): Promise<void> {
    await apiCall(`/clauses/${clauseId}/bookmark`, {
      method: 'POST',
      requireAuth: false
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