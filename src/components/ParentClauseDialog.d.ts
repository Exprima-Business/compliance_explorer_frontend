import type { Clause } from '../types/clause';
interface ParentClauseDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (removeParent: boolean, rememberChoice: boolean) => void;
    childClause: Clause;
    parentClause: Clause;
}
export declare const ParentClauseDialog: ({ open, onClose, onConfirm, childClause, parentClause, }: ParentClauseDialogProps) => import("react/jsx-runtime").JSX.Element;
export {};
