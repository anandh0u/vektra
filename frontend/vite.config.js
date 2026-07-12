import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let apiUrl = env.VITE_API_URL || '';
  if (apiUrl.includes('vektra.onrender.com')) {
    apiUrl = apiUrl.replace('vektra.onrender.com', 'vektra-backend.onrender.com');
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl)
    },
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
  };
})
