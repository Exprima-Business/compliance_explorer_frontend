import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Alert, 
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider
} from '@mui/material';
import { useOrg } from '../contexts/OrgContext';
import { dlog } from '../utils/debugLog';

interface OrgSelectionFlowProps {
  onOrganizationSelected?: () => void;
}

export const OrgSelectionFlow: React.FC<OrgSelectionFlowProps> = ({ 
  onOrganizationSelected 
}) => {
  const { orgs, setCurrentOrg, initialized } = useOrg();
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOrgSelection = async (org: { id: string; name: string; slug: string }) => {
    setSelecting(true);
    setError(null);
    
    try {
      dlog('User selecting organization:', { orgId: org.id, orgName: org.name });
      
      await setCurrentOrg(org);
      
      dlog('Organization selection successful:', { orgId: org.id, orgName: org.name });
      
      // Notify parent component
      if (onOrganizationSelected) {
        onOrganizationSelected();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to select organization';
      setError(errorMessage);
      dlog('Organization selection failed:', { error: errorMessage });
    } finally {
      setSelecting(false);
    }
  };

  if (!initialized) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!orgs || orgs.length === 0) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="400px"
      >
        <Card sx={{ maxWidth: 400, width: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              No Organizations Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You don't have access to any organizations. Please contact your administrator.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="400px"
      p={2}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom align="center">
            Select Your Organization
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Please select an organization to continue using the application.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <List>
            {orgs.map((org, index) => (
              <React.Fragment key={org.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleOrgSelection(org)}
                    disabled={selecting}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': {
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText'
                      }
                    }}
                  >
                    <ListItemText
                      primary={org.name}
                      secondary={org.slug}
                      primaryTypographyProps={{
                        fontWeight: 600
                      }}
                    />
                    {selecting && <CircularProgress size={20} />}
                  </ListItemButton>
                </ListItem>
                {index < orgs.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {selecting && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Typography variant="body2" color="text.secondary">
                Updating authentication context...
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}; 