import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue(), Icons({ compiler: 'vue3', scale: 1 })],
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { port: 4173, strictPort: true },
});
