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
  const { currentOrg, initialized: orgInitialized } = useOrg();
  const [claimsValidated, setClaimsValidated] = useState(false);
  const [validatingClaims, setValidatingClaims] = useState(true);

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

  // Show loading while authentication or organization context is initializing
  if (authLoading || !orgInitialized || validatingClaims) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // If not authenticated, don't show organization selection
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If no current organization or claims are invalid, check for auto-assignment
  if (!currentOrg || !claimsValidated) {
    // Check if user has only one organization and auto-assign it
    const { orgs, setCurrentOrg } = useOrg();
    
    if (orgs.length === 1) {
      // Auto-assign the single organization
      dlog('Auto-assigning single organization', { orgId: orgs[0].id, orgName: orgs[0].name });
      
      // Use useEffect to avoid calling setCurrentOrg during render
      React.useEffect(() => {
        const autoAssignOrg = async () => {
          try {
            await setCurrentOrg(orgs[0]);
            setClaimsValidated(true);
            dlog('Auto-assignment successful');
          } catch (error) {
            dlog('Auto-assignment failed', { error });
            // Fall back to manual selection if auto-assignment fails
          }
        };
        autoAssignOrg();
      }, [orgs]);
      
      // Show loading while auto-assigning
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <div>Setting up your organization...</div>
        </div>
      );
    }
    
    // Multiple organizations or no organizations - show selection
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