import { apiCall } from './api';

export interface ActivityItem {
  action: string;
  resourceType: string | null;
  notes: string | null;
  createdAt: string;
}

/** Recent org activity for the dashboard feed (audit-log summary). */
export const activityService = {
  recent: async (): Promise<ActivityItem[]> => {
    const res = await apiCall<ActivityItem[]>('/api/activity/recent', { requireAuth: true });
    return res.data ?? [];
  },
};
