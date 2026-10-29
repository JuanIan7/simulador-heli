// Carimba a versão no service worker e copia o build para o Android (Capacitor usa dist/).
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'dist/sw.js'; const b = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
writeFileSync(p, readFileSync(p, 'utf8').replace('__BUILD__', b));
console.log('sw.js carimbado com', b);
