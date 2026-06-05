import React from 'react';
import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  IconButton,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TableChartIcon from '@mui/icons-material/TableChart';
import ShieldIcon from '@mui/icons-material/Shield';
import FlagIcon from '@mui/icons-material/Flag';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Navigation structure — grouped sections matching the spec
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  route: string;
  label: string;
  icon: React.ReactNode;
  /** Treat path as a prefix when matching active (e.g. /matrix matches /matrix/:id). */
  prefixMatch?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    label: 'PROGRAM',
    items: [
      { route: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, prefixMatch: false },
      { route: '/matrix', label: 'Matrix', icon: <TableChartIcon />, prefixMatch: true },
      { route: '/controls', label: 'Controls', icon: <ShieldIcon />, prefixMatch: false },
      { route: '/obligations', label: 'Obligations', icon: <AssignmentTurnedInIcon />, prefixMatch: true },
      { route: '/poam', label: 'POA&M', icon: <FlagIcon />, prefixMatch: true },
    ],
  },
  {
    label: 'INTAKE',
    items: [
      { route: '/document-scanner', label: 'Document Scanner', icon: <DocumentScannerIcon />, prefixMatch: true },
      { route: '/evaluations', label: 'Evaluations', icon: <FactCheckIcon />, prefixMatch: true },
    ],
  },
  {
    label: 'REGULATORY LIBRARY',
    items: [
      { route: '/regulations', label: 'Regulations', icon: <AccountBalanceIcon />, prefixMatch: false },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Width constants
// ─────────────────────────────────────────────────────────────────────────────

export const LEFT_NAV_EXPANDED_WIDTH = 220;
export const LEFT_NAV_COLLAPSED_WIDTH = 64;

interface LeftNavProps {
  expanded: boolean;
  onToggle: () => void;
  /** Current path — drives active-item highlighting. */
  currentPath: string;
  /** Optional: navigate via the parent's router (for URL-based routing wrapper). */
  onNavigate?: (route: string) => void;
}

export const LeftNav: React.FC<LeftNavProps> = ({ expanded, onToggle, currentPath, onNavigate }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const go = (route: string) => {
    if (onNavigate) onNavigate(route);
    else navigate(route);
  };

  const isActive = (item: NavItem) => {
    if (item.prefixMatch) {
      return currentPath === item.route || currentPath.startsWith(item.route + '/');
    }
    // Dashboard matches both "/" and "/dashboard"
    if (item.route === '/dashboard') {
      return currentPath === '/' || currentPath === '/dashboard';
    }
    return currentPath === item.route;
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.standard,
        }),
        width: expanded ? LEFT_NAV_EXPANDED_WIDTH : LEFT_NAV_COLLAPSED_WIDTH,
        overflowX: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Sections */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        {SECTIONS.map((section, sectionIdx) => (
          <React.Fragment key={section.label}>
            {expanded && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  px: 2,
                  pt: sectionIdx === 0 ? 0.5 : 1.5,
                  pb: 0.5,
                  color: 'text.secondary',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  fontSize: '0.65rem',
                }}
              >
                {section.label}
              </Typography>
            )}
            {!expanded && sectionIdx > 0 && (
              <Divider sx={{ mx: 1, my: 0.5 }} />
            )}
            <List disablePadding>
              {section.items.map((item) => {
                const active = isActive(item);
                const button = (
                  <ListItemButton
                    onClick={() => go(item.route)}
                    selected={active}
                    sx={{
                      px: expanded ? 2 : 0,
                      py: 0.75,
                      minHeight: 40,
                      justifyContent: expanded ? 'flex-start' : 'center',
                      borderRadius: 0,
                      borderLeft: '3px solid',
                      borderColor: active ? 'primary.main' : 'transparent',
                      bgcolor: active ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                        '&:hover': { bgcolor: 'action.selected' },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: expanded ? 36 : 0,
                        color: active ? 'primary.main' : 'text.secondary',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {expanded && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: active ? 600 : 500,
                          color: active ? 'primary.main' : 'text.primary',
                          noWrap: true,
                        }}
                      />
                    )}
                  </ListItemButton>
                );
                return (
                  <ListItem key={item.route} disablePadding>
                    {expanded ? button : (
                      <Tooltip title={item.label} placement="right">
                        {button}
                      </Tooltip>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </React.Fragment>
        ))}
      </Box>

      {/* Collapse toggle */}
      <Divider />
      <Box sx={{ display: 'flex', justifyContent: expanded ? 'flex-end' : 'center', p: 0.5 }}>
        <Tooltip title={expanded ? 'Collapse navigation' : 'Expand navigation'} placement="right">
          <IconButton onClick={onToggle} size="small" aria-label="Toggle navigation width">
            {expanded ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
