import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
const build = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
export default defineConfig({
  base: process.env.BASE_PATH || './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version + '+' + build) },
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
  plugins: [{ name: 'sw-versao', transformIndexHtml: (h) => h, closeBundle() {} }],
});
