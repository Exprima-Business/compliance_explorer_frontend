import type { Clause } from '../types/clause';
interface FloatingPanelProps {
    clause: Clause | null;
    onClose: () => void;
    isBookmarked?: boolean;
    onBookmarkToggle?: () => void;
}
export declare const FloatingPanel: ({ clause, onClose, isBookmarked, onBookmarkToggle }: FloatingPanelProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
