// Regra do acerto: o aviso é de quem paga; a confirmação é de quem recebe.
import { partesParaAvisar, partesParaQuitar } from '../src/gastos/acerto.js';
import assert from 'node:assert/strict';

// Juan pagou o Uber de 90; o Meira pagou a pizza de 60. Os dois dividem os dois gastos.
const GASTOS = [
  { id: 'uber',  pagoPor: 'Juan',  participantes: ['Juan', 'Meira'], quitados: [], valor: 9000 },
  { id: 'pizza', pagoPor: 'Meira', participantes: ['Juan', 'Meira'], quitados: [], valor: 6000 },
  { id: 'solo',  pagoPor: 'Loureiro', participantes: ['Loureiro'], quitados: [], valor: 1000 },
];
let ok = 0; const t = (nome, fn) => { fn(); ok++; console.log('  ✓', nome); };

t('o aviso do Juan para o Meira pega só o que o Meira pagou', () => {
  const r = partesParaAvisar(GASTOS, 'Juan', 'Meira').map((g) => g.id);
  assert.deepEqual(r, ['pizza']);
});
t('o aviso NÃO marca o sentido contrário (era o bug)', () => {
  const r = partesParaAvisar(GASTOS, 'Juan', 'Meira').map((g) => g.id);
  assert.ok(!r.includes('uber'), 'o Uber é dívida do Meira com o Juan: não pode entrar no aviso do Juan');
});
t('o aviso do Meira para o Juan pega só o que o Juan pagou', () => {
  assert.deepEqual(partesParaAvisar(GASTOS, 'Meira', 'Juan').map((g) => g.id), ['uber']);
});
t('o acerto quita os dois sentidos, porque é a diferença', () => {
  assert.deepEqual(partesParaQuitar(GASTOS, 'Juan', 'Meira').map((x) => [x.g.id, x.devedor]).sort(),
    [['pizza', 'Juan'], ['uber', 'Meira']]);
});
t('quem já quitou não entra de novo', () => {
  const g2 = GASTOS.map((g) => g.id === 'pizza' ? { ...g, quitados: ['Juan'] } : g);
  assert.deepEqual(partesParaAvisar(g2, 'Juan', 'Meira'), []);
});
t('gasto de terceiro não entra', () => {
  assert.deepEqual(partesParaAvisar(GASTOS, 'Juan', 'Loureiro'), []);
  assert.deepEqual(partesParaQuitar(GASTOS, 'Juan', 'Loureiro'), []);
});
t('lista vazia ou campos faltando não quebram', () => {
  assert.deepEqual(partesParaAvisar(null, 'a', 'b'), []);
  assert.deepEqual(partesParaAvisar([{ id: 'x', pagoPor: 'b' }], 'a', 'b'), []);
});
console.log(`\n${ok} testes passaram`);
