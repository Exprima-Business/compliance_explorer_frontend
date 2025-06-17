import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DEBUG_LOG } from './config/debug'
import { DebugErrorBoundary } from './components/DebugErrorBoundary'
import './utils/setupDebug'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {DEBUG_LOG ? (
          <DebugErrorBoundary>
            <App />
          </DebugErrorBoundary>
        ) : (
          <App />
        )}
      </AuthProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)
