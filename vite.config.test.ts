import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'scripts/verify_engine.ts',
    outDir: 'dist-test',
    emptyOutDir: true,
  },
});

