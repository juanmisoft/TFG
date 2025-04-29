import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'localhost',
      'lies-represents-thin-exclusion.trycloudflare.com',  
      'freebsd-vsnet-webmaster-huge.trycloudflare.com',  
    ],
  },
});