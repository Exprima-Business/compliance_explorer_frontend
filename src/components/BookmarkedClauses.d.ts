import type { Clause } from '../types/clause';
interface BookmarkedClausesProps {
    bookmarkedClauses: Clause[];
    onClauseClick: (clause: Clause) => void;
    onBookmarkToggle: (clause: Clause) => void;
}
export declare const BookmarkedClauses: ({ bookmarkedClauses, onClauseClick, onBookmarkToggle }: BookmarkedClausesProps) => import("react/jsx-runtime").JSX.Element;
export {};
