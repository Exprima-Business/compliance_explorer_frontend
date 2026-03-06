/**
 * clauseMatching.ts
 *
 * Frontend clause-matching utility that cross-references AI-detected scan
 * results against the clauses loaded from the database (via ClauseContext).
 *
 * Uses the same normalisation logic as the backend's scanValidationService
 * so that results are consistent.
 */

import type { Clause } from '../types/clause';
import type { DetectedClause } from '../services/scanApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatchType = 'exact' | 'normalized' | 'title' | 'none';

export interface ValidatedClause extends DetectedClause {
  /** The matched clause from the database, or null if unmatched */
  dbMatch: Clause | null;
  /** How the match was found */
  matchType: MatchType;
  /** The matched clause's UUID — needed for bookmark creation */
  matchedClauseId: string | null;
}

// ---------------------------------------------------------------------------
// Normalisation (mirrors backend scanValidationService.normalizeClauseCode)
// ---------------------------------------------------------------------------

/**
 * Normalise a clause code for comparison.
 *
 * Mirrors the backend logic in scanValidationService.ts:
 *   - Uppercase
 *   - Replace dots, spaces, underscores with dashes
 *   - Remove "SP" prefix  (e.g. "NIST SP 800-171" → "NIST-800-171")
 *   - Remove "Rev" + revision numbers
 *   - Strip remaining special characters
 *   - Collapse repeated dashes and trim leading/trailing dashes
 */
export function normalizeClauseCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[.\s_]+/g, '-')         // dots / spaces / underscores → dash
    .replace(/\bSP\b-?/g, '')         // strip "SP" prefix
    .replace(/\bREV\b-?\d*/gi, '')    // strip "Rev" + optional revision number
    .replace(/[^A-Z0-9-]/g, '')       // remove anything that isn't A-Z, 0-9, dash
    .replace(/-+/g, '-')              // collapse repeated dashes
    .replace(/^-|-$/g, '');           // trim leading / trailing dashes
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * Try to find a matching clause in the database for one detected clause.
 *
 * Three-tier strategy (same order as backend):
 *   1. Exact clauseCode match
 *   2. Normalised code match
 *   3. Case-insensitive title substring match
 */
export function matchClauseToDatabase(
  detected: DetectedClause,
  dbClauses: Clause[],
): { clause: Clause | null; matchType: MatchType } {
  // Tier 1 — exact clauseCode
  const exact = dbClauses.find(c => c.clauseCode === detected.clauseId);
  if (exact) return { clause: exact, matchType: 'exact' };

  // Tier 2 — normalised code
  const normalizedDetected = normalizeClauseCode(detected.clauseId);
  if (normalizedDetected) {
    const normMatch = dbClauses.find(
      c => normalizeClauseCode(c.clauseCode) === normalizedDetected,
    );
    if (normMatch) return { clause: normMatch, matchType: 'normalized' };
  }

  // Tier 3 — title match (both directions: detected title in DB title OR DB title in detected title)
  if (detected.title) {
    const detectedLower = detected.title.toLowerCase().trim();
    const titleMatch = dbClauses.find(c => {
      const dbLower = c.title.toLowerCase().trim();
      return dbLower.includes(detectedLower) || detectedLower.includes(dbLower);
    });
    if (titleMatch) return { clause: titleMatch, matchType: 'title' };
  }

  return { clause: null, matchType: 'none' };
}

// ---------------------------------------------------------------------------
// Batch validation
// ---------------------------------------------------------------------------

/**
 * Validate all detected clauses against the database clause list.
 *
 * Returns an enriched array of `ValidatedClause` objects that include
 * match status, the matched DB clause (if any), and the matched UUID.
 */
export function validateDetectedClauses(
  detectedClauses: DetectedClause[],
  dbClauses: Clause[],
): ValidatedClause[] {
  return detectedClauses.map(detected => {
    const { clause, matchType } = matchClauseToDatabase(detected, dbClauses);
    return {
      ...detected,
      dbMatch: clause,
      matchType,
      matchedClauseId: clause?.id ?? null,
    };
  });
}
