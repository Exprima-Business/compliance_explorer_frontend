import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  // V2-M-10 (security audit 2026-06 v2): only emit env-var debug to the
  // build log in non-production. Even though the anon key is already
  // redacted, the URL and mode log lines were ending up in every Vercel
  // build log — needless surface, and the pattern was one TODO away from
  // someone "improving" the log to be less mysterious by un-redacting.
  if (mode !== 'production') {
    console.log('Vite Config - Environment Variables:');
    console.log('Mode:', mode);
    console.log('VITE_SUPABASE_URL:', env.VITE_SUPABASE_URL);
    console.log('VITE_SUPABASE_ANON_KEY:', env.VITE_SUPABASE_ANON_KEY ? '***' : 'not set');
  }

  const apiUrl = env.VITE_API_URL || 'http://localhost:3001'

  return {
    base: '/',  // Assets should be at root level
    plugins: [react()],
    envPrefix: 'VITE_',
    define: {
      'process.env': {
        VITE_SUPABASE_URL: JSON.stringify(env.VITE_SUPABASE_URL),
        VITE_SUPABASE_ANON_KEY: JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
        VITE_API_URL: JSON.stringify(apiUrl)
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    server: {
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          // Bundle-size optimization (target: 626 KB gz → ~250 KB gz initial
          // load). Strategy:
          //
          //   - Split high-traffic vendor libraries into stable chunks so the
          //     browser caches them across deploys (any app-code change
          //     doesn't invalidate the vendor cache).
          //   - Pull @mui/icons-material into its own chunk — 67 files import
          //     from it, so without an explicit split it lands in the main
          //     chunk and bloats first-paint by ~150 KB.
          //   - Split @mui/x-data-grid — used by a handful of pages, weighs
          //     enough to deserve its own chunk.
          //   - Page-specific heavy libs (jspdf, html2canvas, recharts, d3,
          //     exceljs) are NOT split here — they auto-chunk with the lazy-
          //     loaded page that uses them (per MainApp.tsx React.lazy).
          //
          // Function form (not object) so we can pattern-match paths.
          manualChunks: (id: string) => {
            // App-code stays in default chunks (entry chunk or lazy page
            // chunks, depending on what imports it).
            if (!id.includes('node_modules')) return undefined;
            // Order matters: most-specific first.
            if (id.includes('@mui/icons-material')) return 'mui-icons';
            if (id.includes('@mui/x-data-grid')) return 'mui-data-grid';
            if (id.includes('@mui/material') || id.includes('@emotion/react') || id.includes('@emotion/styled')) {
              return 'mui-core';
            }
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('@tanstack')) return 'tanstack';
            if (id.includes('react-router')) return 'router';
            // react-dom is huge; isolate so app-code changes don't invalidate it.
            if (id.includes('node_modules/react-dom/') || id.includes('node_modules/scheduler/')) {
              return 'react-dom';
            }
            if (id.includes('node_modules/react/')) return 'react';
            // For unmatched node_modules — let Rollup's default chunker
            // decide. It correctly co-locates page-specific libs (recharts
            // for Dashboard, d3 for Regulations, etc.) into the lazy
            // page's chunk rather than forcing them into a global vendor
            // chunk that loads on every visit.
            return undefined;
          },
        },
      },
      chunkSizeWarningLimit: 600,
    }
  }
})
