import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DEBUG_LOG } from './config/debug'
import { DebugErrorBoundary } from './components/DebugErrorBoundary'
import './utils/setupDebug'

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
