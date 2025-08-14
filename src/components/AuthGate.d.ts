import React from 'react';
/**
 * AuthGate blocks access to protected parts of the app until the
 * Supabase session has been resolved and a user is authenticated.
 *
 * Usage:
 *   <AuthGate>
 *     {/* providers + routes that require auth *\/}
 *   </AuthGate>
 */
declare const AuthGate: React.FC<{
    children: React.ReactNode;
}>;
export default AuthGate;
