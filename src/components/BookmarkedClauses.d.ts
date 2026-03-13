import type { Clause } from '../types/clause';
interface BookmarkedClausesProps {
    bookmarkedClauses: Clause[];
    /** Optional: called when the clause card is clicked. Future use: open clause in main view. */
    onClauseClick?: (clause: Clause) => void;
    onBookmarkToggle: (clause: Clause) => void;
}
export declare const BookmarkedClauses: ({ bookmarkedClauses, onClauseClick, onBookmarkToggle }: BookmarkedClausesProps) => import("react/jsx-runtime").JSX.Element;
export {};
