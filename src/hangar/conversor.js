// Aba "Conversões" do Hangar da Turma (cartão "Conversões e calculadoras"): conversões de aviação (as dos POH do R22 e do R44/R66 e as de uso diário),
// calculadora de tempo (horas de voo, horários, tempo por distância e velocidade) e calculadora comum.
// O cartão é montado uma vez e reaproveitado a cada vez que o Início é redesenhado, para não apagar o que a pessoa digitou.

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
// Sem `casas`: até 4 casas decimais (valores a partir de 1) ou 5 algarismos significativos (valores pequenos). Com `casas`: algarismos significativos.
const fmtN = (v, casas) => { if (!Number.isFinite(v)) return ''; const r = casas ? Number(v.toPrecision(casas)) : Math.abs(v) >= 1 ? Number(v.toFixed(4)) : Number(v.toPrecision(5)); return String(r).replace('.', ','); };
const parseN = (t) => { const s = String(t ?? '').trim().replace(/\s/g, '').replace('−', '-').replace(',', '.'); if (s === '' || s === '-' || s === '.') return null; const x = Number(s); return Number.isFinite(x) ? x : null; };

// Par de unidades: ab(textoA) → textoB e ba(textoB) → textoA.
const num = (a, b, f, g) => ({ a, b, ab: (t) => { const x = parseN(t); return x == null ? '' : fmtN(f(x)); }, ba: (t) => { const y = parseN(t); return y == null ? '' : fmtN(g(y)); } });
const lin = (a, b, k) => num(a, b, (x) => x * k, (y) => y / k);

// Horário "15:30", "15h30" ou "1530" → minutos do dia (ou de duração).
const hm = (t) => { const m = /^\s*(\d{1,3})\s*[:hH]?\s*(\d{2})/.exec(String(t || '')); if (!m) return null; const h = +m[1], mi = +m[2]; return mi < 60 ? h * 60 + mi : null; };
const hmTxt = (min) => `${min < 0 ? '−' : ''}${Math.floor(Math.abs(min) / 60)}:${pad(Math.round(Math.abs(min)) % 60)}`;
const horaTxt = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
// Duração digitada como "1:30", "1h30" ou decimal "1,5" (horas) → minutos.
const dur = (t) => { const s = String(t || '').trim(); if (!s) return null; if (/[:hH]/.test(s)) return hm(s); const x = parseN(s); return x == null ? null : Math.round(x * 60); };

const hora = { a: 'Brasília (UTC−3)', b: 'Zulu (UTC)',
  ab: (t) => { const m = hm(t); if (m == null || m >= 1440) return ''; const z = m + 180; return horaTxt(z % 1440) + (z >= 1440 ? ' (dia seguinte)' : ''); },
  ba: (t) => { const m = hm(t); if (m == null || m >= 1440) return ''; const l = m - 180; return horaTxt((l + 1440) % 1440) + (l < 0 ? ' (dia anterior)' : ''); } };
const coord = { a: 'graus decimais', b: 'graus, minutos e segundos',
  ab: (t) => { const x = parseN(t); if (x == null) return ''; const ab = Math.abs(x); let d = Math.floor(ab), m = Math.floor((ab - d) * 60), s = Math.round((((ab - d) * 60) - m) * 600) / 10;
    if (s >= 60) { s = 0; m++; } if (m >= 60) { m = 0; d++; } return `${x < 0 ? '−' : ''}${d}° ${m}' ${String(s).replace('.', ',')}"`; },
  ba: (t) => { const s = String(t || '').toUpperCase(), nums = (s.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => parseN(x)); if (!nums.length) return '';
    const v = nums[0] + (nums[1] || 0) / 60 + (nums[2] || 0) / 3600, neg = /^\s*[-−]/.test(s) || /[SWO]\s*$/.test(s.trim()); return fmtN(neg ? -v : v, 8); } };

