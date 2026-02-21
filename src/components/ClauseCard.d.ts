import type { SxProps } from '@mui/system';
import type { Theme } from '@mui/material/styles';
import type { Clause } from '../types/clause';
interface ClauseCardProps {
    clause: Clause;
    onBookmarkToggle?: () => void;
    onClose?: () => void;
    sx?: SxProps<Theme>;
    compact?: boolean;
}
export declare const ClauseCard: ({ clause, onBookmarkToggle, onClose, sx, compact }: ClauseCardProps) => import("react/jsx-runtime").JSX.Element;
export {};
