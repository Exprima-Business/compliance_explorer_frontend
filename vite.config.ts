import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Debug logging for environment variables
  console.log('Vite Config - Environment Variables:');
  console.log('Mode:', mode);
  console.log('VITE_SUPABASE_URL:', env.VITE_SUPABASE_URL);
  console.log('VITE_SUPABASE_ANON_KEY:', env.VITE_SUPABASE_ANON_KEY ? '***' : 'not set');
  
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001'

  return {
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
    }
  }
})
