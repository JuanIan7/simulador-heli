// Missões de rota do "Simulador de voo": um caminho com pontos de passagem (anéis), pairado e pouso.
// Servem ao voo guiado (instrutor diz o que fazer) e às missões com objetivos (sozinho, com ajuda ou demonstração).
// A altitude de cada perna nunca fica abaixo do relevo + 500 ft (calculada pelo terreno), como numa altitude mínima de segurança.
import { Missao } from './missoes.js';
import { elevacao, HELIPONTOS, MIRANTE, naAgua } from './terreno.js';

const FT = 0.3048;
const dist2 = (a, bx, bz) => Math.hypot(a.x - bx, a.z - bz);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const ROTAS = {
  aerodromo: {
    titulo: 'Volta no aeródromo', icone: '🛫', nivel: 'Fácil', vento: { kt: 5, dir: 360 }, inicio: { ...HELIPONTOS.base, yaw: 0 },
    resumo: 'Primeiro voo do simulador: decolar do H, contornar a pista pela esquerda (circuito) e pousar de volta no H.',
    passos: [
      { tipo: 'decolar', texto: 'Decole: suba o coletivo devagar até o pairado e continue subindo' },
      { tipo: 'wp', x: 60, z: -600, altFt: 300, nome: 'Cabeceira norte', texto: 'Siga a pista para o NORTE a 300 ft' },
      { tipo: 'wp', x: -350, z: -650, altFt: 500, nome: 'Través', texto: 'Curva à ESQUERDA: perna do través, 500 ft' },
      { tipo: 'wp', x: -350, z: 450, altFt: 500, nome: 'Perna do vento', texto: 'Perna do vento: siga para o SUL, 500 ft' },
      { tipo: 'wp', x: 0, z: 500, altFt: 300, nome: 'Base', texto: 'Perna base: curva à esquerda e comece a descer' },
      { tipo: 'pousar', heli: 'base', proa: 0, texto: 'Final para o H da base: desça e pouse suave' },
    ],
  },
  lagoa: {
    titulo: 'Patrulha na Lagoa', icone: '🌊', nivel: 'Médio', vento: { kt: 8, dir: 90 }, inicio: { ...HELIPONTOS.base, yaw: Math.PI * 1.25 },
    resumo: 'Voe até a lagoa, contorne as margens a 500 ft e pouse no heliponto do GOA na margem leste, contra o vento (vindo do leste).',
    passos: [
      { tipo: 'decolar', texto: 'Decole e suba' },
      { tipo: 'wp', x: -250, z: 500, altFt: 500, nome: 'Saída', texto: 'Rumo SUDOESTE, para a lagoa, 500 ft' },
      { tipo: 'wp', x: -950, z: 880, altFt: 500, nome: 'Margem norte', texto: 'Margem norte da lagoa' },
      { tipo: 'wp', x: -1560, z: 1400, altFt: 500, nome: 'Margem oeste', texto: 'Margem oeste' },
      { tipo: 'wp', x: -950, z: 1960, altFt: 500, nome: 'Margem sul', texto: 'Margem sul' },
      { tipo: 'wp', x: -800, z: 1550, altFt: 400, nome: 'Final', texto: 'Curva para LESTE sobre a água: final contra o vento' },
      { tipo: 'pousar', heli: 'lagoa', proa: Math.PI / 2, texto: 'Pouse no heliponto do GOA, na margem leste' },
    ],
  },
  hospital: {
    titulo: 'Aeromédico: base → hospital', icone: '🏥', nivel: 'Médio', vento: { kt: 6, dir: 90 }, inicio: { ...HELIPONTOS.base, yaw: Math.PI / 2 },
    resumo: 'Transporte de paciente: siga a estrada para leste e pouse no heliponto do hospital, na entrada da cidade. Heliponto hospitalar tem a cruz vermelha.',
    passos: [
      { tipo: 'decolar', texto: 'Decole e suba' },
      { tipo: 'wp', x: 350, z: -170, altFt: 500, nome: 'Estrada', texto: 'Siga a estrada para LESTE, 500 ft' },
      { tipo: 'wp', x: 800, z: -220, altFt: 600, nome: 'Meio do caminho', texto: 'Mantenha 600 ft; o hospital fica antes dos prédios' },
      { tipo: 'wp', x: 1080, z: -260, altFt: 400, nome: 'Final', texto: 'Reduza: final para o hospital, contra o vento' },
      { tipo: 'pousar', heli: 'hospital', proa: Math.PI / 2, texto: 'Pouse no H com a cruz: heliponto do hospital' },
    ],
  },
  serra: {
    titulo: 'Resgate na serra (içamento)', icone: '⛰️', nivel: 'Difícil', vento: { kt: 10, dir: 340 }, inicio: { ...HELIPONTOS.base, yaw: -Math.PI / 4 },
    resumo: 'Missão do GOA: voe até o mirante na serra, paire a 50 ft sobre a vítima por 15 s para o içamento e volte para pousar na base. A altitude das pernas acompanha o relevo.',
    passos: [
      { tipo: 'decolar', texto: 'Decole e suba' },
      { tipo: 'wp', x: -700, z: -1300, altFt: 1000, nome: 'Rumo à serra', texto: 'Rumo NOROESTE, subindo' },
      { tipo: 'wp', x: -1600, z: -2450, altFt: 1200, nome: 'Encosta', texto: 'Suba acompanhando o relevo: a serra está à frente' },
      { tipo: 'pairar', x: MIRANTE.x, z: MIRANTE.z, aglFt: 50, dur: 15, nome: 'Vítima', texto: 'Içamento: paire a 50 ft sobre a vítima por 15 s' },
      { tipo: 'wp', x: -900, z: -700, altFt: 1000, nome: 'Retorno', texto: 'Vítima a bordo. Retorne à base' },
      { tipo: 'wp', x: -450, z: 550, altFt: 600, nome: 'Perna do vento', texto: 'Contorne a base pelo oeste, descendo para 600 ft' },
      { tipo: 'wp', x: -70, z: 480, altFt: 400, nome: 'Final', texto: 'Curva para o NORTE: final contra o vento' },
      { tipo: 'pousar', heli: 'base', proa: -0.35, texto: 'Pouse no H da base' },
    ],
  },
  costa: {
    titulo: 'Navegação costeira', icone: '🏖️', nivel: 'Difícil', vento: { kt: 8, dir: 360 }, inicio: { ...HELIPONTOS.base, yaw: Math.PI },
    resumo: 'Navegação visual longa: desça até o litoral, siga a praia para leste, contorne o Pão de Açúcar pelo mar e volte ao aeródromo. Use os marcos do terreno.',
    passos: [
      { tipo: 'decolar', texto: 'Decole e suba' },
      { tipo: 'wp', x: 400, z: 2600, altFt: 1000, nome: 'Rumo sul', texto: 'Rumo SUL, para o litoral' },
      { tipo: 'wp', x: 1800, z: 5700, altFt: 800, nome: 'Praia', texto: 'Na praia: siga a costa para LESTE' },
      { tipo: 'wp', x: 3700, z: 6400, altFt: 600, nome: 'Pão de Açúcar', texto: 'Contorne o Pão de Açúcar pelo MAR' },
      { tipo: 'wp', x: 4900, z: 5400, altFt: 800, nome: 'Enseada', texto: 'Curva para o NORTE na enseada' },
      { tipo: 'wp', x: 2200, z: 1800, altFt: 1000, nome: 'Retorno', texto: 'Retorne ao aeródromo, rumo noroeste' },
      { tipo: 'wp', x: 250, z: 650, altFt: 400, nome: 'Final', texto: 'Desça para 400 ft: final para a base, contra o vento' },
      { tipo: 'pousar', heli: 'base', proa: -0.38, texto: 'Pouse no H da base' },
    ],
  },
};
export const ROTAS_ORDEM = ['aerodromo', 'lagoa', 'hospital', 'serra', 'costa'];

