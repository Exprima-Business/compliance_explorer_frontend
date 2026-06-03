import { apiCall } from './api';
import type { ApiResponse } from '../types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror the BE shape from
// Compliance_Explorer_Backend/src/services/notificationService.ts
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'poam_ready_for_closure'
  | 'poam_scheduled_completion_passed'
  | 'poam_overdue'
  | 'obligation_due_soon'
  | 'obligation_overdue';

export type NotificationStatus = 'unread' | 'read' | 'dismissed';

export type NotificationResourceType = 'poam_item' | 'obligation_instance';

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  notification_type: NotificationType;
  title: string;
  body: string | null;
  resource_type: NotificationResourceType;
  resource_id: string;
  status: NotificationStatus;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

export interface NotificationListResult {
  items: Notification[];
  total: number;
  unread: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client copy: same human-readable copy the BE uses, but rendered FE-side so
// the dropdown / inbox doesn't need to ship a separate copy table. Keep this
// in sync with notificationService.NotificationType.
// ─────────────────────────────────────────────────────────────────────────────

export function notificationKindLabel(t: NotificationType): string {
  switch (t) {
    case 'poam_ready_for_closure':
      return 'POA&M';
    case 'poam_scheduled_completion_passed':
      return 'POA&M';
    case 'poam_overdue':
      return 'POA&M';
    case 'obligation_due_soon':
      return 'Obligation';
    case 'obligation_overdue':
      return 'Obligation';
  }
}

// Click-through path. POA&Ms go to /poam (the inbox lists every POA&M);
// obligations go to /obligations. A future iteration can deep-link to a
// drawer-open URL once those pages support it.
export function notificationClickTarget(n: Notification): string {
  if (n.resource_type === 'poam_item') {
    return `/poam?focus=${n.resource_id}`;
  }
  return `/obligations?focus=${n.resource_id}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints
// ─────────────────────────────────────────────────────────────────────────────

export async function listNotifications(params: {
  status?: 'unread' | 'read' | 'dismissed' | 'all';
  limit?: number;
  offset?: number;
} = {}): Promise<ApiResponse<NotificationListResult>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const suffix = qs.toString();
  return apiCall<NotificationListResult>(
    `/api/notifications${suffix ? `?${suffix}` : ''}`,
    { requireAuth: true },
  );
}

export async function getUnreadCount(): Promise<ApiResponse<{ unread: number }>> {
  return apiCall<{ unread: number }>('/api/notifications/count', { requireAuth: true });
}

export async function markAllRead(): Promise<ApiResponse<{ updated: number }>> {
  return apiCall<{ updated: number }>('/api/notifications/read-all', {
    method: 'POST',
    requireAuth: true,
  });
}

export async function markRead(id: string): Promise<ApiResponse<{ ok: boolean }>> {
  return apiCall<{ ok: boolean }>(`/api/notifications/${id}/read`, {
    method: 'POST',
    requireAuth: true,
  });
}

export async function dismissNotification(id: string): Promise<ApiResponse<{ ok: boolean }>> {
  return apiCall<{ ok: boolean }>(`/api/notifications/${id}/dismiss`, {
    method: 'POST',
    requireAuth: true,
  });
}
