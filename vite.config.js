import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  build: {
    // Enable production source maps for debugging (can be disabled for smaller builds)
    sourcemap: false,
    
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    
    // Code splitting and chunk optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunk: React and React DOM
          'vendor-react': ['react', 'react-dom'],
          
          // Firebase chunk: All Firebase dependencies
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
          ],
        },
        
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // Increase chunk size warning limit (500kb default is too small for Firebase)
    chunkSizeWarningLimit: 1000,
    
    // Target modern browsers for smaller builds
    target: 'esnext',
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/app',
      'firebase/auth', 
      'firebase/firestore',
      'ai/react',
    ],
  },
})

