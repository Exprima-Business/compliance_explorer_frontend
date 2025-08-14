import type { Clause } from '../types/clause';
interface FloatingPanelProps {
    clause: Clause | null;
    onClose: () => void;
    onBookmarkToggle?: () => void;
}
export declare const FloatingPanel: ({ clause, onClose, onBookmarkToggle }: FloatingPanelProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
