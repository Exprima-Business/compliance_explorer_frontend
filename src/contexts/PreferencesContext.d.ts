import React from 'react';
interface Preferences {
    removeParentWithChild: boolean | null;
    autoBookmarkParents: boolean;
}
interface PreferencesContextValue {
    preferences: Preferences;
    updatePreference: (key: keyof Preferences, value: any) => void;
}
export declare const PreferencesProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const usePreferences: () => PreferencesContextValue;
export {};
