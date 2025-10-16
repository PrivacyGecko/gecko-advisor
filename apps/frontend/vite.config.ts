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
    // Code splitting and optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: (id) => {
          // Vendor chunks - split by package
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // TanStack Query
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            // Wallet/Solana dependencies (heavy, split separately)
            if (id.includes('@solana') || id.includes('wallet') || id.includes('ox') || id.includes('viem')) {
              return 'vendor-wallet';
            }
            // Utilities
            if (id.includes('clsx') || id.includes('zod')) {
              return 'vendor-utils';
            }
            // Other vendors
            return 'vendor-other';
          }

          // Feature-specific chunks - improved granularity
          if (id.includes('/src/components/')) {
            // Core components (always needed)
            if (id.includes('ScoreDial') || id.includes('Card') || id.includes('Skeleton')) {
              return 'components-core';
            }
            // Specialized/heavy components
            if (id.includes('VirtualizedEvidenceList') || id.includes('ScanProgress') || id.includes('ErrorBoundary')) {
              return 'components-specialized';
            }
            // Wallet-related components (lazy load)
            if (id.includes('Wallet') || id.includes('wallet')) {
              return 'components-wallet';
            }
            // Other components
            return 'components-other';
          }

          // Page-based splitting
          if (id.includes('/src/pages/')) {
            if (id.includes('Scan.tsx') || id.includes('ReportPage.tsx')) {
              return 'pages-scan';
            }
            if (id.includes('About.tsx')) return 'pages-about';
            if (id.includes('Docs.tsx')) return 'pages-docs';
            if (id.includes('Pricing.tsx')) return 'pages-pricing';
            if (id.includes('Legal')) return 'pages-legal';
            return 'pages-other';
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
    // Enable minification with terser for better compression in production
    minify: process.env.NODE_ENV === 'production' ? 'terser' : 'esbuild',
    // Terser options for aggressive minification
    terserOptions: process.env.NODE_ENV === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    } : undefined,
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
