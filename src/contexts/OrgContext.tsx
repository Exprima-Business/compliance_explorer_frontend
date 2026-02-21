import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiCall } from '../services/api';
import { supabase } from '../lib/supabase';
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
    // Only load organizations if user doesn't need setup
    // This prevents unnecessary API calls for setup-required users
    const shouldLoadOrgs = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const setupRequired = session?.user?.user_metadata?.setup_required;
        
        if (!setupRequired) {
          refreshOrgs();
        } else {
          dlog('OrgProvider: Skipping organization load - user needs setup');
          setInitialized(true);
        }
      } catch (error) {
        dlog('OrgProvider: Error checking setup requirement', { error });
        // Fall back to loading organizations
        refreshOrgs();
      }
    };
    
    shouldLoadOrgs();
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