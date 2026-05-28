import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { keys } from '../queryClient';
import {
  fetchCandidates,
  acceptCandidate,
  rejectCandidate,
  parkCandidate,
  type CandidateStatus,
  type RelationshipType,
} from '../services/regulatoryReviewService';

/**
 * React Query example pattern for ClauseAtlas — the regulatory graph review
 * queue. This is the reference implementation for converting other pages
 * (Dashboard, Matrix, Controls) to React Query in subsequent commits.
 *
 * Three pieces every conversion needs:
 *
 *   1. A useXxx() hook that wraps useQuery with a typed queryKey (from
 *      keys.* in queryClient.ts so invalidation can target it precisely).
 *
 *   2. A useXxxMutation hook for each write path that invalidates the
 *      relevant cache keys on success. This is the "real-time" UX —
 *      the next read shows fresh state without any manual refresh.
 *
 *   3. Component code that consumes { data, isLoading, error } from the
 *      hook. No useEffect + setState plumbing.
 *
 * After conversion, components do less work, cache is shared across
 * routes (back-nav feels instant), and mutations propagate state changes
 * without explicit refetches.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Read hook
// ─────────────────────────────────────────────────────────────────────────────

export function useCandidates(status: CandidateStatus = 'pending') {
  return useQuery({
    queryKey: keys.candidates(status),
    queryFn: async () => {
      const resp = await fetchCandidates({ status, limit: 50 });
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to load candidates');
      }
      return resp.data;
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation hooks — each invalidates the candidate-list cache on success
//
// Note: we invalidate ALL candidate statuses (not just the one we're in),
// because an accept moves a candidate from 'pending' to 'accepted' — both
// status lists are affected.
// ─────────────────────────────────────────────────────────────────────────────

function useInvalidateCandidates() {
  const qc = useQueryClient();
  return () => {
    // Invalidate every candidate list regardless of status filter
    qc.invalidateQueries({ queryKey: ['regulatory-review', 'candidates'] });
  };
}

export function useAcceptCandidate() {
  const invalidate = useInvalidateCandidates();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      relationship_type?: RelationshipType;
      source_authority_for_link?: string;
      description?: string;
      reviewer_notes?: string;
    }) => {
      const { id, ...params } = input;
      const resp = await acceptCandidate(id, params);
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to accept candidate');
      }
      return resp.data;
    },
    onSuccess: invalidate,
  });
}

export function useRejectCandidate() {
  const invalidate = useInvalidateCandidates();
  return useMutation({
    mutationFn: async (input: { id: string; reviewer_notes: string }) => {
      const resp = await rejectCandidate(input.id, input.reviewer_notes);
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to reject candidate');
      }
      return resp.data;
    },
    onSuccess: invalidate,
  });
}

export function useParkCandidate() {
  const invalidate = useInvalidateCandidates();
  return useMutation({
    mutationFn: async (input: { id: string; reviewer_notes: string }) => {
      const resp = await parkCandidate(input.id, input.reviewer_notes);
      if (!resp.data) {
        const msg = typeof resp.error === 'string' ? resp.error : resp.error?.message;
        throw new Error(msg || 'Failed to park candidate');
      }
      return resp.data;
    },
    onSuccess: invalidate,
  });
}
