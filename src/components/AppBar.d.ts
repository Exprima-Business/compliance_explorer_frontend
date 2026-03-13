import React from 'react';
interface CustomAppBarProps {
    activeTab: number;
    onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
    onSettingsClick: () => void;
    enableScanner: boolean;
    isMobile?: boolean;
    onMenuClick?: () => void;
}
export declare const AppBar: React.FC<CustomAppBarProps>;
export {};