const CATEGORIAS = [
  ['Distância e altura', [lin('pé (ft)', 'metro (m)', 0.3048), lin('milha náutica (NM)', 'quilômetro (km)', 1.852), lin('milha náutica (NM)', 'pé (ft)', 6076.12),
    lin('milha terrestre (SM)', 'metro (m)', 1609.344), lin('milha terrestre (SM)', 'milha náutica (NM)', 0.868976), lin('polegada (in)', 'milímetro (mm)', 25.4)]],
  ['Velocidade', [lin('nó (kt)', 'km/h', 1.852), lin('nó (kt)', 'metro/segundo (m/s)', 0.514444), lin('milha/hora (mph)', 'nó (kt)', 0.868976), lin('ft/min', 'm/s', 0.00508)]],
  ['Peso e combustível', [lin('quilo (kg)', 'libra (lb)', 2.20462), lin('galão americano', 'litro (L)', 3.78541), lin('galão imperial', 'litro (L)', 4.54609),
    lin('AVGAS (L)', 'AVGAS (kg) · 0,72 kg/L', 0.72), lin('AVGAS (galão US)', 'AVGAS (lb) · 6,0 lb/gal', 6), lin('quart (qt, óleo)', 'litro (L)', 0.946353)]],
  ['Pressão', [lin('polegada de mercúrio (inHg)', 'hectopascal (hPa)', 33.8639), lin('milímetro de mercúrio (mmHg)', 'hectopascal (hPa)', 1.33322), lin('psi', 'quilopascal (kPa)', 6.89476)]],
  ['Temperatura e potência', [num('°C', '°F', (c) => c * 9 / 5 + 32, (f) => (f - 32) * 5 / 9), lin('HP', 'quilowatt (kW)', 0.7457)]],
  ['Hora', [hora]],
  ['Coordenadas', [coord]],
];

// ---------- avaliador da calculadora (sem eval) ----------
function avaliar(src) {
  const t = String(src).replace(/\s+/g, '').replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  if (!t) return null;
  let i = 0; const peek = () => t[i];
  const expr = () => { let v = termo(); while (peek() === '+' || peek() === '-') { const o = t[i++], r = termo(); v = o === '+' ? v + r : v - r; } return v; };
  const termo = () => { let v = fator(); while (peek() === '*' || peek() === '/') { const o = t[i++], r = fator(); v = o === '*' ? v * r : v / r; } return v; };
  const fator = () => { let v = unario(); while (peek() === '%') { i++; v /= 100; } return v; };
  const unario = () => { if (peek() === '-') { i++; return -unario(); } if (peek() === '+') { i++; return unario(); } return prim(); };
  const prim = () => {
    if (peek() === '(') { i++; const v = expr(); if (peek() !== ')') throw new Error('x'); i++; return v; }
    const m = /^(\d+\.?\d*|\.\d+)/.exec(t.slice(i)); if (!m) throw new Error('x'); i += m[0].length; return parseFloat(m[0]);
  };
  const v = expr(); if (i !== t.length) throw new Error('x'); return v;
}

// ---------- montagem ----------
const MODOS_TEMPO = [['soma', 'Somar / subtrair'], ['entre', 'Entre dois horários'], ['eta', 'Horário ± duração'], ['nav', 'Distância ÷ velocidade'], ['dec', 'Horas ↔ decimal']];
const campo = (id, rot, ph) => `<label class="cv-c"><span class="cv-un">${rot}</span><input id="${id}" autocomplete="off" inputmode="text" placeholder="${ph || ''}"></label>`;

