import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function resolveBasePath(): string {
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH;
  }

  const repository = process.env.GITHUB_REPOSITORY || '';
  const repoName = repository.split('/')[1] || '';
  if (process.env.GITHUB_ACTIONS === 'true' && repoName) {
    return `/${repoName}/`;
  }

  return '/';
}

const base = resolveBasePath();

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
