import React from 'react';
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  ReportProblem as OverdueIcon,
  Schedule as DueSoonIcon,
  CheckCircleOutline as ReadyIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  notificationClickTarget,
  type Notification,
  type NotificationType,
} from '../services/notificationsService';
import { keys } from '../queryClient';

/**
 * NotificationBell — AppBar bell with unread badge + dropdown of the
 * 8 most-recent unread items.
 *
 * Polling: the unread count refetches every 60s and on window focus
 * (overriding the queryClient default refetchOnWindowFocus=false for
 * this single query — the bell is the one spot in the app where
 * focus-driven freshness is worth the noise).
 *
 * The dropdown itself lazy-fetches the full list when the user actually
 * opens it — no point holding eight rows in memory between focuses.
 */

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  poam_ready_for_closure: <ReadyIcon fontSize="small" color="success" />,
  poam_scheduled_completion_passed: <DueSoonIcon fontSize="small" color="warning" />,
  poam_overdue: <OverdueIcon fontSize="small" color="error" />,
  obligation_due_soon: <DueSoonIcon fontSize="small" color="warning" />,
  obligation_overdue: <OverdueIcon fontSize="small" color="error" />,
};

const TYPE_CHIP_COLOR: Record<NotificationType, 'success' | 'warning' | 'error' | 'info'> = {
  poam_ready_for_closure: 'success',
  poam_scheduled_completion_passed: 'warning',
  poam_overdue: 'error',
  obligation_due_soon: 'warning',
  obligation_overdue: 'error',
};

function relativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diffMs = Date.now() - ts;
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const NotificationBell: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Unread count — polls 60s + on focus. Defaults at the queryClient level
  // suppress focus refetch globally; we opt in here.
  const countQ = useQuery({
    queryKey: keys.notificationsCount(),
    queryFn: async () => {
      const res = await getUnreadCount();
      if (!res.data) return { unread: 0 };
      return res.data;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  // Inbox — lazy, only enabled when dropdown is open.
  const listQ = useQuery({
    queryKey: keys.notifications('unread'),
    queryFn: async () => {
      const res = await listNotifications({ status: 'unread', limit: 8 });
      if (!res.data) return { items: [], total: 0, unread: 0 };
      return res.data;
    },
    enabled: open,
    staleTime: 15_000,
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.notificationsCount() });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  const markAllReadMut = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.notificationsCount() });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unread = countQ.data?.unread ?? 0;
  const items = listQ.data?.items ?? [];

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleItemClick = (n: Notification) => {
    // Mark read first, then navigate. Fire-and-forget on the mutation —
    // the optimistic state is "the user clearly saw it."
    markReadMut.mutate(n.id);
    handleClose();
    navigate(notificationClickTarget(n));
  };

  return (
    <>
      <Tooltip title={unread > 0 ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'Notifications'}>
        <IconButton color="inherit" onClick={handleOpen} aria-label="Notifications">
          <Badge badgeContent={unread} color="error" max={99}>
            {unread > 0 ? <NotificationsActiveIcon /> : <NotificationsIcon />}
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 520,
            overflow: 'hidden',
          },
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          {unread > 0 && (
            <Button
              size="small"
              onClick={() => markAllReadMut.mutate()}
              disabled={markAllReadMut.isPending}
              sx={{ textTransform: 'none' }}
            >
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {listQ.isLoading && (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary">Loading…</Typography>
            </Box>
          )}
          {!listQ.isLoading && items.length === 0 && (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                You&apos;re all caught up.
              </Typography>
            </Box>
          )}
          {items.map((n) => (
            <MenuItem
              key={n.id}
              onClick={() => handleItemClick(n)}
              sx={{
                alignItems: 'flex-start',
                py: 1.25,
                whiteSpace: 'normal',
                gap: 1,
              }}
            >
              <Box sx={{ pt: 0.5 }}>{TYPE_ICON[n.notification_type]}</Box>
              <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }} noWrap>
                    {n.title}
                  </Typography>
                  <Chip
                    label={n.notification_type === 'poam_ready_for_closure'
                      ? 'Ready'
                      : n.notification_type.includes('overdue')
                      ? 'Overdue'
                      : 'Due soon'}
                    size="small"
                    color={TYPE_CHIP_COLOR[n.notification_type]}
                    sx={{ height: 18, fontSize: 11 }}
                  />
                </Box>
                {n.body && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                    {n.body}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {relativeTime(n.created_at)}
                </Typography>
              </Stack>
            </MenuItem>
          ))}
        </Box>
        <Divider />
        <Box sx={{ px: 2, py: 1 }}>
          <Button
            fullWidth
            size="small"
            onClick={() => {
              handleClose();
              navigate('/notifications');
            }}
            sx={{ textTransform: 'none' }}
          >
            View all
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBell;
