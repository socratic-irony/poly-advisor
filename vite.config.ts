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
        manualChunks: {
          // Separate vendor dependencies that change less frequently
          vendor: ['react', 'react-dom'],
          // OpenAI is large, keep it separate for better caching
          openai: ['openai'],
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