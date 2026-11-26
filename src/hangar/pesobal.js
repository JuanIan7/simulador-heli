// Aba "Peso e balanceamento" do Hangar da Turma (grupo Voo).
// A pessoa escolhe a aeronave, confere o peso vazio da matrícula, digita pessoas (kg), bagagem (kg) e combustível (L)
// e vê a ficha calculada como a da escola, os dois gráficos do envelope (longitudinal e lateral) e o que cada um quer dizer.
// É material de estudo: não substitui o POH/RFM nem a ficha de pesagem em vigor da aeronave.
import { AERONAVES, ORDEM } from './pesobal/aeronaves.js';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const fmt = (n, c = 2) => (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const sinal = (n, c) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n), c);

// ---------- estado (fica no aparelho) ----------
const CHAVE = 'pb-estado';
let est = { av: 'r22', kg: {}, L: {}, vazio: {} };
try { const s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (s && AERONAVES[s.av]) est = { ...est, ...s }; } catch {}
const guardar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(est)); } catch {} };
const A = () => AERONAVES[est.av];
const kgDe = (av) => (est.kg[av] ||= {});
const LDe = (av) => (est.L[av] ||= {});
function vazioDe(av) {
  const p = AERONAVES[av].vazioPadrao, v = est.vazio[av];
  return v ? { ...p, ...v } : { ...p };
}

// ---------- geometria do envelope ----------
function noSegmento([x, y], [x1, y1], [x2, y2], tol) {
  const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1e-12;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L2));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= tol;
}
// dentro ou em cima da linha (em cima da linha ainda é dentro). xs/ys normalizam os eixos para a tolerância.
export function dentro(poly, p, xs = 1, ys = 1) {
  const q = [p[0] / xs, p[1] / ys], P = poly.map(([x, y]) => [x / xs, y / ys]);
  for (let i = 0; i < P.length; i++) if (noSegmento(q, P[i], P[(i + 1) % P.length], 1e-6)) return true;
  let d = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > q[1]) !== (yj > q[1]) && q[0] < ((xj - xi) * (q[1] - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}
// faixa permitida: com eixo 'y', devolve [xmin, xmax] naquele y; com 'x', [ymin, ymax] naquele x
export function faixa(poly, eixo, v) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const [ka, kb, oa, ob] = eixo === 'y' ? [a[1], b[1], a[0], b[0]] : [a[0], b[0], a[1], b[1]];
    if ((v < Math.min(ka, kb) - 1e-9) || (v > Math.max(ka, kb) + 1e-9)) continue;
    if (Math.abs(kb - ka) < 1e-12) out.push(oa, ob);
    else out.push(oa + ((v - ka) / (kb - ka)) * (ob - oa));
  }
  return out.length ? [Math.min(...out), Math.max(...out)] : null;
}

