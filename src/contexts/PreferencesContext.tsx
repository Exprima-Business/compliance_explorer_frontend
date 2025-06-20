import React, { createContext, useContext, useState, useEffect } from 'react';

interface Preferences {
  removeParentWithChild: boolean | null;
  autoBookmarkParents: boolean;
}

interface PreferencesContextValue {
  preferences: Preferences;
  updatePreference: (key: keyof Preferences, value: any) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const STORAGE_KEY = 'clauseAtlas_preferences';

const defaultPreferences: Preferences = {
  removeParentWithChild: null, // null = ask each time, true = always remove, false = never remove
  autoBookmarkParents: true, // automatically bookmark parent clauses when child is bookmarked
};

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, [preferences]);

  const updatePreference = (key: keyof Preferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const value: PreferencesContextValue = {
    preferences,
    updatePreference
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextValue => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}; 