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
  // Vitest: jsdom environment for component tests, with a setup file that wires
  // up jest-dom matchers. Playwright specs live under e2e/ and are excluded.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
