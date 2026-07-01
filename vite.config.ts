import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_WC_URL || 'http://localhost';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/wc': {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/wc/, '/wp-json/wc/v3'),
          secure: false,
        },
        '/api/wp': {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/wp/, '/wp-json/wp/v2'),
          secure: false,
        },
      },
    },
  };
});
