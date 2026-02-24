import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiCall } from '../services/api';
import { dlog } from '../utils/debugLog';
import { OrganizationValidationService } from '../services/organizationValidationService';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface OrgContextValue {
  orgs: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
  refreshOrgs: () => Promise<void>;
  createOrg: (name: string) => Promise<void>;
  initialized: boolean;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

const ORG_KEY = 'orgId';

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [initialized, setInitialized] = useState(false);

  const refreshOrgs = useCallback(async () => {
    dlog('OrgProvider: loading organizations via validation service');
    
    try {
      // Use backend validation service to get user's organizations
      const validationResult = await OrganizationValidationService.getUserOrganizations();
      
      dlog('OrgProvider: validation result received - FULL DEBUG', {
        validationResult: validationResult,
        valid: validationResult.valid,
        hasOrganizations: !!validationResult.organizations,
        organizationsCount: validationResult.organizations?.length || 0,
        hasOrganization: !!validationResult.organization,
        organizationDetails: validationResult.organization,
        error: validationResult.error
      });

      if (validationResult.valid && validationResult.organizations) {
        const userOrgs = validationResult.organizations.map(org => ({
          id: org.id,
          name: org.name,
          slug: org.slug
        }));
        
        dlog('OrgProvider: organizations loaded via validation service', {
          count: userOrgs.length,
          orgs: userOrgs.map(o => ({ id: o.id, name: o.name }))
        });
        
        setOrgs(userOrgs);

        // Try to restore previously selected org
        const storedId = localStorage.getItem(ORG_KEY);
        const match = userOrgs.find(o => o.id === storedId) || userOrgs[0] || null;
        
        if (match) {
          await setCurrentOrg(match); // This validates with backend
          dlog('OrgProvider: current org restored with backend validation', { 
            orgId: match.id, 
            orgName: match.name 
          });
        } else {
          setCurrentOrgState(null);
          localStorage.removeItem(ORG_KEY);
          dlog('OrgProvider: no current org found');
        }
      } else {
        dlog('OrgProvider: failed to load organizations via validation service - FAILURE DEBUG', { 
          validationResult: validationResult,
          valid: validationResult.valid,
          hasOrganizations: !!validationResult.organizations,
          hasOrganization: !!validationResult.organization,
          error: validationResult.error,
          errorType: typeof validationResult.error
        });
        setOrgs([]);
        setCurrentOrgState(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dlog('OrgProvider: error loading organizations', { error: errorMessage });
      setOrgs([]);
      setCurrentOrgState(null);
    }
    
    setInitialized(true);
  }, []);

  useEffect(() => {
    // Always load organizations on mount.
    // AppContent already routes setup-required users to OrganizationSetup before
    // MainApp (and therefore OrgProvider) is ever mounted, so the old JWT
    // setup_required check is redundant here. More importantly, reading
    // setup_required from the local JWT is fragile: if supabase.auth.refreshSession()
    // in OrganizationSetup completes but the token hasn't propagated yet, OrgProvider
    // would see setup_required=true, skip refreshOrgs(), and leave currentOrg=null
    // forever → ProjectGate returns null → permanent blank white screen.
    refreshOrgs();
  }, [refreshOrgs]);

  const setCurrentOrg = async (org: Organization) => {
    // Optimistic update: store org immediately so downstream callers (ProjectProvider,
    // api.ts x-org-id header) always have a valid org ID even if backend validation is slow
    // or temporarily unavailable.
    setCurrentOrgState(org);
    localStorage.setItem(ORG_KEY, org.id);

    try {
      // Validate organization access with backend (non-blocking for the UI)
      const validationResult = await OrganizationValidationService.setOrganizationContext(org.id);

      if (!validationResult.valid) {
        // Log but don't throw — the org came from the backend getUserOrganizations call
        // so it's known-good; a transient failure here shouldn't block the UI.
        dlog('Organization context: backend validation returned invalid (proceeding anyway)', {
          orgId: org.id,
          error: validationResult.error
        });
        return;
      }

      // Force a Supabase session refresh so the browser JWT picks up the updated
      // user_metadata.custom_claims that setOrganizationContext just wrote server-side.
      // Without this, subsequent API calls (e.g. GET /api/projects) use a stale JWT
      // that fails validateCustomClaims → 401 "Organization context required".
      try {
        await supabase.auth.refreshSession();
        dlog('OrgContext: session refreshed after setOrganizationContext');
      } catch (refreshErr) {
        // Non-fatal: if the refresh fails the existing JWT may still work
        dlog('OrgContext: session refresh failed (non-fatal)', { refreshErr });
      }

      dlog('Organization context updated with backend validation', {
        orgId: org.id,
        orgName: org.name,
        validated: true
      });
    } catch (error) {
      // Non-fatal: org is already stored optimistically; log and continue.
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dlog('Error updating organization context (non-fatal, proceeding):', errorMessage);
    }
  };

  // Create organization via backend and refresh list
  const createOrg = async (name: string): Promise<void> => {
    const resp = await apiCall<Organization>('/api/organizations', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    if (resp.error) {
      throw new Error(typeof resp.error === 'string' ? resp.error : resp.error.message);
    }

    // Push new org into state
    if (resp.data) {
      setOrgs(prev => [...prev, resp.data!]);
      setCurrentOrg(resp.data!);
    }
  };

  const value: OrgContextValue = { orgs, currentOrg, setCurrentOrg, refreshOrgs, createOrg, initialized };
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
};

export const useOrg = (): OrgContextValue => {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}; 