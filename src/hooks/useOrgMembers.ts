import { useQuery } from '@tanstack/react-query';
import { apiCall } from '../services/api';
import { useOrg } from '../contexts/OrgContext';

/** One assignable org member — mirrors the BE OrganizationMember shape. */
export interface OrgMember {
  userId: string;
  email: string | null;
  name: string | null;
  role: string | null;
}

/** Friendly label for a member: name → email → short id. */
export function memberLabel(m: OrgMember): string {
  return m.name || m.email || `${m.userId.slice(0, 8)}…`;
}

/**
 * Members of the active organization, for owner / lead assignment pickers.
 * Org comes from the authenticated context server-side; this just fetches
 * the current org's roster. Cached for a few minutes — membership is stable.
 */
export function useOrgMembers() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  return useQuery({
    queryKey: ['orgMembers', orgId],
    queryFn: async (): Promise<OrgMember[]> => {
      const res = await apiCall<unknown>('/api/organizations/members', {
        requireAuth: true,
      });
      if (res.error) {
        const msg = typeof res.error === 'string' ? res.error : res.error?.message;
        throw new Error(msg || 'Failed to load organization members');
      }
      // Tolerate both the standard { data, error } envelope (apiCall unwraps to
      // the array) and a raw { success, data } body (apiCall passes through),
      // so a non-array never reaches the .map/.find in the picker.
      const payload = res.data as OrgMember[] | { data?: OrgMember[] } | null;
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray((payload as { data?: OrgMember[] }).data)) {
        return (payload as { data: OrgMember[] }).data;
      }
      return [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000,
  });
}
