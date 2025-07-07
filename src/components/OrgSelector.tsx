import React, { useState } from 'react';
import { MenuItem, Select, FormControl, Tooltip, Box } from '@mui/material';
import { useOrg } from '../contexts/OrgContext';
import { useProject } from '../contexts/ProjectContext';
import { useURLBasedNavigation } from '../hooks/useURLBasedNavigation';

export const OrgSelector: React.FC = () => {
  const { orgs, currentOrg, setCurrentOrg } = useOrg();
  const { currentProject } = useProject();
  const { navigateTo, isURLBasedRouting } = useURLBasedNavigation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!orgs || orgs.length === 0 || !currentOrg) return null;

  const handleOrgChange = (orgId: string) => {
    const org = orgs.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      
      // If using URL-based routing, navigate to the new organization
      if (isURLBasedRouting && currentProject) {
        navigateTo('/matrix'); // Navigate to matrix page in new org
      }
    }
  };

  return (
    <Tooltip title="Switch organization">
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select
          value={currentOrg.id}
          onChange={(e) => handleOrgChange(e.target.value)}
          variant="outlined"
          displayEmpty
          inputProps={{ 'aria-label': 'organization selector' }}
          sx={{ fontWeight: 600 }}
        >
          {orgs.map(o => (
            <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Tooltip>
  );
}; 