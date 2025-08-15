import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DEBUG_LOG } from './config/debug'
import { DebugErrorBoundary } from './components/DebugErrorBoundary'
import './utils/setupDebug'
import { supabase } from './lib/supabase';

// --- Supabase Auth Event Logging (4, 7) ---
if (typeof window !== 'undefined' && !(window as any).__SUPABASE_AUTH_LOGGED) {
  (window as any).__SUPABASE_AUTH_LOGGED = true;
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[SUPABASE AUTH EVENT]', event, session);
    if (session) {
      const now = Math.floor(Date.now() / 1000);
      console.log('[SUPABASE AUTH SESSION STATE]', {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        now,
        expires_in_seconds: session.expires_at ? session.expires_at - now : undefined,
        user: session.user
      });
    }
  });
}

// --- Global fetch interceptor for refresh token requests (6) ---
if (typeof window !== 'undefined' && !(window as any).__SUPABASE_FETCH_LOGGED) {
  (window as any).__SUPABASE_FETCH_LOGGED = true;
  const origFetch = window.fetch;
  window.fetch = async (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('/auth/v1/token?grant_type=refresh_token')) {
      console.log('[SUPABASE REFRESH REQUEST]', args);
    }
    const resp = await origFetch(...args);
    if (typeof args[0] === 'string' && args[0].includes('/auth/v1/token?grant_type=refresh_token')) {
      try {
        const clone = resp.clone();
        const data = await clone.json();
        console.log('[SUPABASE REFRESH RESPONSE]', data);
      } catch (e) {
        console.error('[SUPABASE REFRESH RESPONSE ERROR]', e);
      }
    }
    return resp;
  };
}

// --- Log session persistence after reload (1, 5) ---
if (typeof window !== 'undefined') {
  supabase.auth.getSession().then(({ data: { session } }) => {
    const now = Math.floor(Date.now() / 1000);
    console.log('[SSE DEBUG] Session after reload:', session);
    if (session) {
      console.log('[SSE DEBUG] Session after reload details:', {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        now,
        expires_in_seconds: session.expires_at ? session.expires_at - now : undefined,
        user: session.user
      });
    }
  });
}

// --- Manual refreshSession logging utility (2) ---
if (typeof window !== 'undefined') {
  (window as any).debugRefreshSession = async () => {
    try {
      const result = await supabase.auth.refreshSession();
      console.log('[SUPABASE REFRESHSESSION RESULT]', result);
      const now = Math.floor(Date.now() / 1000);
      if (result.data.session) {
        console.log('[SUPABASE REFRESHSESSION SESSION DETAILS]', {
          access_token: result.data.session.access_token,
          refresh_token: result.data.session.refresh_token,
          expires_at: result.data.session.expires_at,
          expires_in: result.data.session.expires_in,
          now,
          expires_in_seconds: result.data.session.expires_at ? result.data.session.expires_at - now : undefined,
          user: result.data.session.user
        });
      }
    } catch (e) {
      console.error('[SUPABASE REFRESHSESSION ERROR]', e);
    }
  };
  console.log('[SUPABASE DEBUG] Call window.debugRefreshSession() in the console to manually refresh and log session.');
}

// --- Organization Validation debugging utility ---
if (typeof window !== 'undefined') {
  (window as any).debugOrganizationValidation = async () => {
    try {
      const { OrganizationValidationService } = await import('./services/organizationValidationService');
      const hasContext = await OrganizationValidationService.hasValidOrganizationContext();
      const userOrgs = await OrganizationValidationService.getUserOrganizations();
      console.log('[ORGANIZATION VALIDATION DEBUG]', {
        hasValidContext: hasContext,
        userOrganizations: userOrgs
      });
    } catch (e) {
      console.error('[ORGANIZATION VALIDATION DEBUG ERROR]', e);
    }
  };
  console.log('[ORGANIZATION VALIDATION DEBUG] Call window.debugOrganizationValidation() in the console to debug organization validation.');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      {DEBUG_LOG ? (
        <DebugErrorBoundary>
          <App />
        </DebugErrorBoundary>
      ) : (
        <App />
      )}
    </AuthProvider>
  </StrictMode>,
)
