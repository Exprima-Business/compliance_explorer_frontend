import React from 'react';
interface CustomAppBarProps {
    activeTab: number;
    onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
    onSettingsClick: () => void;
}
export declare const AppBar: React.FC<CustomAppBarProps>;
export {};
