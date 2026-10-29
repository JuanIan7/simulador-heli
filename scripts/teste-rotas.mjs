// Teste sem navegador: o piloto automático voa cada rota do Simulador (modo demonstração) com a física e o relevo reais.
// Uso: node scripts/teste-rotas.mjs [rota1,rota2] [aeronave] [v]
import { AERONAVES } from '../src/data/aeronaves.js';
import { Helicoptero } from '../src/sim/fisica.js';
import { MissaoRota, ROTAS_ORDEM } from '../src/sim/rotas.js';
import { PilotoAutomatico } from '../src/sim/piloto.js';
import { chao } from '../src/sim/terreno.js';
const cenaFake = { limparMarcadores() {}, caixaAlvo() {}, anel() {}, cone() {}, arvore() {}, rotulo() {}, heliponto() {}, linhaRota() {} };
const ids = process.argv[2] ? process.argv[2].split(',') : ROTAS_ORDEM;
const acId = process.argv[3] || 'r22';
let falhas = 0;
for (const id of ids) {
  const ac = AERONAVES[acId]; const h = new Helicoptero(ac, { assist: 0.7 });
  const m = new MissaoRota(cenaFake, h, { id }); const p = new PilotoAutomatico(h); p.reset();
  let t = 0; const log = []; const dt = 1 / 60; let minAgl = 1e9;
  while (t < 1500 && m.estado === 'andamento') {
    const alvo = m.guia(); const c = alvo ? p.calcular(alvo, dt) : null;
    const cmd = { coletivo: c?.coletivo ?? 0, cicX: c?.cicX ?? 0, cicY: c?.cicY ?? 0, pedal: c?.pedal ?? 0, ...m.cmdExtra, alturaSolo: chao(h.pos.x, h.pos.z) };
    for (let i = 0; i < 2; i++) h.update(dt / 2, cmd);
    m.update(dt); m.msgs.length = 0; t += dt;
    if (!h.noSolo && m.i > 1) minAgl = Math.min(minAgl, h.alturaFt);
    if (Math.round(t * 60) % 900 === 0) log.push(`${t.toFixed(0)}s passo ${m.i} ${alvo?.modo || ''} alt ${(h.pos.y / 0.3048).toFixed(0)} ft (agl ${h.alturaFt.toFixed(0)}) kias ${h.kias.toFixed(0)} pos ${h.pos.x.toFixed(0)},${h.pos.z.toFixed(0)} comb ${(h.combustivelKg / ac.densidadeCombustivel).toFixed(0)} L`);
  }
  if (m.estado !== 'sucesso') falhas++;
  console.log(`== ${id} (${acId}): ${m.estado} ${m.estrelas}★ em ${t.toFixed(0)} s. ${m.resumo} | menor altura em rota: ${minAgl.toFixed(0)} ft`);
  console.log('   ' + m.objetivos.map(o => (o.feito ? '✅' : '⬜') + o.texto).join(' | '));
  if (process.argv[4] === 'v' || m.estado !== 'sucesso') console.log(log.join('\n'));
}
process.exitCode = falhas ? 1 : 0;
