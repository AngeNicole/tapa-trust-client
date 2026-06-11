import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The client talks to the backend via the absolute URL in VITE_API_URL
// (see client/.env.example), so no dev proxy is needed. CORS on the server
// allows the browser request.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
