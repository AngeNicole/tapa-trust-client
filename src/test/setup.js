// Vitest global setup — adds jest-dom matchers (toBeInTheDocument, etc.) and
// clears storage between tests so they don't leak state.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
