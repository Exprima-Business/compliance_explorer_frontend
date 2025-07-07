import React from 'react';
import { MenuItem, Select, FormControl, Tooltip, Box, ListItemIcon } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useProject } from '../contexts/ProjectContext';
import { useURLBasedNavigation } from '../hooks/useURLBasedNavigation';
import NewProjectDialog from './NewProjectDialog';

const ProjectSelector: React.FC = () => {
  const { projects, currentProject, setCurrentProject } = useProject();
  const { navigateTo, isURLBasedRouting } = useURLBasedNavigation();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  if (!projects || projects.length === 0 || !currentProject) return null;

  const handleProjectChange = (projectId: string) => {
    if (projectId === '__new__') {
      setDialogOpen(true);
    } else {
      const proj = projects.find(p => p.id === projectId);
      if (proj) {
        setCurrentProject(proj);
        
        // If using URL-based routing, navigate to the new project
        if (isURLBasedRouting) {
          navigateTo('/matrix'); // Navigate to matrix page in new project
        }
      }
    }
  };

  return (
    <>
      <Tooltip title="Switch project">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={currentProject.id}
            onChange={(e) => handleProjectChange(e.target.value)}
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