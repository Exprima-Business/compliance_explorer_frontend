import React from 'react';
/**
 * DocumentScanner Component
 *
 * SINGLE PROGRESS REFACTOR (Latest Update):
 *
 * 1. Consolidated State Management:
 *    - Added 'loading-from-be' status to distinguish from 'processing'
 *    - Single renderProgressState() function handles all progress states
 *    - Eliminates overlapping UI elements (multiple spinning circles)
 *
 * 2. Unified Progress Display:
 *    - Single progress indicator for all states
 *    - Mutually exclusive rendering conditions
 *    - Clear state transitions and messaging
 *
 * 3. Removed Redundant Elements:
 *    - Eliminated duplicate CircularProgress components
 *    - Removed overlapping renderResults() calls during progress states
 *    - Consolidated manual refresh logic into main progress display
 *
 * 4. Enhanced User Experience:
 *    - Single, consistent progress feedback
 *    - Clear state messaging for each phase
 *    - Integrated refresh functionality within progress display
 *
 * This refactor addresses the "too many UI elements" issue by ensuring only one
 * progress indicator is shown at any time, with clear state transitions.
 */
export declare const DocumentScanner: React.FC;
