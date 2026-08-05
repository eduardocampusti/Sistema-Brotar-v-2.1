import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Plugin que injeta build timestamp no index.html — força CDN/hosting a invalidar cache
function buildTimestampPlugin(): Plugin {
  return {
    name: 'build-timestamp',
    transformIndexHtml(html) {
      const ts = Date.now();
      return html.replace(
        '<head>',
        `<head>\n    <meta name="build-ts" content="${ts}" />`
      );
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const requiredPublicEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const missingPublicEnv = requiredPublicEnv.filter((name) => !env[name]?.trim());

  if (missingPublicEnv.length > 0) {
    throw new Error(`Missing required frontend environment variables: ${missingPublicEnv.join(', ')}`);
  }

  return {
    server: {
      port: 5500,
      host: '0.0.0.0',
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
    plugins: [react(), buildTimestampPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['lucide-react', 'recharts'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-utils': ['react-markdown'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],
            'vendor-csv': ['papaparse'],
          }
        }
      }
    },
    test: {
      environment: 'node',
      include: ['**/*.{test,spec}.{ts,tsx}', '**/*.integration.test.ts'],
      testTimeout: 120_000,
      hookTimeout: 60_000,
    },
  };
});
