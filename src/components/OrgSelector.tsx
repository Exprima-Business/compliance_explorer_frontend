import React, { useState } from 'react';
import { MenuItem, Select, FormControl, Tooltip, Box } from '@mui/material';
import { useOrg } from '../contexts/OrgContext';

export const OrgSelector: React.FC = () => {
  const { orgs, currentOrg, setCurrentOrg } = useOrg();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  if (!orgs || orgs.length === 0 || !currentOrg) return null;

  return (
    <Tooltip title="Switch organization">
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <Select
          value={currentOrg.id}
          onChange={(e) => {
            const org = orgs.find(o => o.id === e.target.value);
            if (org) setCurrentOrg(org);
          }}
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