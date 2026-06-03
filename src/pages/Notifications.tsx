import React from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutline as MarkReadIcon,
  Clear as DismissIcon,
  ReportProblem as OverdueIcon,
  Schedule as DueSoonIcon,
  CheckCircleOutline as ReadyIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  listNotifications,
  markRead,
  markAllRead,
  dismissNotification,
  notificationClickTarget,
  notificationKindLabel,
  type Notification,
  type NotificationType,
} from '../services/notificationsService';
import { keys } from '../queryClient';

/**
 * /notifications — full inbox view.
 *
 * Tabs: Unread (default) / All / Dismissed.
 * Each row supports: open the resource (click body), mark read, dismiss.
 * Top-right: "Mark all read" when there are any unread.
 *
 * No client-side pagination yet — the BE caps at 200 per page and Phase 1
 * users won't see more. Add pagination once we observe an org producing >200.
 */

type TabKey = 'unread' | 'read' | 'dismissed';

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  poam_ready_for_closure: <ReadyIcon fontSize="small" color="success" />,
  poam_scheduled_completion_passed: <DueSoonIcon fontSize="small" color="warning" />,
  poam_overdue: <OverdueIcon fontSize="small" color="error" />,
  obligation_due_soon: <DueSoonIcon fontSize="small" color="warning" />,
  obligation_overdue: <OverdueIcon fontSize="small" color="error" />,
};

const TYPE_LABEL: Record<NotificationType, string> = {
  poam_ready_for_closure: 'Ready to close',
  poam_scheduled_completion_passed: 'Past scheduled completion',
  poam_overdue: 'Overdue',
  obligation_due_soon: 'Due soon',
  obligation_overdue: 'Overdue',
};

const TYPE_CHIP_COLOR: Record<NotificationType, 'success' | 'warning' | 'error' | 'info'> = {
  poam_ready_for_closure: 'success',
  poam_scheduled_completion_passed: 'warning',
  poam_overdue: 'error',
  obligation_due_soon: 'warning',
  obligation_overdue: 'error',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString();
}

const Notifications: React.FC = () => {
  const [tab, setTab] = React.useState<TabKey>('unread');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: keys.notifications(tab),
    queryFn: async () => {
      const res = await listNotifications({ status: tab, limit: 200 });
      if (!res.data) return { items: [], total: 0, unread: 0 };
      return res.data;
    },
    staleTime: 15_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: keys.notificationsCount() });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markReadMut = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: invalidate,
  });
  const dismissMut = useMutation({
    mutationFn: (id: string) => dismissNotification(id),
    onSuccess: invalidate,
  });
  const markAllReadMut = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: invalidate,
  });

  const items = listQ.data?.items ?? [];
  const unread = listQ.data?.unread ?? 0;

  const handleOpenResource = (n: Notification) => {
    // Mark read on click-through (even from the All / Dismissed tabs — the
    // user has clearly seen it).
    if (n.status === 'unread') markReadMut.mutate(n.id);
    navigate(notificationClickTarget(n));
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Notifications
        </Typography>
        {unread > 0 && tab === 'unread' && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => markAllReadMut.mutate()}
            disabled={markAllReadMut.isPending}
          >
            Mark all read
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="unread" label={`Unread${unread > 0 ? ` (${unread})` : ''}`} />
        <Tab value="read" label="Read" />
        <Tab value="dismissed" label="Dismissed" />
      </Tabs>

      <Paper variant="outlined">
        {listQ.isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!listQ.isLoading && items.length === 0 && (
          <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {tab === 'unread'
                ? "You're all caught up — no unread notifications."
                : tab === 'read'
                ? 'No read notifications.'
                : 'No dismissed notifications.'}
            </Typography>
          </Box>
        )}

        {items.map((n, idx) => (
          <React.Fragment key={n.id}>
            {idx > 0 && <Divider />}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', px: 2.5, py: 2, gap: 2 }}>
              <Box sx={{ pt: 0.75 }}>{TYPE_ICON[n.notification_type]}</Box>
              <Box
                sx={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                onClick={() => handleOpenResource(n)}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: n.status === 'unread' ? 600 : 500 }}
                  >
                    {n.title}
                  </Typography>
                  <Chip
                    label={notificationKindLabel(n.notification_type)}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: 11 }}
                  />
                  <Chip
                    label={TYPE_LABEL[n.notification_type]}
                    size="small"
                    color={TYPE_CHIP_COLOR[n.notification_type]}
                    sx={{ height: 20, fontSize: 11 }}
                  />
                </Stack>
                {n.body && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {n.body}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {formatDate(n.created_at)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Open">
                  <IconButton size="small" onClick={() => handleOpenResource(n)}>
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {n.status === 'unread' && (
                  <Tooltip title="Mark read">
                    <IconButton
                      size="small"
                      onClick={() => markReadMut.mutate(n.id)}
                      disabled={markReadMut.isPending}
                    >
                      <MarkReadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {n.status !== 'dismissed' && (
                  <Tooltip title="Dismiss">
                    <IconButton
                      size="small"
                      onClick={() => dismissMut.mutate(n.id)}
                      disabled={dismissMut.isPending}
                    >
                      <DismissIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Box>
          </React.Fragment>
        ))}
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Phase 1 inbox · POA&amp;M and compliance-obligation events · email digest coming in Phase 2.
      </Typography>
    </Container>
  );
};

export default Notifications;
