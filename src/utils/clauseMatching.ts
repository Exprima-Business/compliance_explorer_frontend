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
 * Mirrors the backend logic in scanValidationService.ts (keep in sync):
 *   - Uppercase
 *   - Replace dots, spaces, underscores with dashes
 *   - Remove redundant "NIST" before FIPS ("NIST FIPS 140-2" → "FIPS 140-2")
 *   - Remove "SP" prefix  (e.g. "NIST SP 800-171" → "NIST-800-171")
 *   - Remove "Rev"/"Revision" + revision numbers
 *   - Strip remaining special characters
 *   - Collapse repeated dashes and trim leading/trailing dashes
 */
export function normalizeClauseCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[.\s_]+/g, '-')             // dots / spaces / underscores → dash
    .replace(/\bNIST-(?=FIPS)/g, '')      // drop redundant "NIST" before FIPS (FIPS are NIST pubs)
    .replace(/\bSP\b-?/g, '')             // strip "SP" prefix
    .replace(/\bREV(?:ISION)?\b-?\d*/gi, '') // strip "Rev"/"Revision" + optional revision number
    .replace(/[^A-Z0-9-]/g, '')           // remove anything that isn't A-Z, 0-9, dash
    .replace(/-+/g, '-')                  // collapse repeated dashes
    .replace(/^-|-$/g, '');               // trim leading / trailing dashes
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

  // Tier 3 — title match. Require SUBSTANTIAL overlap, not a trivial substring.
  // A bare bidirectional `includes` over-matched (e.g. "Security" inside "House
  // Information Security Policy 15" counted as a match), making the scanner
  // report far more matches than the authoritative backend evaluation. Demand
  // that the shorter title be >=60% the length of the longer — i.e. the two are
  // substantially the same title — mirroring the backend's high-similarity
  // fuzzy threshold so the preview stops over-reporting "Matched by title".
  if (detected.title) {
    const detectedLower = detected.title.toLowerCase().trim();
    if (detectedLower.length >= 6) {
      const titleMatch = dbClauses.find(c => {
        const dbLower = c.title.toLowerCase().trim();
        if (!dbLower) return false;
        if (!(dbLower.includes(detectedLower) || detectedLower.includes(dbLower))) return false;
        const shorter = Math.min(dbLower.length, detectedLower.length);
        const longer = Math.max(dbLower.length, detectedLower.length);
        return longer > 0 && shorter / longer >= 0.6;
      });
      if (titleMatch) return { clause: titleMatch, matchType: 'title' };
    }
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
