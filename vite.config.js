import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
});