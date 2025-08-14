import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { JWTClaimsManager } from '../utils/jwtClaimsManager';
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
        const claimsResult = await JWTClaimsManager.validateCurrentClaims();
        
        if (claimsResult.isValid) {
          dlog('JWT claims validation successful', { 
            organizationId: claimsResult.claims?.organizationId 
          });
          setClaimsValidated(true);
        } else {
          dlog('JWT claims validation failed', { error: claimsResult.error });
          setClaimsValidated(false);
        }
      } catch (error) {
        dlog('Error validating JWT claims:', error);
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

  // If no current organization or claims are invalid, show organization selection
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