// altitude mínima da perna: maior relevo no caminho + 500 ft, arredondada para cima de 100 em 100 ft
function altitudeSegura(x0, z0, x1, z1) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.ceil(d / 40)); let max = 0;
  for (let i = 0; i <= n; i++) { const t = i / n; max = Math.max(max, elevacao(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)); }
  return max < 15 ? 0 : Math.ceil((max / FT + 500) / 100) * 100; // margem de 500 ft só onde há relevo
}
// prepara a rota: altitudes seguras e pontos 3D para a linha do caminho
export function prepararRota(r) {
  const passos = r.passos.map(p => ({ ...p }));
  let px = r.inicio.x, pz = r.inicio.z, ult = 0;
  for (const p of passos) {
    if (p.tipo === 'pousar') { const hp = HELIPONTOS[p.heli]; p.x = hp.x; p.z = hp.z; }
    if (p.tipo === 'wp') { p.altFt = Math.max(p.altFt, altitudeSegura(px, pz, p.x, p.z)); ult = p.altFt; }
    if (p.tipo === 'pairar') { p.altFt = elevacao(p.x, p.z) / FT + p.aglFt; p.altViagemFt = Math.max(p.altFt + 300, altitudeSegura(px, pz, p.x, p.z)); ult = p.altViagemFt; }
    if (p.tipo === 'pousar') p.altFt = Math.max(ult, 300);
    if (p.x != null) { px = p.x; pz = p.z; }
  }
  return passos;
}

