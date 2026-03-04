import React from 'react';
interface SaveAsProjectDialogProps {
    open: boolean;
    onClose: () => void;
    scanId: string | null;
    selectedClauseIds: string[];
    /** Called after the project is successfully created */
    onProjectCreated?: (projectId: string) => void;
}
/**
 * SaveAsProjectDialog
 *
 * Creates a new project from scan results using ONE backend API call
 * (`POST /api/projects/create-from-scan`). The backend handles:
 *   - project creation
 *   - clause validation against the DB
 *   - bookmark creation
 *
 * **Why this fixes React #300:**
 * We do NOT call `ProjectContext.createProject()`, so `currentProject` is
 * never switched mid-render, BookmarkProvider never cascades, and hook
 * execution order stays stable. After the backend finishes, we simply
 * call `refreshProjects()` to pick up the new project in the list.
 */
declare const SaveAsProjectDialog: React.FC<SaveAsProjectDialogProps>;
export default SaveAsProjectDialog;
