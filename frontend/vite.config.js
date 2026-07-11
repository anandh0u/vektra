import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('reactflow') || id.includes('zustand')) return 'graph-vendor';
          if (id.includes('recharts')) return 'charts-vendor';
          if (id.includes('@stellar') || id.includes('stellar-sdk')) return 'stellar-vendor';
          if (id.includes('react')) return 'react-vendor';
        },
      },
    },
  },
})
