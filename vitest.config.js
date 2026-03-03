import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx}', 'src/tests/**/*.{test,spec}.{js,jsx}'],
    exclude: ['node_modules', 'dist', 'src/utils/testData.js'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        execArgv: ['--max-old-space-size=4096'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/tests/**',
        'src/utils/testData.js',
        'src/main.jsx',
      ],
      thresholds: {
        statements: 10,
        lines: 10,
        branches: 5,
        functions: 10,
      },
    },
  },
});
