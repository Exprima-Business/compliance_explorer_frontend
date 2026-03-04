import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { OrgSelectionFlow } from './OrgSelectionFlow';
import { dlog } from '../utils/debugLog';

interface OrgSelectionWrapperProps {
  children: React.ReactNode;
}

export const OrgSelectionWrapper: React.FC<OrgSelectionWrapperProps> = ({ children }) => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { currentOrg, initialized: orgInitialized, orgs, setCurrentOrg } = useOrg();
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const navigate = useNavigate();

  // Check if user needs organization setup (JWT flag is still the fast client-side signal here)
  useEffect(() => {
    if (isAuthenticated && user?.user_metadata?.setup_required) {
      dlog('User requires organization setup', { userId: user?.id });
      setSetupRequired(true);
    }
  }, [isAuthenticated, user]);

  // Auto-assign when there is exactly one org and none is selected yet
  useEffect(() => {
    const autoAssignSingleOrg = async () => {
      if (orgs.length === 1 && !currentOrg && orgInitialized && !autoAssigning) {
        dlog('Auto-assigning single organization', { orgId: orgs[0].id, orgName: orgs[0].name });
        setAutoAssigning(true);
        try {
          await setCurrentOrg(orgs[0]);
          dlog('Auto-assignment successful');
        } catch (error) {
          dlog('Auto-assignment failed', { error });
        } finally {
          setAutoAssigning(false);
        }
      }
    };
    autoAssignSingleOrg();
  }, [orgs, currentOrg, orgInitialized, autoAssigning, setCurrentOrg]);

  // Show loading while authentication or organization context is initializing
  if (authLoading || !orgInitialized || autoAssigning) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>{autoAssigning ? 'Setting up your organization...' : 'Loading...'}</div>
      </div>
    );
  }

  // If not authenticated, don't show organization selection
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If user requires organization setup, redirect to setup page
  if (setupRequired) {
    dlog('Redirecting to organization setup', { userId: user?.id });
    navigate('/setup-organization');
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Redirecting to organization setup...</div>
      </div>
    );
  }

  // If no current organization, show selection flow
  if (!currentOrg) {
    return (
      <OrgSelectionFlow
        onOrganizationSelected={() => dlog('Organization selected')}
      />
    );
  }

  // User is authenticated and has a current organization — show the app
  return <>{children}</>;
}; 