import React from 'react';
import type { User } from '@supabase/supabase-js';
export interface AuthContextValue {
    user: User | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
}
export declare const AuthContext: React.Context<AuthContextValue | undefined>;
export declare const AuthProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare function useAuth(): AuthContextValue;
