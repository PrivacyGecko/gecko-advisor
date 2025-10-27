import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.FRONTEND_PORT || 5173),
    // Bind to 0.0.0.0 to make dev server accessible from Docker containers and CI
    host: '0.0.0.0',
    // Proxy API requests to backend in development
    // In Docker/CI, backend runs on 'backend:5000' hostname
    // In local dev, backend runs on 'localhost:5000'
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // Log proxy requests in development for debugging
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('[Vite Proxy] Error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Vite Proxy]', req.method, req.url, '→', proxyReq.path);
          });
        },
      },
    },
    // CORS configuration for dev server
    cors: {
      origin: true,
      credentials: true,
    },
    // Ensure proper handling of WebSocket connections for HMR
    hmr: {
      host: process.env.VITE_HMR_HOST || 'localhost',
      port: Number(process.env.FRONTEND_PORT || 5173),
    },
  },
  build: {
    // Code splitting and optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-utils': ['clsx', 'zod'],

          // Feature-specific chunks
          'components-core': [
            './src/components/ScoreDial.tsx',
            './src/components/Card.tsx',
            './src/components/Skeleton.tsx'
          ],
          'components-specialized': [
            './src/components/VirtualizedEvidenceList.tsx',
            './src/components/ScanProgress.tsx',
            './src/components/ErrorBoundary.tsx'
          ],
          'pages-scan': [
            './src/pages/Scan.tsx',
            './src/pages/ReportPage.tsx'
          ],
          'pages-static': [
            './src/pages/About.tsx',
            './src/pages/Docs.tsx',
            './src/pages/NotFound.tsx',
            './src/pages/Pricing.tsx'
          ]
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
    target: ['es2020', 'chrome80', 'firefox78', 'safari14'],
    // Enable minification
    minify: 'esbuild',
    // Source maps for debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Bundle size limits
    chunkSizeWarningLimit: 500, // KB
    // CSS code splitting
    cssCodeSplit: true
  },
  // Performance optimizations
  esbuild: {
    // Remove console.log in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
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
  },
  // Preview server configuration (for production build preview)
  preview: {
    port: Number(process.env.FRONTEND_PORT || 5173),
    host: '0.0.0.0',
    cors: true,
  },
});
