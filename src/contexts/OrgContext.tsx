import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiCall } from '../services/api';
import { dlog } from '../utils/debugLog';

interface Organization {
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
    dlog('OrgProvider: loading organizations');
    
    const resp = await apiCall<Organization[]>('/api/organizations');
    if (!resp.error && Array.isArray(resp.data)) {
      dlog('OrgProvider: organizations loaded successfully', {
        count: resp.data.length,
        orgs: resp.data.map(o => ({ id: o.id, name: o.name }))
      });
      
      setOrgs(resp.data);

      // try to restore previously selected org
      const storedId = localStorage.getItem(ORG_KEY);
      const match = resp.data.find(o => o.id === storedId) || resp.data[0] || null;
      if (match) {
        setCurrentOrgState(match);
        localStorage.setItem(ORG_KEY, match.id);
        dlog('OrgProvider: current org set', { orgId: match.id, orgName: match.name });
      } else {
        setCurrentOrgState(null);
        localStorage.removeItem(ORG_KEY);
        dlog('OrgProvider: no current org found');
      }
    } else {
      dlog('OrgProvider: failed to load organizations', { error: resp.error });
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    refreshOrgs();
  }, [refreshOrgs]);

  const setCurrentOrg = (org: Organization) => {
    setCurrentOrgState(org);
    localStorage.setItem(ORG_KEY, org.id);
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