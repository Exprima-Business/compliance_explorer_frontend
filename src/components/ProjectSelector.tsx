import React from 'react';
import { MenuItem, Select, FormControl, Tooltip, Box, ListItemIcon } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useProject } from '../contexts/ProjectContext';
import NewProjectDialog from './NewProjectDialog';

const ProjectSelector: React.FC = () => {
  const { projects, currentProject, setCurrentProject } = useProject();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  if (!projects || projects.length === 0 || !currentProject) return null;

  return (
    <>
      <Tooltip title="Switch project">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={currentProject.id}
            onChange={(e) => {
              if (e.target.value === '__new__') {
                setDialogOpen(true);
              } else {
                const proj = projects.find(p => p.id === e.target.value);
                if (proj) setCurrentProject(proj);
              }
            }}
            variant="outlined"
            inputProps={{ 'aria-label': 'project selector' }}
            sx={{ fontWeight: 600 }}
          >
            {projects.map(p => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
            <MenuItem value="__new__">
              <ListItemIcon>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              New project…
            </MenuItem>
          </Select>
        </FormControl>
      </Tooltip>
      {dialogOpen && <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />}
    </>
  );
};

export default ProjectSelector; 