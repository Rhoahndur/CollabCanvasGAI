import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './src/tests/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}', 'src/tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'src/utils/testData.js'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 1,
        minForks: 1,
        execArgv: ['--max-old-space-size=6144'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/tests/**',
        'src/utils/testData.js',
        'src/main.jsx',
      ],
      thresholds: {
        statements: 15,
        lines: 15,
        branches: 50,
        functions: 30,
      },
    },
  },
});