// ---------- cálculo ----------
export function calcular(av = est.av, kg = kgDe(av), L = LDe(av), vazio = vazioDe(av)) {
  const a = AERONAVES[av], c = a.casas;
  const linhas = [];
  const vz = { id: 'vazio', nome: 'Peso vazio básico', onde: vazio.mat || '', peso: num(vazio.peso), long: num(vazio.long), lat: num(vazio.lat) };
  vz.mLong = vazio.momLong != null ? num(vazio.momLong) : vz.peso * vz.long;
  vz.mLat = vazio.momLat != null ? num(vazio.momLat) : vz.peso * vz.lat;
  linhas.push(vz);
  for (const it of a.itens) {
    const k = Math.max(0, num(kg[it.id])), p = k * a.kgParaUn;
    linhas.push({ ...it, kg: k, peso: p, mLong: p * it.long, mLat: p * it.lat });
  }
  const soma = (ls) => { const w = ls.reduce((s, l) => s + l.peso, 0), ml = ls.reduce((s, l) => s + l.mLong, 0), mt = ls.reduce((s, l) => s + l.mLat, 0); return { peso: w, mLong: ml, mLat: mt, cgLong: w ? ml / w : 0, cgLat: w ? mt / w : 0 }; };
  const zero = soma(linhas);
  const tanques = a.comb.map((t) => { const l = Math.max(0, num(L[t.id])), p = l * a.dens * a.kgParaUn; return { ...t, litros: l, kgc: l * a.dens, peso: p, mLong: p * t.long, mLat: p * t.lat }; });
  const tko = soma([...linhas, ...tanques]);
  // caminho do CG enquanto o combustível é queimado (todos os tanques na mesma proporção)
  const caminho = [];
  for (let i = 0; i <= 20; i++) { const f = i / 20; const w = zero.peso + f * (tko.peso - zero.peso); caminho.push({ f, peso: w, cgLong: w ? (zero.mLong + f * (tko.mLong - zero.mLong)) / w : 0, cgLat: w ? (zero.mLat + f * (tko.mLat - zero.mLat)) / w : 0 }); }

  // verificações
  const ck = [];
  const env = a.env;
  const ptLat = (s) => (env.lat.eixoX === 'long' ? [s.cgLong, s.cgLat] : [s.cgLat, s.peso]);
  const escalaLat = env.lat.eixoX === 'long' ? [1, 1] : [0.05, 100];
  const okLong = (s) => dentro(env.long.poly, [s.cgLong, s.peso], 0.1 * (a.br === 'm' ? 0.0254 : 1), 10);
  const okLat = (s) => dentro(env.lat.poly, ptLat(s), ...escalaLat);
  const temGente = linhas.slice(1).some((l) => l.peso > 0);
  const temComb = tanques.some((t) => t.peso > 0);
  if (!temGente) ck.push({ n: 'info', t: 'Digite pelo menos o peso do piloto para calcular.' });
  if (tko.peso > a.pmd + 1e-9) ck.push({ n: 'fora', t: `Peso de decolagem ${fmt(tko.peso, a.un === 'kg' ? 0 : 2)} ${a.un} passa do máximo (${fmt(a.pmd, 0)} ${a.un}) em ${fmt(tko.peso - a.pmd, a.un === 'kg' ? 0 : 2)} ${a.un}. Tire carga ou combustível (cerca de ${fmt((tko.peso - a.pmd) / a.kgParaUn / a.dens, 0)} L).` });
  if (temGente && zero.peso < a.pmin - 1e-9) ck.push({ n: 'fora', t: `Sem combustível o peso fica em ${fmt(zero.peso, 0)} ${a.un}, abaixo do mínimo de ${fmt(a.pmin, 0)} ${a.un}${a.familia === 'Esquilo' ? ' (início do gráfico de CG)' : ''}.` });
  for (const l of linhas.slice(1)) if (l.maxUn && l.peso > l.maxUn + 1e-9) ck.push({ n: 'fora', t: `${l.nome} ${l.onde}: ${fmt(l.peso, 1)} ${a.un}, acima do máximo de ${fmt(l.maxUn, 0)} ${a.un}.` });
  if (a.porAssentoUn) for (const lado of ['d', 'e']) {
    const s = linhas.filter((l) => l.lado === lado).reduce((x, l) => x + l.peso, 0);
    if (s > a.porAssentoUn + 1e-9) ck.push({ n: 'fora', t: `Assento ${lado === 'd' ? 'direito' : 'esquerdo'} com a bagagem daquele lado: ${fmt(s, 2)} ${a.un}, acima de ${a.porAssentoUn} ${a.un} por assento.` });
  }
  for (const t of tanques) if (t.litros > t.maxL + 1e-9) ck.push({ n: 'fora', t: `${t.nome} no ${t.onde}: ${fmt(t.litros, 0)} L, acima da capacidade de ${t.maxL} L.` });
  if (av === 'r22' && num(kg.pil) <= 0 && num(kg.pax) > 0) ck.push({ n: 'fora', t: 'No R22, voo solo só do assento direito. Ponha o piloto no assento direito.' });
  if (av === 'r22' && num(kg.pax) <= 0 && num(kg.pil) > 0 && (num(kg.pil) + num(kg.bagd) + num(kg.bage)) * 2.2 < 135) ck.push({ n: 'aviso', t: 'Voo solo com piloto + bagagem abaixo de 135 lb (61 kg): o POH manda calcular e pode exigir lastro para o CG não passar do limite traseiro.' });
  if (temGente) {
    // com o peso fora da faixa o aviso de peso já basta; só acusa CG onde o gráfico não depende do peso
    const pesoOk = (s) => s.peso <= a.pmd + 1e-9 && s.peso >= a.pmin - 1e-9;
    const fl = (s) => (!pesoOk(s) || okLong(s) ? '' : 'longitudinal'), ft = (s) => ((!pesoOk(s) && env.lat.eixoY === 'peso') || okLat(s) ? '' : 'lateral');
    const sitT = [fl(tko), ft(tko)].filter(Boolean), sitZ = [fl(zero), ft(zero)].filter(Boolean);
    const meio = caminho.filter((p) => !(okLong(p) && okLat(p)) && p.f > 0 && p.f < 1);
    if (temComb && sitT.length) ck.push({ n: 'fora', t: `Decolagem: CG ${sitT.join(' e ')} fora do envelope.` + dica(a, tko, sitT) });
    if (sitZ.length) ck.push({ n: 'fora', t: `${temComb ? 'Sem combustível (fim do voo)' : 'Peso sem combustível'}: CG ${sitZ.join(' e ')} fora do envelope.` + dica(a, zero, sitZ) });
    if (!sitT.length && !sitZ.length && meio.length) ck.push({ n: 'fora', t: 'Na decolagem e sem combustível o CG fica dentro, mas sai do envelope no meio do voo, enquanto o combustível é queimado.' });
  }
  const fora = ck.some((x) => x.n === 'fora');
  return { a, linhas, tanques, zero, tko, caminho, ck, fora, temGente, temComb, okLong, okLat };
}
function dica(a, s, qual) {
  const env = a.env.long, f = faixa(env.poly, 'y', s.peso);
  if (qual.includes('longitudinal') && f) {
    if (s.cgLong > f[1]) return ` O CG está atrás do limite traseiro (${fmt(f[1], a.casas)} ${a.br} nesse peso): ponha peso mais à frente${a.familia === 'Robinson' ? ' ou lastro, conforme o POH' : ' ou tire carga do bagageiro traseiro'}.`;
    if (s.cgLong < f[0]) return ` O CG está à frente do limite dianteiro (${fmt(f[0], a.casas)} ${a.br} nesse peso): tire peso da frente ou ponha carga mais atrás.`;
  }
  if (qual.includes('lateral')) return ` O CG lateral está ${s.cgLat > 0 ? 'para a direita' : 'para a esquerda'} demais: equilibre a carga entre os lados.`;
  return '';
}

