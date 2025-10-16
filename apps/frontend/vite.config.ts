import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.FRONTEND_PORT || 5173),
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Code splitting and optimization - SIMPLIFIED to prevent circular dependencies
    rollupOptions: {
      output: {
        // Manual chunk splitting - MINIMAL strategy to avoid initialization errors
        manualChunks: (id) => {
          // Keep ALL React-related packages together (no separation)
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // Everything else in one vendor bundle
            return 'vendor';
          }
        },
        // Optimize chunk file names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId || '';

          if (facadeModuleId.includes('node_modules')) {
            return 'vendor/[name].[hash].js';
          }

          if (facadeModuleId.includes('/pages/')) {
            return 'pages/[name].[hash].js';
          }

          if (facadeModuleId.includes('/components/')) {
            return 'components/[name].[hash].js';
          }

          return 'chunks/[name].[hash].js';
        },
        entryFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      },
    },
    // Target modern browsers for smaller bundles
    target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
    // Use esbuild for minification - faster and safer than terser
    minify: 'esbuild',
    // Source maps for debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Bundle size limits - more aggressive
    chunkSizeWarningLimit: 300, // KB - lowered from 500
    // CSS code splitting
    cssCodeSplit: true,
    // Optimize dependencies
    reportCompressedSize: true,
    // Reduce chunk size
    assetsInlineLimit: 4096 // 4kb - inline smaller assets
  },
  // Performance optimizations
  esbuild: {
    // Remove console.log in development builds (terser handles production)
    drop: process.env.NODE_ENV === 'production' ? [] : [],
    // Enable tree shaking
    treeShaking: true,
  },
  // Resolve optimizations
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@lib': resolve(__dirname, './src/lib'),
    },
  },
  // Dependency pre-bundling optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'clsx',
      'zod'
    ],
    exclude: []
  }
});
