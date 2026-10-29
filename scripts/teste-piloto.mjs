// Teste sem navegador: o piloto automático voa cada missão (modo demonstração) com a física real.
import { AERONAVES } from '../src/data/aeronaves.js';
import { Helicoptero } from '../src/sim/fisica.js';
import { MISSOES } from '../src/sim/missoes.js';
import { PilotoAutomatico } from '../src/sim/piloto.js';
import { chao } from '../src/sim/terreno.js';
const cenaFake = { limparMarcadores() {}, caixaAlvo() {}, anel() {}, cone() {}, arvore() {}, rotulo() {}, heliponto() {} };
const ids = process.argv[2] ? process.argv[2].split(',').map(Number) : Object.keys(MISSOES).map(Number);
const acId = process.argv[3] || 'r22';
for (const n of ids) {
  const ac = AERONAVES[acId]; const h = new Helicoptero(ac, { assist: 0.7 });
  const m = new MISSOES[n](cenaFake, h, {}); const p = new PilotoAutomatico(h); p.reset();
  let t = 0, log = [], cmdExtra = {}, fim = [];
  const dt = 1 / 60;
  while (t < 420 && m.estado === 'andamento') {
    const alvo = m.guia(); const c = alvo ? p.calcular(alvo, dt) : null;
    const cmd = { coletivo: c?.coletivo ?? 0, cicX: c?.cicX ?? 0, cicY: c?.cicY ?? 0, pedal: c?.pedal ?? 0, ...m.cmdExtra, alturaSolo: chao(h.pos.x, h.pos.z) };
    if (c?.extra?.cortar) m.cmdExtra.cortar = true;
    for (let i = 0; i < 2; i++) h.update(dt / 2, cmd);
    m.update(dt); m.msgs.length = 0; t += dt;
    if (Math.round(t * 60) % 15 === 0) { fim.push(`${t.toFixed(2)}s alt ${h.alturaFt.toFixed(0)} kias ${h.kias.toFixed(0)} pitch ${(h.pitch*57.3).toFixed(0)} rrpm ${h.rrpm.toFixed(0)} col ${h.coletivo.toFixed(2)} vz ${h.descidaFtMin.toFixed(0)} ${alvo?.modo||''}`); if (fim.length > 24) fim.shift(); }
    if (Math.round(t * 60) % 600 === 0) log.push(`${t.toFixed(0)}s alt ${h.alturaFt.toFixed(0)} kias ${h.kias.toFixed(0)} proa ${(h.yaw * 57.3).toFixed(0)} pitch ${(h.pitch*57.3).toFixed(0)} rrpm ${h.rrpm.toFixed(0)} col ${h.coletivo.toFixed(2)} ped ${h.pedal.toFixed(2)} pos ${h.pos.x.toFixed(0)},${h.pos.z.toFixed(0)} ${alvo?.modo || ''}`);
  }
  console.log(`== M${n} (${acId}): ${m.estado} ${m.estrelas}★ em ${t.toFixed(0)} s. ${m.resumo}`);
  console.log('   ' + m.objetivos.map(o => (o.feito ? '✅' : '⬜') + o.texto).join(' | '));
  if (process.argv[4] === 'v' || m.estado !== 'sucesso') console.log(log.slice(0, 26).join('\n'));
  if (process.argv[4] === 'f') console.log('--- últimos 6 s\n' + fim.join('\n'));
}
