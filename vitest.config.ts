import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'src/entities/drum-pattern/model/**/*.ts',
        'src/features/manage-fills/model/fills.ts',
        'src/features/manage-fills/model/catalog.ts',
        'src/features/manage-grooves/model/grooves.ts',
        'src/features/playback/model/audition.ts',
      ],
      exclude: ['**/*.test.ts'],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});
