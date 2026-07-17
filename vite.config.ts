/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/poly-advisor/',
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'vendor';
          }
          if (id.includes('/node_modules/openai/')) {
            return 'openai';
          }
          if (id.includes('/node_modules/lucide-react/') || id.includes('/node_modules/markdown-to-jsx/')) {
            return 'ui';
          }
          return undefined;
        },
      },
    },
    // Increase chunk size warning limit since we've optimized
    chunkSizeWarningLimit: 500,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
