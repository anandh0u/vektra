import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  let apiUrl = env.VITE_API_URL || '';
  if (apiUrl) {
    try {
      const parsedApiUrl = new URL(apiUrl);
      if (!['http:', 'https:'].includes(parsedApiUrl.protocol)) {
        throw new Error('Unsupported API URL protocol.');
      }
      if (parsedApiUrl.hostname === 'vektra.onrender.com') {
        parsedApiUrl.hostname = 'vektra-backend.onrender.com';
        apiUrl = parsedApiUrl.toString();
      }
    } catch {
      throw new Error('VITE_API_URL must be an absolute HTTP(S) URL.');
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
    },
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
