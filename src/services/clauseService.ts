import type { Clause, ClauseData, ClauseFamily } from '../types/clause';
import { fetchClauses as apiFetchClauses, getClausesByFamily as apiGetClausesByFamily, getClauseFamilies as apiGetClauseFamilies } from './api';

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
export const fetchClauses = async (): Promise<Clause[]> => {
  try {
    console.log('Fetching clauses from API...');
    const clauses = await apiFetchClauses();
    console.log('Clauses fetched:', clauses.length, 'clauses');
    return clauses;
  } catch (error) {
    console.error('Error loading clauses:', error);
    throw error;
  }
};

export const searchClauses = async (query: string): Promise<Clause[]> => {
  const clauses = await fetchClauses();
  if (!query) return clauses;
  
  const searchTerm = query.toLowerCase();
  return clauses.filter(clause => 
    clause.id.toLowerCase().includes(searchTerm) ||
    clause.title.toLowerCase().includes(searchTerm) ||
    clause.description.toLowerCase().includes(searchTerm)
  );
};

export const getClauseById = async (clauseId: string): Promise<Clause | undefined> => {
  const clauses = await fetchClauses();
  return clauses.find(clause => clause.id === clauseId);
};

export const getRelatedClauses = async (clauseId: string): Promise<Clause[]> => {
  const clauses = await fetchClauses();
  const clause = clauses.find(c => c.id === clauseId);
  if (!clause) return [];

  const relatedIds = [
    clause.parentClause,
    ...clause.siblings
  ].filter(Boolean);

  return clauses.filter(c => relatedIds.includes(c.id));
};

export const getClausesByFamily = async (family: string): Promise<Clause[]> => {
  try {
    console.log('Fetching clauses for family:', family);
    const clauses = await apiGetClausesByFamily(family);
    console.log('Clauses fetched for family:', clauses.length, 'clauses');
    return clauses;
  } catch (error) {
    console.error('Error loading clauses by family:', error);
    throw error;
  }
};

export const getClauseFamilies = async (): Promise<ClauseFamily[]> => {
  try {
    console.log('Fetching clause families...');
    const families = await apiGetClauseFamilies();
    console.log('Families fetched:', families.length, 'families');
    return families;
  } catch (error) {
    console.error('Error loading clause families:', error);
    throw error;
  }
}; 