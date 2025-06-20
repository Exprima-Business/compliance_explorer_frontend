/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_DEBUG_LOG: string
  readonly PROD: boolean
  readonly NODE_ENV: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 