function html() {
  const conv = CATEGORIAS.map(([nome, pares], c) => `<div class="cv-cat" data-cat="${c}" ${c ? 'hidden' : ''}>${pares.map((p, i) => `<div class="cv-par" data-c="${c}" data-i="${i}">
      <label class="cv-c"><span class="cv-un">${esc(p.a)}</span><input data-lado="a" autocomplete="off" inputmode="${p === hora || p === coord || p.a === '°C' ? 'text' : 'decimal'}"></label><b class="cv-seta" aria-hidden="true">⇄</b>
      <label class="cv-c"><span class="cv-un">${esc(p.b)}</span><input data-lado="b" autocomplete="off" inputmode="${p === hora || p === coord || p.a === '°C' ? 'text' : 'decimal'}"></label></div>`).join('')}</div>`).join('');
  const tempo = `<div class="cv-modos chips">${MODOS_TEMPO.map(([k, n], i) => `<button type="button" class="chip" data-tm="${k}" aria-pressed="${i === 0}">${n}</button>`).join('')}</div>
    <div class="cv-tm" data-p="soma"><div class="cv-lin">${campo('tsA', 'Tempo A', '1:30 ou 1,5')}<select id="tsOp" aria-label="Operação"><option value="+">+</option><option value="-">−</option></select>${campo('tsB', 'Tempo B', '0:45')}</div><p class="cv-res" id="tsR"></p></div>
    <div class="cv-tm" data-p="entre" hidden><div class="cv-lin">${campo('teA', 'Saída / decolagem', '10:15')}${campo('teB', 'Chegada / pouso', '11:40')}</div><p class="cv-res" id="teR"></p></div>
    <div class="cv-tm" data-p="eta" hidden><div class="cv-lin">${campo('thA', 'Horário', '10:15')}<select id="thOp" aria-label="Operação"><option value="+">+</option><option value="-">−</option></select>${campo('thB', 'Duração', '1:20 ou 1,3')}</div><p class="cv-res" id="thR"></p></div>
    <div class="cv-tm" data-p="nav" hidden><div class="cv-lin">${campo('tnD', 'Distância (NM)', '45')}${campo('tnV', 'Velocidade (kt)', '85')}${campo('tnC', 'Consumo por hora (opcional)', '38')}</div><p class="cv-res" id="tnR"></p></div>
    <div class="cv-tm" data-p="dec" hidden><div class="cv-lin">${campo('tdA', 'Horas e minutos', '1:35')}<b class="cv-seta" aria-hidden="true">⇄</b>${campo('tdB', 'Horas decimais', '1,58')}</div></div>`;
  const teclas = ['C', '(', ')', '⌫', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', ',', '%', '+'];
  const calc = `<div class="cv-calc"><div class="cv-visor"><input id="ccE" class="mono" autocomplete="off" inputmode="none" placeholder="Digite ou use as teclas" aria-label="Expressão"><p class="cv-res" id="ccR">&nbsp;</p></div>
    <div class="cv-teclas">${teclas.map((k) => `<button type="button" data-k="${k}" class="${'÷×−+'.includes(k) ? 'cv-op' : 'C()⌫%'.includes(k) ? 'cv-fn' : ''}">${k}</button>`).join('')}<button type="button" class="pri cv-igual" data-k="=">=</button></div></div>`;
  return `<div class="chips cv-abas" role="tablist"><button type="button" class="chip" data-aba="conv" aria-pressed="true"><span class="cv-dial"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h13l-3-3M20 15H7l3 3"/></svg></span><span class="cv-rot">Conversões</span></button><button type="button" class="chip" data-aba="tempo" aria-pressed="false"><span class="cv-dial"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg></span><span class="cv-rot">Tempo</span></button><button type="button" class="chip" data-aba="calc" aria-pressed="false"><span class="cv-dial"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg></span><span class="cv-rot">Calculadora</span></button></div>
    <div class="cv-painel" data-aba="conv"><div class="chips">${CATEGORIAS.map(([n], c) => `<button type="button" class="chip" data-catb="${c}" aria-pressed="${c === 0}">${n}</button>`).join('')}</div>${conv}
      <p class="sub">Digite em qualquer lado: o outro se atualiza na hora. Fatores dos POH do R22 e do R44/R66 e do uso diário de aviação.</p></div>
    <div class="cv-painel" data-aba="tempo" hidden>${tempo}</div>
    <div class="cv-painel" data-aba="calc" hidden>${calc}</div>`;
}

let cartao = null;
function montar() {
  const el = document.createElement('div'); el.className = 'cv-cartao'; el.innerHTML = html();
  const $ = (s) => el.querySelector(s);
  // abas e categorias
  el.querySelectorAll('[data-aba].chip').forEach((b) => b.onclick = () => { el.querySelectorAll('[data-aba].chip').forEach((x) => x.setAttribute('aria-pressed', x === b)); el.querySelectorAll('.cv-painel').forEach((p) => { p.hidden = p.dataset.aba !== b.dataset.aba; }); });
  el.querySelectorAll('[data-catb]').forEach((b) => b.onclick = () => { el.querySelectorAll('[data-catb]').forEach((x) => x.setAttribute('aria-pressed', x === b)); el.querySelectorAll('.cv-cat').forEach((c) => { c.hidden = c.dataset.cat !== b.dataset.catb; }); });
  el.querySelectorAll('[data-tm]').forEach((b) => b.onclick = () => { el.querySelectorAll('[data-tm]').forEach((x) => x.setAttribute('aria-pressed', x === b)); el.querySelectorAll('.cv-tm').forEach((p) => { p.hidden = p.dataset.p !== b.dataset.tm; }); });
  // conversões
  el.querySelectorAll('.cv-par').forEach((par) => {
    const p = CATEGORIAS[+par.dataset.c][1][+par.dataset.i], ia = par.querySelector('[data-lado=a]'), ib = par.querySelector('[data-lado=b]');
    ia.oninput = () => { ib.value = p.ab(ia.value); }; ib.oninput = () => { ia.value = p.ba(ib.value); };
  });
  // tempo: somar / subtrair
  const v = (id) => $('#' + id).value;
  const set = (id, t) => { $('#' + id).innerHTML = t; };
  const dec = (m) => fmtN(m / 60, 4);
  const soma = () => { const a = dur(v('tsA')), b = dur(v('tsB')); if (a == null || b == null) return set('tsR', ''); const r = $('#tsOp').value === '+' ? a + b : a - b; set('tsR', `= <b>${hmTxt(r)}</b> <span class="sub">(${dec(r)} h)</span>`); };
  ['tsA', 'tsB'].forEach((id) => $('#' + id).oninput = soma); $('#tsOp').onchange = soma;
  const entre = () => { const a = hm(v('teA')), b = hm(v('teB')); if (a == null || b == null || a >= 1440 || b >= 1440) return set('teR', ''); const d = (b - a + 1440) % 1440; set('teR', `Tempo de voo: <b>${hmTxt(d)}</b> <span class="sub">(${dec(d)} h${b < a ? ' · passou da meia-noite' : ''})</span>`); };
  ['teA', 'teB'].forEach((id) => $('#' + id).oninput = entre);
  const eta = () => { const a = hm(v('thA')), b = dur(v('thB')); if (a == null || b == null || a >= 1440) return set('thR', ''); const r = $('#thOp').value === '+' ? a + b : a - b, dia = Math.floor(r / 1440), m = ((r % 1440) + 1440) % 1440;
    set('thR', `= <b>${horaTxt(m)}</b>${dia > 0 ? ' <span class="sub">(dia seguinte)</span>' : dia < 0 ? ' <span class="sub">(dia anterior)</span>' : ''}`); };
  ['thA', 'thB'].forEach((id) => $('#' + id).oninput = eta); $('#thOp').onchange = eta;
  const nav = () => { const d = parseN(v('tnD')), s = parseN(v('tnV')), c = parseN(v('tnC')); if (d == null || !s || s <= 0) return set('tnR', ''); const min = d / s * 60;
    set('tnR', `Tempo: <b>${hmTxt(min)}</b> <span class="sub">(${fmtN(min, 4)} min)</span>${c != null ? `<br>Combustível: <b>${fmtN(c * min / 60, 4)}</b> <span class="sub">na mesma unidade do consumo</span>` : ''}`); };
  ['tnD', 'tnV', 'tnC'].forEach((id) => $('#' + id).oninput = nav);
  $('#tdA').oninput = () => { const m = dur($('#tdA').value); $('#tdB').value = m == null ? '' : fmtN(m / 60, 4); };
  $('#tdB').oninput = () => { const x = parseN($('#tdB').value); $('#tdA').value = x == null ? '' : hmTxt(Math.round(x * 60)); };
  // calculadora comum
  const E = $('#ccE'), R = $('#ccR');
  const vivo = () => { if (!E.value.trim()) { R.innerHTML = '&nbsp;'; return; } try { const x = avaliar(E.value); R.innerHTML = x == null ? '&nbsp;' : Number.isFinite(x) ? `= <b>${fmtN(x, 12)}</b>` : '<span class="sub">não dá (divisão por zero)</span>'; } catch { R.innerHTML = '<span class="sub">…</span>'; } };
  E.oninput = vivo;
  E.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); igual(); } };
  const igual = () => { try { const x = avaliar(E.value); if (x != null && Number.isFinite(x)) { E.value = fmtN(x, 12); vivo(); } } catch {} };
  el.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { const k = b.dataset.k;
    if (k === 'C') E.value = ''; else if (k === '⌫') E.value = E.value.slice(0, -1); else if (k === '=') return igual(); else E.value += k; vivo(); });
  return el;
}

// Coloca o cartão (sempre o mesmo elemento) no espaço reservado da aba.
export function montarConversor(slot) { if (!slot) return; cartao ||= montar(); slot.replaceWith(cartao); }
