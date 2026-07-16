import { resolve } from 'node:path';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), svelte()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        vanilla: resolve(__dirname, 'vanilla/index.html'),
        react: resolve(__dirname, 'react/index.html'),
        svelte: resolve(__dirname, 'svelte/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    fs: {
      allow: ['..', '.'],
    },
  },
});
