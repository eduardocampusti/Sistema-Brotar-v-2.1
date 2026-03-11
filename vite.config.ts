import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5500,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env': {},
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['lucide-react', 'recharts'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-utils': ['react-markdown'],
            // Heavy libs loaded only when needed (PDF, CSV, AI)
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],
            'vendor-csv': ['papaparse'],
            'vendor-ai': ['@google/genai'],
          }
        }
      }
    }
  };
});
