import React from 'react';
interface SaveAsProjectDialogProps {
    open: boolean;
    onClose: () => void;
    scanId: string | null;
    selectedClauseIds: string[];
    /** Called after the project is successfully created / updated */
    onProjectCreated?: (projectId: string) => void;
}
/**
 * SaveAsProjectDialog
 *
 * Allows the user to either **create a new project** or **add scan results
 * to an existing project** using ONE backend API call
 * (`POST /api/projects/create-from-scan`).
 *
 * The backend already supports the `options.saveToExisting` and
 * `options.existingProjectId` fields, so no backend changes are needed.
 *
 * **Why this fixes React #300:**
 * We do NOT call `ProjectContext.createProject()`, so `currentProject` is
 * never switched mid-render, BookmarkProvider never cascades, and hook
 * execution order stays stable. After the backend finishes, we simply
 * call `refreshProjects()` to pick up the new project in the list.
 */
declare const SaveAsProjectDialog: React.FC<SaveAsProjectDialogProps>;
export default SaveAsProjectDialog;