export class MissaoRota extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx);
    const r = this.rota = ROTAS[ctx.id]; this.id = ctx.id;
    this.passos = prepararRota(r); this.i = 0;
    h.reset({ hpFt: 0, oatC: 25, ventoKt: r.vento.kt, ventoDirDeg: r.vento.dir, x: r.inicio.x, z: r.inicio.z, yaw: r.inicio.yaw, combustivelL: h.ac.combustivelL * 0.8 });
    this.objs = this.passos.map(p => this.obj(p.tipo === 'wp' ? `${p.nome} (${p.altFt} ft)` : p.tipo === 'pairar' ? `${p.nome}: pairar ${p.aglFt} ft por ${p.dur} s` : p.tipo === 'pousar' ? `Pousar: ${HELIPONTOS[p.heli].nome}` : 'Decolar'));
    this.foraAlt = 0; this.tPair = 0; this.duro = 0; this.tVoo = 0;
    // marcadores: anéis, vítima e a linha do caminho
    const pts = [{ x: r.inicio.x, y: 3, z: r.inicio.z }];
    let px = r.inicio.x, pz = r.inicio.z;
    this.passos.forEach((p, k) => {
      if (p.tipo === 'wp') { const rot = Math.atan2(p.x - px, p.z - pz); c.anel(p.x, p.altFt * FT, p.z, 24, 0xff6a00, rot); c.rotulo(`${k} ${p.nome}`, p.x, p.altFt * FT + 34, p.z); pts.push({ x: p.x, y: p.altFt * FT, z: p.z }); }
      if (p.tipo === 'pairar') { const y0 = elevacao(p.x, p.z); c.caixaAlvo(p.x, y0 + p.aglFt * FT, p.z, 14, 40 * FT, 0xff6a00); c.cone(p.x, p.z, 0xff3b30, 2, y0); c.rotulo('VÍTIMA', p.x, y0 + p.aglFt * FT + 30, p.z, '#ff3b30'); pts.push({ x: p.x, y: p.altViagemFt * FT, z: p.z }, { x: p.x, y: p.altFt * FT, z: p.z }); }
      if (p.tipo === 'pousar') pts.push({ x: p.x, y: 3, z: p.z });
      if (p.x != null) { px = p.x; pz = p.z; }
    });
    c.linhaRota?.(pts);
    this.msgs.push(this.passos[0].texto);
  }
  get passo_() { return this.passos[this.i]; }
  avancar() {
    this.objs[this.i].feito = true; this.i++;
    const p = this.passos[this.i]; if (p) this.msgs.push('Próximo: ' + p.texto);
  }
  passo(dt) {
    const h = this.h, p = this.passos[this.i]; if (!p) return;
    if (!h.noSolo) this.tVoo += dt;
    if (naAgua(h.pos.x, h.pos.z) && h.noSolo) { this.falhar('Pousou na água. Em voo sobre a água, mantenha altura e escolha antes um local de pouso em terra.'); return; }
    if (p.tipo === 'decolar') { if (!h.noSolo && h.alturaFt > 25) this.avancar(); return; }
    if (p.tipo === 'wp') {
      const dAlt = h.pos.y / FT - p.altFt, vs = -h.descidaFtMin; // vs > 0 subindo
      if (h.alturaFt > 50 && ((dAlt < -200 && vs < 200) || (dAlt > 200 && vs > -200))) this.foraAlt += dt; // longe da altitude e sem corrigir
      if (h.alturaFt < 150 && this.i > 1 && dist2(h.pos, p.x, p.z) > 300) this.dica('baixo', 'Muito baixo para a navegação: suba para a altitude da perna (marcador magenta no altímetro).', 10);
      if (dist2(h.pos, p.x, p.z) < (p.raio ?? 80)) this.avancar();
      return;
    }
    if (p.tipo === 'pairar') {
      const d = dist2(h.pos, p.x, p.z);
      if (d < 12 && Math.abs(h.alturaFt - p.aglFt) < 20 && !h.noSolo) { this.tPair += dt; if (Math.floor(this.tPair) !== Math.floor(this.tPair - dt)) this.dica('pair', `Içamento: ${Math.floor(this.tPair)} de ${p.dur} s. Segure a posição.`, 0.9); }
      else if (d < 40 && this.tPair > 0) this.dica('posPair', 'Saiu da posição do içamento: volte para cima da vítima, 50 ft.', 4);
      if (this.tPair >= p.dur) { this.msgs.push('Vítima a bordo!'); this.avancar(); }
    }
  }
  onPousou(e) {
    const h = this.h, p = this.passos[this.i];
    if (!p || p.tipo !== 'pousar') { if (this.i > 0) this.dica('cedo', 'Ainda não chegou ao destino. Decole e siga a rota (seta e linha laranja).', 6); return; }
    const d = dist2(h.pos, p.x, p.z);
    if (d < 12) {
      this.objs[this.i].feito = true; this.i++;
      let est = 3 - (this.duro ? 1 : 0) - (d > 5 ? 1 : 0) - (this.foraAlt > Math.max(30, this.tVoo * 0.25) ? 1 : 0);
      this.concluir(Math.max(1, est), `Rota concluída em ${mmss(this.tVoo)}. Pouso a ${d.toFixed(0)} m do centro${this.duro ? ' (pouso duro)' : ''}. ${this.foraAlt.toFixed(0)} s fora da altitude das pernas.`);
    } else this.dica('longe', `Pousou a ${d.toFixed(0)} m do heliponto. Decole e pouse no centro do H.`, 5);
  }
  dicasGerais() { for (const e of this.h.eventos) if (e.nome === 'pousoDuro') this.duro++; super.dicasGerais(); }
  guia() {
    const h = this.h, p = this.passos[this.i]; if (!p) return null;
    const cruz = Math.min(75, Math.round(h.ac.vneKt * 0.7));
    if (p.tipo === 'decolar') return { modo: 'subidaVertical', x: this.rota.inicio.x, z: this.rota.inicio.z, altFt: 60, proa: this.rota.inicio.yaw, texto: p.texto };
    if (p.tipo === 'wp') { const subir = p.altFt * FT - h.pos.y; return { modo: 'waypoint', x: p.x, z: p.z, altFt: p.altFt, kias: subir > 90 ? Math.min(cruz, 55) : (p.kias ?? cruz), vMax: subir > 10 ? 4.5 : 2.5, texto: p.texto }; }
    if (p.tipo === 'pairar') { const d = dist2(h.pos, p.x, p.z); return d > 130 ? { modo: 'waypoint', x: p.x, z: p.z, altFt: d > 600 ? p.altViagemFt : p.altFt + 60, kias: Math.max(25, Math.min(cruz, d / 9)), vMax: 2.5, texto: p.texto } : { modo: 'pairado', x: p.x, z: p.z, altFt: p.altFt, proa: null, texto: p.texto }; }
    return { modo: 'aproximacao', x: p.x, z: p.z, altFt: p.altFt, kias: 55, proa: p.proa ?? null, anguloDeg: 9, texto: p.texto };
  }
}
