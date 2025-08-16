import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { OrganizationValidationService } from '../services/organizationValidationService';
import { OrgSelectionFlow } from './OrgSelectionFlow';
import { dlog } from '../utils/debugLog';

interface OrgSelectionWrapperProps {
  children: React.ReactNode;
}

export const OrgSelectionWrapper: React.FC<OrgSelectionWrapperProps> = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { currentOrg, initialized: orgInitialized, orgs, setCurrentOrg } = useOrg();
  const [claimsValidated, setClaimsValidated] = useState(false);
  const [validatingClaims, setValidatingClaims] = useState(true);
  const [autoAssigning, setAutoAssigning] = useState(false);

  // Effect for validating claims
  useEffect(() => {
    const validateClaims = async () => {
      if (!isAuthenticated || !orgInitialized) {
        setValidatingClaims(false);
        return;
      }

      try {
        setValidatingClaims(true);
        const hasValidContext = await OrganizationValidationService.hasValidOrganizationContext();
        
        if (hasValidContext) {
          dlog('Organization context validation successful');
          setClaimsValidated(true);
        } else {
          dlog('Organization context validation failed - no valid context found');
          setClaimsValidated(false);
        }
      } catch (error) {
        dlog('Error validating organization context:', error);
        setClaimsValidated(false);
      } finally {
        setValidatingClaims(false);
      }
    };

    validateClaims();
  }, [isAuthenticated, orgInitialized]);

  // Effect for auto-assigning single organization
  useEffect(() => {
    const autoAssignSingleOrg = async () => {
      // Only auto-assign if we have a single org, no current org, and claims are not validated
      if (orgs.length === 1 && !currentOrg && !claimsValidated && !validatingClaims && !autoAssigning) {
        dlog('Auto-assigning single organization', { orgId: orgs[0].id, orgName: orgs[0].name });
        setAutoAssigning(true);
        
        try {
          await setCurrentOrg(orgs[0]);
          setClaimsValidated(true);
          dlog('Auto-assignment successful');
        } catch (error) {
          dlog('Auto-assignment failed', { error });
          // Fall back to manual selection if auto-assignment fails
        } finally {
          setAutoAssigning(false);
        }
      }
    };

    autoAssignSingleOrg();
  }, [orgs, currentOrg, claimsValidated, validatingClaims, autoAssigning, setCurrentOrg]);

  // Show loading while authentication or organization context is initializing
  if (authLoading || !orgInitialized || validatingClaims || autoAssigning) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>{autoAssigning ? 'Setting up your organization...' : 'Loading...'}</div>
      </div>
    );
  }

  // If not authenticated, don't show organization selection
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If no current organization or claims are invalid, show selection
  if (!currentOrg || !claimsValidated) {
    return (
      <OrgSelectionFlow 
        onOrganizationSelected={() => {
          dlog('Organization selected, re-validating claims');
          setClaimsValidated(true);
        }}
      />
    );
  }

  // User is authenticated and has valid organization claims, show the app
  return <>{children}</>;
}; 