// ---------- gráfico (SVG) ----------
function grafico({ env, pts, cam, rotX, rotY, casasX, casasY, id }) {
  const W = 380, H = 270, ml = 52, mr = 14, mt = 14, mb = 40;
  const [x0, x1, dxT] = env.x, [y0, y1, dyT] = env.y;
  const X = (v) => ml + ((v - x0) / (x1 - x0)) * (W - ml - mr), Y = (v) => H - mb - ((v - y0) / (y1 - y0)) * (H - mt - mb);
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  let g = '';
  for (let v = x0; v <= x1 + 1e-9; v += dxT) g += `<line x1="${X(v)}" y1="${mt}" x2="${X(v)}" y2="${H - mb}" class="pb-gl"/><text x="${X(v)}" y="${H - mb + 15}" class="pb-tick" text-anchor="middle">${fmt(v, casasX)}</text>`;
  for (let v = y0; v <= y1 + 1e-9; v += dyT) g += `<line x1="${ml}" y1="${Y(v)}" x2="${W - mr}" y2="${Y(v)}" class="pb-gl${Math.abs(v) < 1e-9 ? ' zero' : ''}"/><text x="${ml - 6}" y="${Y(v) + 4}" class="pb-tick" text-anchor="end">${fmt(v, casasY)}</text>`;
  const poly = env.poly.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  const vert = env.poly.map(([x, y]) => `<circle cx="${X(x)}" cy="${Y(y)}" r="2.2" class="pb-vert"/>`).join('');
  const linha = cam.length > 1 ? `<polyline points="${cam.map(([x, y]) => `${cl(X(x), ml, W - mr).toFixed(1)},${cl(Y(y), mt, H - mb).toFixed(1)}`).join(' ')}" class="pb-caminho"/>` : '';
  const marcas = pts.map((p) => { const x = cl(X(p.x), ml, W - mr), y = cl(Y(p.y), mt, H - mb); return p.cheio
    ? `<circle cx="${x}" cy="${y}" r="6" class="pb-pt ${p.ok ? 'ok' : 'fora'}"/><text x="${Math.min(x + 9, W - mr - 62)}" y="${Math.max(y - 7, mt + 11)}" class="pb-rot ${p.ok ? '' : 'fora'}">${p.rot}</text>`
    : `<circle cx="${x}" cy="${y}" r="5.5" class="pb-pt oco ${p.ok ? 'ok' : 'fora'}"/><text x="${x - 9}" y="${y + 15}" text-anchor="end" class="pb-rot ${p.ok ? '' : 'fora'}">${p.rot}</text>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="pb-svg" role="img" aria-labelledby="${id}-t"><title id="${id}-t">${esc(rotY)} × ${esc(rotX)}</title>
    ${g}<polygon points="${poly}" class="pb-env"/>${vert}${linha}${marcas}
    <text x="${(ml + W - mr) / 2}" y="${H - 6}" class="pb-eixo" text-anchor="middle">${esc(rotX)}</text>
    <text x="13" y="${(mt + H - mb) / 2}" class="pb-eixo" text-anchor="middle" transform="rotate(-90 13 ${(mt + H - mb) / 2})">${esc(rotY)}</text></svg>`;
}

// ---------- telas ----------
function seletor() {
  const fam = {};
  for (const k of ORDEM) (fam[AERONAVES[k].familia] ||= []).push(k);
  return `<div class="pb-sel">${Object.entries(fam).map(([f, ks]) => `<div class="pb-fam"><span class="pb-famnome">${esc(f)}</span>${ks.map((k) => `<button class="mini${k === est.av ? ' pri' : ''}" data-pb-av="${k}" aria-pressed="${k === est.av}">${esc(AERONAVES[k].curto)}</button>`).join('')}</div>`).join('')}
    <div class="pb-fam"><span class="pb-famnome">Em breve</span><span class="sub">R44, R66 e outras, conforme o curso avançar</span></div></div>`;
}
function cartaoVazio() {
  const a = A(), v = vazioDe(est.av), padrao = !est.vazio[est.av];
  return `<div class="caixa pb-vazio"><h3>1. Peso vazio da aeronave</h3>
    <p class="sub">Vem da ficha de pesagem da matrícula (${a.familia === 'Robinson' ? 'POH Seção 6, Weight and Balance Record' : 'RFM Seção 6, ficha de pesagem'}). Cada aeronave tem a sua e ela muda a cada pesagem ou troca de equipamento.</p>
    <div class="pb-campos">
      <label>Matrícula<input data-pb-vz="mat" value="${esc(v.mat)}" maxlength="12" autocomplete="off"></label>
      <label>Peso vazio (${a.un})<input data-pb-vz="peso" inputmode="decimal" value="${esc(fmt(num(v.peso), 2))}"></label>
      <label>Braço long. (${a.br})<input data-pb-vz="long" inputmode="decimal" value="${esc(fmt(num(v.long), a.casas))}"></label>
      <label>Braço lat. (${a.br})<input data-pb-vz="lat" inputmode="decimal" value="${esc(fmt(num(v.lat), a.casas))}"></label>
    </div>
    <p class="sub">${padrao ? `Agora: ${esc(a.vazioPadrao.fonte)}. Para outra matrícula, digite os dados da ficha dela (ficam guardados neste aparelho).` : 'Agora: dados digitados por você (guardados neste aparelho).'} <button class="mini" data-pb-restaurar>Voltar ao padrão (${esc(a.vazioPadrao.mat)})</button></p></div>`;
}
function cartaoCarga() {
  const a = A(), kg = kgDe(est.av), L = LDe(est.av), conv = a.kgParaUn !== 1;
  const lin = (it) => `<label class="pb-item"><span><b>${esc(it.nome)}</b> <span class="sub">${esc(it.onde)}${it.maxUn ? ` · máx. ${it.maxUn} ${a.un}` : ''}</span></span>
      <span class="pb-ent"><input data-pb-kg="${it.id}" inputmode="decimal" placeholder="0" value="${kg[it.id] ? esc(String(kg[it.id]).replace('.', ',')) : ''}"><i>kg</i>${conv ? `<output data-pb-conv="${it.id}"></output>` : ''}</span></label>`;
  const tq = (t) => `<label class="pb-item"><span><b>${esc(t.nome)}</b> <span class="sub">${esc(t.onde)} · máx. ${t.maxL} L</span></span>
      <span class="pb-ent"><input data-pb-l="${t.id}" inputmode="decimal" placeholder="0" value="${L[t.id] ? esc(String(L[t.id]).replace('.', ',')) : ''}"><i>L</i><output data-pb-conv="${t.id}"></output></span></label>`;
  return `<div class="caixa pb-carga"><h3>2. O que vai a bordo</h3>
    <p class="sub">Pese-se vestido, com capacete ou headset. Combustível: só o utilizável, em litros. ${conv ? `A conta converte: kg × ${fmt(a.kgParaUn, 1)} = ${a.un}; L × ${fmt(a.dens, 2)} = kg.` : `Combustível: L × ${fmt(a.dens, 2)} = kg.`}</p>
    <div class="pb-lista">${a.itens.map(lin).join('')}${a.comb.map(tq).join('')}</div>
    <div class="linha-acao"><button class="mini" data-pb-exemplo>Carregar: ${esc(a.exemplo.nome)}</button><button class="mini" data-pb-zerar>Zerar carga</button><button class="mini" data-pb-print>🖨️ Imprimir ficha</button></div></div>`;
}
function veredito(r) {
  const a = r.a;
  if (!r.temGente) return `<div class="pb-ver info"><b>Preencha a carga</b><span>Comece pelo peso do piloto. Os gráficos se movem enquanto você digita.</span></div>`;
  const ok = !r.fora;
  const t = r.tko, z = r.zero, c = a.casas;
  return `<div class="pb-ver ${ok ? 'ok' : 'fora'}"><b>${ok ? '✅ Dentro dos limites' : '⛔ Fora dos limites: não decole assim'}</b>
    <span>${r.temComb ? `Decolagem: <b>${fmt(t.peso, a.un === 'kg' ? 0 : 2)} ${a.un}</b>, CG long. <b>${fmt(t.cgLong, c)} ${a.br}</b>, CG lat. <b>${sinal(t.cgLat, c)} ${a.br}</b> · ` : ''}Sem combustível: <b>${fmt(z.peso, a.un === 'kg' ? 0 : 2)} ${a.un}</b>, CG long. <b>${fmt(z.cgLong, c)} ${a.br}</b>, CG lat. <b>${sinal(z.cgLat, c)} ${a.br}</b></span>
    ${r.ck.length ? `<ul>${r.ck.map((x) => `<li class="${x.n}">${esc(x.t)}</li>`).join('')}</ul>` : ''}</div>`;
}
function tabela(r) {
  const a = r.a, c = a.casas, d = 2, conv = a.kgParaUn !== 1;
  const tr = (l, cls = '') => `<tr class="${cls}"><td>${esc(l.nome)}${l.onde ? ` <span class="sub">${esc(l.onde)}</span>` : ''}</td>${conv ? `<td class="n">${l.kg != null ? fmt(l.kg, 1) + ' kg' : l.litros != null ? fmt(l.litros, 1) + ' L' : ''}</td>` : `<td class="n">${l.litros != null ? fmt(l.litros, 0) + ' L' : ''}</td>`}<td class="n">${fmt(l.peso, d)}</td><td class="n">${l.long != null ? fmt(l.long, c) : ''}</td><td class="n">${l.lat != null ? sinal(l.lat, c) : ''}</td><td class="n">${fmt(l.mLong, d)}</td><td class="n">${sinal(l.mLat, d)}</td></tr>`;
  const res = (nome, s, ok) => `<tr class="pb-res ${ok ? '' : 'fora'}"><td><b>${nome}</b></td><td></td><td class="n"><b>${fmt(s.peso, d)}</b></td><td class="n"><b>${fmt(s.cgLong, c)}</b></td><td class="n"><b>${sinal(s.cgLat, c)}</b></td><td class="n">${fmt(s.mLong, d)}</td><td class="n">${sinal(s.mLat, d)}</td></tr>`;
  const okS = (s) => r.okLong(s) && r.okLat(s);
  return `<div class="caixa pb-ficha"><h3>3. A ficha calculada</h3>
    <p class="sub">Igual à ficha da escola: momento = peso × braço; CG = soma dos momentos ÷ soma dos pesos. Nas linhas de resultado, as colunas de braço mostram o CG.</p>
    <div class="nv-rolar"><table class="nv-tab pb-tab"><thead><tr><th>Item</th><th class="n">${conv ? 'Digitado' : 'Litros'}</th><th class="n">Peso (${a.un})</th><th class="n">Braço long. (${a.br})</th><th class="n">Braço lat. (${a.br})</th><th class="n">Mom. long. (${a.mom})</th><th class="n">Mom. lat. (${a.mom})</th></tr></thead><tbody>
    ${r.linhas.map((l, i) => tr(l, i === 0 ? 'pb-fixa' : '')).join('')}
    ${res('Sem combustível utilizável', r.zero, okS(r.zero))}
    ${r.tanques.map((t) => tr(t)).join('')}
    ${res('Decolagem', r.tko, okS(r.tko))}
    </tbody></table></div></div>`;
}
function cartaoGraficos(r) {
  const a = r.a, env = a.env, c = a.casas, t = r.tko, z = r.zero;
  const latX = env.lat.eixoX === 'long';
  const pLong = [], pLat = [];
  if (r.temGente) {
    pLong.push({ x: z.cgLong, y: z.peso, rot: 'Sem comb.', cheio: false, ok: r.okLong(z) });
    pLat.push({ x: latX ? z.cgLong : z.cgLat, y: latX ? z.cgLat : z.peso, rot: 'Sem comb.', cheio: false, ok: r.okLat(z) });
    if (r.temComb) {
      pLong.push({ x: t.cgLong, y: t.peso, rot: 'Decolagem', cheio: true, ok: r.okLong(t) });
      pLat.push({ x: latX ? t.cgLong : t.cgLat, y: latX ? t.cgLat : t.peso, rot: 'Decolagem', cheio: true, ok: r.okLat(t) });
    }
  }
  const camL = r.temGente && r.temComb ? r.caminho.map((p) => [p.cgLong, p.peso]) : [];
  const camT = r.temGente && r.temComb ? r.caminho.map((p) => (latX ? [p.cgLong, p.cgLat] : [p.cgLat, p.peso])) : [];
  const casasLong = a.br === 'm' ? 2 : 0, casasLat = a.br === 'm' ? 2 : 0;
  const g1 = grafico({ env: env.long, pts: pLong, cam: camL, rotX: `CG longitudinal (${a.br})`, rotY: `Peso (${a.un})`, casasX: casasLong, casasY: 0, id: 'pbG1' });
  const g2 = latX
    ? grafico({ env: env.lat, pts: pLat, cam: camT, rotX: `CG longitudinal (${a.br})`, rotY: `CG lateral (${a.br}) · + direita`, casasX: casasLong, casasY: casasLat, id: 'pbG2' })
    : grafico({ env: env.lat, pts: pLat, cam: camT, rotX: `CG lateral (${a.br}) · esquerda − / + direita`, rotY: `Peso (${a.un})`, casasX: casasLat, casasY: 0, id: 'pbG2' });

  // textos que explicam o gráfico e onde o ponto caiu
  const s = r.temComb ? t : z, nomeS = r.temComb ? 'Na decolagem' : 'Sem combustível';
  const fL = r.temGente ? faixa(env.long.poly, 'y', s.peso) : null;
  const txtLong = !r.temGente ? '' : fL
    ? `${nomeS}, com ${fmt(s.peso, a.un === 'kg' ? 0 : 2)} ${a.un}, o CG pode ficar entre <b>${fmt(fL[0], c)}</b> e <b>${fmt(fL[1], c)} ${a.br}</b>. O seu está em <b>${fmt(s.cgLong, c)} ${a.br}</b>: ${s.cgLong < fL[0] ? `<b class="pb-mau">${fmt(fL[0] - s.cgLong, c)} ${a.br} à frente do limite</b>` : s.cgLong > fL[1] ? `<b class="pb-mau">${fmt(s.cgLong - fL[1], c)} ${a.br} atrás do limite</b>` : `sobram ${fmt(s.cgLong - fL[0], c)} ${a.br} até o limite dianteiro e ${fmt(fL[1] - s.cgLong, c)} ${a.br} até o traseiro`}.`
    : `${nomeS}, o peso de ${fmt(s.peso, 0)} ${a.un} está fora da faixa do gráfico (${fmt(a.pmin, 0)} a ${fmt(a.pmd, 0)} ${a.un}).`;
  let txtLat = '';
  if (r.temGente) {
    if (latX) { const f = faixa(env.lat.poly, 'x', s.cgLong); txtLat = f ? `Com o CG longitudinal em ${fmt(s.cgLong, c)} ${a.br}, o lateral pode ir de <b>${sinal(f[0], c)}</b> a <b>${sinal(f[1], c)} ${a.br}</b>. O seu está em <b>${sinal(s.cgLat, c)} ${a.br}</b>${s.cgLat < f[0] || s.cgLat > f[1] ? ': <b class="pb-mau">fora</b>' : ''}.` : `O CG longitudinal (${fmt(s.cgLong, c)} ${a.br}) está fora da faixa do gráfico lateral.`; }
    else { const f = faixa(env.lat.poly, 'y', s.peso); txtLat = f ? `Com ${fmt(s.peso, 0)} ${a.un}, o CG lateral pode ir de <b>${sinal(f[0], c)}</b> a <b>${sinal(f[1], c)} ${a.br}</b>. O seu está em <b>${sinal(s.cgLat, c)} ${a.br}</b> (${fmt(Math.abs(s.cgLat) * 1000, 0)} mm ${s.cgLat >= 0 ? 'para a direita' : 'para a esquerda'})${s.cgLat < f[0] || s.cgLat > f[1] ? ': <b class="pb-mau">fora</b>' : ''}.` : ''; }
  }
  const explLong = a.familia === 'Robinson'
    ? 'Cruza o <b>peso total</b> (eixo vertical) com o <b>CG longitudinal</b> (horizontal). A área colorida é o envelope do POH. Linha da esquerda: limite dianteiro (nariz pesado; falta cíclico para trás no flare). Linha da direita: limite traseiro (cauda pesada; falta cíclico para a frente). O topo é o peso máximo de decolagem (1.370 lb) e a base, o peso mínimo em voo (920 lb). Quanto mais pesado, mais estreita a faixa.'
    : 'Cruza o <b>peso total</b> (vertical) com o <b>CG longitudinal</b> (horizontal), em metros a partir do datum. A área colorida é o envelope da ficha de certificação. Esquerda: limite dianteiro. Direita: limite traseiro, que vai ficando mais à frente conforme o peso sobe. O topo é o peso máximo.';
  const explLat = latX
    ? 'Cruza o <b>CG longitudinal</b> (horizontal) com o <b>CG lateral</b> (vertical: para cima é direita, para baixo é esquerda). No R22, estreito e leve, o lado onde o peso fica conta: o piloto senta à direita (+) e o tanque principal fica à esquerda (−). A faixa lateral é mais larga perto de 98 in e mais estreita nas pontas.'
    : 'Cruza o <b>CG lateral</b> (horizontal: direita +, esquerda −) com o <b>peso</b> (vertical). O limite é de 180 mm para a esquerda e 140 mm para a direita' + (est.av === 'h125' ? '; acima de 2.250 kg, só 80 mm para cada lado' : '') + '. Com a carga normal fica longe dos limites; preocupe-se com carga de um lado só (guincho, porta aberta, bagageiro lateral cheio).';
  const legenda = `<p class="pb-leg"><span class="pb-l cheio"></span> decolagem · <span class="pb-l oco"></span> sem combustível · <span class="pb-l traco"></span> caminho do CG enquanto o combustível é queimado. Em cima da linha ainda é dentro.</p>`;
  return `<div class="pb-graficos">
    <div class="caixa"><h3>Gráfico longitudinal</h3>${g1}${legenda}<p class="pb-expl">${explLong}</p>${txtLong ? `<p class="pb-onde">${txtLong}</p>` : ''}</div>
    <div class="caixa"><h3>Gráfico lateral</h3>${g2}${legenda}<p class="pb-expl">${explLat}</p>${txtLat ? `<p class="pb-onde">${txtLat}</p>` : ''}</div></div>`;
}
function resultados() {
  const r = calcular();
  return `${veredito(r)}${cartaoGraficos(r)}${tabela(r)}`;
}
function cartaoInfo() {
  const a = A();
  return `<details class="caixa pb-det"><summary>Notas desta aeronave</summary><ul>${a.notas.map((n) => `<li>${esc(n)}</li>`).join('')}</ul><p class="sub">${esc(a.datum)}</p></details>
    <details class="caixa pb-det"><summary>Como se faz na mão (passo a passo)</summary><ol>
      <li><b>Peso vazio:</b> copie da ficha de pesagem da matrícula o peso, os braços e os momentos.</li>
      <li><b>Pessoas e bagagem:</b> pese na balança, em kg${a.kgParaUn !== 1 ? `, e converta para ${a.un} (× ${fmt(a.kgParaUn, 1)})` : ''}. Lance cada um na linha do assento onde vai sentar.</li>
      <li><b>Momento</b> de cada linha = peso × braço. No lateral, respeite o sinal: direita +, esquerda −.</li>
      <li><b>Sem combustível:</b> some pesos e momentos; CG = momento ÷ peso.</li>
      <li><b>Combustível:</b> litros × ${fmt(a.dens, 2)} = kg${a.kgParaUn !== 1 ? ` × ${fmt(a.kgParaUn, 1)} = ${a.un}` : ''}; momento = peso × braço do tanque.</li>
      <li><b>Decolagem:</b> some o combustível à linha anterior e calcule o CG de novo.</li>
      <li><b>Confira</b> as duas condições nos <b>dois</b> gráficos. Se as duas estão dentro, o voo inteiro está (o CG anda de uma para a outra enquanto o combustível é queimado).</li></ol></details>
    <p class="sub">Fontes: ${esc(a.fontes)} Material de estudo: não substitui o POH/RFM aprovado nem a ficha de pesagem em vigor. Em caso de divergência, vale o documento oficial.</p>`;
}
function corpo() {
  return `${seletor()}<div class="pb-grade">${cartaoVazio()}${cartaoCarga()}</div><div id="pbRes">${resultados()}</div><div id="pbInfo">${cartaoInfo()}</div>`;
}
export function telaPesoBal() {
  return `<div class="cab"><h2>Peso e balanceamento</h2><span class="sub">${esc(A().nome)}</span></div>
  <p class="intro">Escolha a aeronave, confira o peso vazio da matrícula e digite quem e o que vai a bordo. A ficha é calculada como a da escola, e os dois gráficos mostram se o helicóptero fica dentro do envelope na decolagem e no fim do combustível. Os limites vêm do POH e da ficha de certificação.</p>
  <div id="pbRaiz">${corpo()}</div>`;
}

// ---------- eventos ----------
function atualizarConv(c) {
  const a = A(), kg = kgDe(est.av), L = LDe(est.av);
  for (const it of a.itens) { const o = c.querySelector(`[data-pb-conv="${it.id}"]`); if (o) o.textContent = num(kg[it.id]) ? `= ${fmt(num(kg[it.id]) * a.kgParaUn, 2)} ${a.un}` : ''; }
  for (const t of a.comb) { const o = c.querySelector(`[data-pb-conv="${t.id}"]`); if (o) { const l = num(L[t.id]); o.textContent = l ? `= ${fmt(l * a.dens, 1)} kg${a.kgParaUn !== 1 ? ` = ${fmt(l * a.dens * a.kgParaUn, 2)} ${a.un}` : ''}` : ''; } }
}
export function ligarPesoBal(c, { toast } = {}) {
  const raiz = () => c.querySelector('#pbRaiz');
  const tudo = () => { const cab = c.querySelector('.cab .sub'); if (cab) cab.textContent = A().nome; raiz().innerHTML = corpo(); atualizarConv(c); };
  const res = () => { c.querySelector('#pbRes').innerHTML = resultados(); atualizarConv(c); };
  atualizarConv(c);
  c.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pb-av],[data-pb-exemplo],[data-pb-zerar],[data-pb-restaurar],[data-pb-print]');
    if (!b) return;
    if (b.dataset.pbAv) { est.av = b.dataset.pbAv; guardar(); tudo(); }
    else if (b.hasAttribute('data-pb-exemplo')) { const ex = A().exemplo; est.kg[est.av] = { ...ex.kg }; est.L[est.av] = { ...ex.L }; delete est.vazio[est.av]; guardar(); tudo(); toast?.('Exemplo carregado.'); }
    else if (b.hasAttribute('data-pb-zerar')) { est.kg[est.av] = {}; est.L[est.av] = {}; guardar(); tudo(); }
    else if (b.hasAttribute('data-pb-restaurar')) { delete est.vazio[est.av]; guardar(); tudo(); }
    else if (b.hasAttribute('data-pb-print')) { document.body.classList.add('pb-imprimindo'); window.print(); setTimeout(() => document.body.classList.remove('pb-imprimindo'), 1000); }
  });
  c.addEventListener('input', (e) => {
    const i = e.target;
    if (i.dataset.pbKg) kgDe(est.av)[i.dataset.pbKg] = i.value.trim();
    else if (i.dataset.pbL) LDe(est.av)[i.dataset.pbL] = i.value.trim();
    else if (i.dataset.pbVz) {
      const v = { ...vazioDe(est.av) }, k = i.dataset.pbVz;
      v[k] = k === 'mat' ? i.value.toUpperCase().trim() : num(i.value);
      if (k !== 'mat') { delete v.momLong; delete v.momLat; }   // mudou peso ou braço: o momento passa a ser peso × braço
      est.vazio[est.av] = v;
    } else return;
    guardar(); res();
  });
}
// para o atendente de dúvidas e para testes
export const _teste = { calcular, dentro, faixa, set: (s) => { est = { ...est, ...s }; } };
