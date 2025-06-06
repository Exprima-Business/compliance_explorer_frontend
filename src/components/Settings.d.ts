interface SettingsProps {
    open: boolean;
    onClose: () => void;
    preferences: {
        removeParentWithChild: boolean | null;
    };
    onPreferenceChange: (key: string, value: boolean | null) => void;
}
export declare const Settings: ({ open, onClose, preferences, onPreferenceChange, }: SettingsProps) => import("react/jsx-runtime").JSX.Element;
export {};
