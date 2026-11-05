// Aba "Tempo" do Hangar da Turma: METAR e TAF dos aeródromos mais próximos, previsão hora a hora no local e os sites de referência.
// Fontes, todas gratuitas e sem chave: METAR pela VATSIM (espelho do NOAA, metar.vatsim.net), TAF pelo MET Norway (api.met.no),
// previsão pela Open-Meteo (modelos ECMWF/GFS), nome de lugares pela Nominatim (OpenStreetMap). Horários em hora local (Brasília).
// Os limites de "ok / atenção / abaixo" são referência da turma para o voo VFR de instrução no R22; a decisão é do instrutor.

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHAVE = 'tempo-local';

// Aeródromos com METAR no Sul e em São Paulo (lat, lon, elevação em ft, nome, tem TAF). SISY não tem estação: entra só como lugar.
export const ESTACOES = [
  ['SISY', -25.4507, -49.1417, 2895, 'Piraquara (EACAR)', false, true],
  ['SBBI', -25.404, -49.232, 3041, 'Curitiba · Bacacheri', true], ['SBCT', -25.529, -49.176, 2999, 'Curitiba · Afonso Pena', true],
  ['SBPG', -25.184, -50.144, 2591, 'Ponta Grossa', false], ['SBJV', -26.224, -48.797, 10, 'Joinville', true], ['SBNF', -26.88, -48.651, 16, 'Navegantes', true],
  ['SBFL', -27.671, -48.547, 16, 'Florianópolis', true], ['SBGU', -25.387, -51.52, 3494, 'Guarapuava', false], ['SBLO', -23.334, -51.13, 1847, 'Londrina', true],
  ['SBMG', -23.476, -52.017, 1781, 'Maringá', false], ['SBCA', -25, -53.501, 2470, 'Cascavel', false], ['SBTD', -24.686, -53.697, 1831, 'Toledo', true],
  ['SBFI', -25.595, -54.488, 764, 'Foz do Iguaçu', true], ['SARI', -25.737, -54.473, 879, 'Puerto Iguazú (AR)', true], ['SGES', -25.461, -54.849, 840, 'Ciudad del Este (PY)', true],
  ['SBCH', -27.132, -52.662, 2096, 'Chapecó', false], ['SBCM', -28.726, -49.425, 89, 'Criciúma', false], ['SBPF', -28.245, -52.334, 2362, 'Passo Fundo', false],
  ['SBCX', -29.195, -51.189, 2467, 'Caxias do Sul', false], ['SBCO', -29.945, -51.144, 26, 'Canoas', true], ['SBPA', -29.994, -51.171, 10, 'Porto Alegre', true],
  ['SBSM', -29.711, -53.688, 282, 'Santa Maria', true], ['SBNM', -28.282, -54.169, 1066, 'Santo Ângelo', false], ['SGGR', -24.032, -54.351, 974, 'Salto del Guairá (PY)', false],
  ['SBGR', -23.432, -46.469, 2444, 'Guarulhos', true], ['SBSP', -23.627, -46.655, 2631, 'Congonhas', true], ['SBMT', -23.509, -46.638, 2369, 'Campo de Marte', true],
  ['SBKP', -23.007, -47.135, 2162, 'Viracopos', true], ['SBSJ', -23.229, -45.861, 2100, 'São José dos Campos', true], ['SBST', -23.924, -46.305, 16, 'Santos', true],
  ['SBTA', -23.04, -45.516, 1896, 'Taubaté', false], ['SBGW', -22.792, -45.205, 1768, 'Guaratinguetá', true], ['SBRS', -22.476, -44.477, 1332, 'Resende', false],
  ['SBBU', -22.345, -49.054, 2021, 'Bauru', true], ['SBML', -22.197, -49.926, 2109, 'Marília', false], ['SBDN', -22.175, -51.427, 1437, 'Presidente Prudente', true],
  ['SBSA', -22.017, -47.883, 2818, 'São Carlos', false],
].map(([icao, lat, lon, elev, nome, taf, semMetar]) => ({ icao, lat, lon, elev, nome, taf, semMetar: !!semMetar }));

const km = (a, b) => { const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const rumo = (a, b) => { const dLon = (b.lon - a.lon) * Math.PI / 180, la = a.lat * Math.PI / 180, lb = b.lat * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lb), x = Math.cos(la) * Math.sin(lb) - Math.sin(la) * Math.cos(lb) * Math.cos(dLon); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };
const gms = (v, lat) => { const a = Math.abs(v), g = Math.floor(a), m = Math.round((a - g) * 60); return `${g}°${String(m).padStart(2, '0')}'${lat ? (v < 0 ? 'S' : 'N') : (v < 0 ? 'W' : 'E')}`; };
const hhmm = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const fuso = -3; // Brasília, sem horário de verão

// ---------- leitura de METAR e TAF ----------
const FEN = { TS: 'trovoada', RA: 'chuva', DZ: 'chuvisco', SH: 'pancadas de', FG: 'nevoeiro', BR: 'névoa úmida', HZ: 'névoa seca', FU: 'fumaça', GR: 'granizo', GS: 'granizo miúdo',
  SN: 'neve', SG: 'grãos de neve', PL: 'gelo', IC: 'cristais de gelo', VA: 'cinza vulcânica', DU: 'poeira', SA: 'areia', SQ: 'rajada súbita', FC: 'nuvem funil', PO: 'redemoinho', DS: 'tempestade de poeira', SS: 'tempestade de areia', UP: 'precipitação' };
const PREF = { VC: 'nas proximidades', MI: 'baixo', BC: 'bancos de', PR: 'parcial', DR: 'soprado', BL: 'levantado', FZ: 'congelante' };
const COB = { FEW: 'poucas', SCT: 'esparsas', BKN: 'nubladas', OVC: 'encoberto', VV: 'visibilidade vertical' };
const reFen = /^([+-])?(VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?((?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)+)$|^(VC)?(TS|SH)$/;
function fenomeno(t) {
  const m = reFen.exec(t); if (!m) return null;
  const [, int, vc, desc, lista, vc2, so] = m, partes = [];
  if (desc) partes.push(desc === 'TS' ? 'trovoada com' : desc === 'SH' ? 'pancadas de' : PREF[desc]);
  if (lista) partes.push(lista.match(/.{2}/g).map((k) => FEN[k] || k).join(' e '));
  if (so) partes.push(FEN[so]);
  if (int) partes.push(int === '+' ? 'forte' : 'fraca');
  if (vc || vc2) partes.push('nas proximidades');
  return partes.join(' ');
}
// Resume um grupo de METAR ou TAF (vento, visibilidade, fenômenos, nuvens, teto, temperatura e QNH).
export function resumir(tokens) {
  const r = { fen: [], nuvens: [], teto: null, cb: false };
  for (const t of tokens) {
    let m;
    if ((m = /^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)$/.exec(t))) { const f = m[4] === 'MPS' ? 1.944 : 1; r.vento = { dir: m[1], vel: Math.round(+m[2] * f), raj: m[3] ? Math.round(+m[3] * f) : null }; }
    else if (t === 'CAVOK') { r.vis = 10000; r.cavok = true; }
    else if (/^\d{4}$/.test(t) && !r.vis && r.vento) r.vis = +t;
    else if ((m = /^(\d+)SM$/.exec(t))) r.vis = Math.round(+m[1] * 1609);
    else if ((m = /^(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?$/.exec(t))) { const base = +m[2] * 100; r.nuvens.push({ cob: m[1], base, tipo: m[3] }); if (m[3] === 'CB') r.cb = true; if (['BKN', 'OVC', 'VV'].includes(m[1]) && (r.teto == null || base < r.teto)) r.teto = base; }
    else if (['NSC', 'SKC', 'CLR', 'NCD'].includes(t)) r.semNuvens = true;
    else if ((m = /^(M?\d{2})\/(M?\d{2})$/.exec(t))) { r.temp = +m[1].replace('M', '-'); r.orv = +m[2].replace('M', '-'); }
    else if ((m = /^Q(\d{4})$/.exec(t))) r.qnh = +m[1];
    else if ((m = /^A(\d{4})$/.exec(t))) r.qnh = Math.round(+m[1] / 100 * 33.8639);
    else if (/^NSW$/.test(t)) r.fen.push('sem fenômeno significativo');
    else { const f = fenomeno(t); if (f) r.fen.push(f); }
  }
  return r;
}
// Referência da turma para o VFR de instrução: ok, atenção (al) ou abaixo (pe).
export function classificar(r) {
  const vel = r.vento?.vel ?? 0, raj = r.vento?.raj ?? 0, fen = r.fen.join(' ');
  const pe = [], al = [];
  if (r.vis != null && r.vis < 5000) pe.push(`visibilidade ${r.vis} m`); else if (r.vis != null && r.vis < 8000) al.push(`visibilidade ${r.vis} m`);
  if (r.teto != null && r.teto < 1500) pe.push(`teto ${r.teto} ft`); else if (r.teto != null && r.teto < 3000) al.push(`teto ${r.teto} ft`);
  if (vel > 20 || raj > 25) pe.push(`vento ${vel}${raj ? '/' + raj : ''} kt`); else if (vel > 15 || raj > 20) al.push(`vento ${vel}${raj ? '/' + raj : ''} kt`);
  if (/trovoada|granizo|nuvem funil|rajada súbita/.test(fen) || r.cb) pe.push(r.cb && !/trovoada/.test(fen) ? 'CB' : fen.match(/trovoada|granizo|nuvem funil|rajada súbita/)[0]);
  else if (/nevoeiro/.test(fen)) pe.push('nevoeiro');
  else if (/chuva|pancadas|chuvisco|névoa/.test(fen)) al.push(fen);
  if (pe.length) return { n: 'pe', t: 'Abaixo dos mínimos', por: pe.join(', ') };
  if (al.length) return { n: 'al', t: 'Atenção', por: al.join(', ') };
  return { n: 'ok', t: 'Condições VFR', por: '' };
}
const ventoTxt = (v) => !v ? '—' : v.vel === 0 ? 'calmo' : `${v.dir === 'VRB' ? 'variável' : v.dir + '°'} ${v.vel} kt${v.raj ? ', rajadas ' + v.raj : ''}`;
const visTxt = (v, cavok) => cavok ? 'CAVOK (10 km+)' : v == null ? '—' : v >= 9999 ? '10 km+' : v >= 1000 ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km' : v + ' m';
const nuvensTxt = (r) => r.cavok || r.semNuvens ? 'sem nuvens significativas' : r.nuvens.length ? r.nuvens.map((n) => `${COB[n.cob]} ${n.base} ft${n.tipo ? ' ' + n.tipo : ''}`).join(', ') : '—';
function chips(r) {
  // num grupo de TAF só aparece o que o grupo cita (sem vento, sem visibilidade...): o resto continua como no grupo anterior
  const nuvens = r.cavok || r.semNuvens || r.nuvens.length;
  return `<div class="chips tp-chips">${r.vento ? `<span class="chip">💨 ${esc(ventoTxt(r.vento))}</span>` : ''}${r.vis != null ? `<span class="chip">👁 ${esc(visTxt(r.vis, r.cavok))}</span>` : ''}${nuvens ? `<span class="chip">☁️ ${r.teto != null ? 'teto ' + r.teto + ' ft' : 'sem teto'}</span>` : ''}
    ${r.fen.length ? `<span class="chip">🌧 ${esc(r.fen.join('; '))}</span>` : ''}${r.temp != null ? `<span class="chip">🌡 ${r.temp} / ${r.orv} °C</span>` : ''}${r.qnh ? `<span class="chip">QNH ${r.qnh}</span>` : ''}</div>`;
}
const horaZ = (dd, hh, mm = 0) => { const d = new Date(); d.setUTCDate(+dd); d.setUTCHours(+hh, +mm, 0, 0); if (d - Date.now() < -20 * 864e5) d.setUTCMonth(d.getUTCMonth() + 1); if (d - Date.now() > 20 * 864e5) d.setUTCMonth(d.getUTCMonth() - 1); return d; };
const diaHora = (d) => d.toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).replace('.', '');

export function lerMetar(raw) {
  const t = raw.trim().replace(/=$/, '').split(/\s+/), icao = t[0], m = /^(\d{2})(\d{2})(\d{2})Z$/.exec(t[1] || '');
  const quando = m ? horaZ(m[1], m[2], m[3]) : null, r = resumir(t.slice(2));
  return { icao, raw: raw.trim(), quando, idade: quando ? Math.round((Date.now() - quando) / 6e4) : null, r, c: classificar(r) };
}
export function lerTaf(raw) {
  const t = raw.trim().replace(/=$/, '').replace(/^TAF\s+(AMD\s+|COR\s+)?/, '').split(/\s+/);
  const icao = t[0], em = /^(\d{2})(\d{2})(\d{2})Z$/.exec(t[1] || ''), val = /^(\d{2})(\d{2})\/(\d{2})(\d{2})$/.exec(t[2] || '');
  const resto = t.slice(3).join(' ');
  const pedacos = resto.split(/\s(?=BECMG|TEMPO|PROB\d{2}|FM\d{6}|RMK)/).filter((g) => !/^RMK/.test(g));
  for (let i = 0; i < pedacos.length - 1; i++) if (/^PROB\d{2}$/.test(pedacos[i])) pedacos.splice(i, 2, pedacos[i] + ' ' + pedacos[i + 1]); // "PROB30 TEMPO …" é um grupo só
  const grupos = pedacos.map((g) => {
    const tk = g.split(/\s+/); let rot = 'Previsão base', m;
    if (tk[0] === 'BECMG' || tk[0] === 'TEMPO' || /^PROB\d{2}$/.test(tk[0])) {
      let i = 1, p = /^PROB(\d{2})$/.exec(tk[0]), pre = p ? `${p[1]}% de chance` : tk[0] === 'BECMG' ? 'Mudando' : 'Temporariamente';
      if (p && (tk[1] === 'TEMPO' || tk[1] === 'BECMG')) { pre += tk[1] === 'TEMPO' ? ', temporariamente' : ', mudando'; i = 2; }
      m = /^(\d{2})(\d{2})\/(\d{2})(\d{2})$/.exec(tk[i] || ''); rot = m ? `${pre} ${diaHora(horaZ(m[1], m[2]))} → ${diaHora(horaZ(m[3], m[4]))}` : pre; tk.splice(0, i + (m ? 1 : 0));
    } else if ((m = /^FM(\d{2})(\d{2})(\d{2})$/.exec(tk[0]))) { rot = `A partir de ${diaHora(horaZ(m[1], m[2], m[3]))}`; tk.shift(); }
    const extremos = tk.filter((x) => /^T[XN]M?\d{2}\/\d{4}Z$/.test(x)).map((x) => { const e = /^T([XN])(M?\d{2})\/(\d{2})(\d{2})Z$/.exec(x); return `${e[1] === 'X' ? 'máx' : 'mín'} ${e[2].replace('M', '-')} °C às ${hhmm(horaZ(e[3], e[4]))}`; });
    const r = resumir(tk.filter((x) => !/^T[XN]/.test(x)));
    return { rot, r, c: classificar(r), extremos, raw: g };
  });
  return { icao, raw: raw.trim(), emitido: em ? horaZ(em[1], em[2], em[3]) : null, de: val ? horaZ(val[1], val[2]) : null, ate: val ? horaZ(val[3], val[4]) : null, grupos };
}

// ---------- busca de dados ----------
const txt = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(r.status); return r.text(); };
const json = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(r.status); return r.json(); };
export async function buscarMetar(icaos) {
  const t = await txt('https://metar.vatsim.net/metar.php?id=' + icaos.join(','));
  const por = {}; t.split('\n').map((l) => l.trim()).filter(Boolean).forEach((l) => { por[l.slice(0, 4)] = lerMetar(l); });
  return por;
}
export async function buscarTaf(icaos) {
  if (!icaos.length) return {};
  const t = await txt('https://api.met.no/weatherapi/tafmetar/1.0/taf.txt?icao=' + icaos.join(','));
  const por = {}; // vem em ordem cronológica, com repetições: fica o último de cada aeródromo
  t.split('\n').map((l) => l.trim()).filter((l) => /^[A-Z]{4} \d{6}Z/.test(l)).forEach((l) => { por[l.slice(0, 4)] = lerTaf(l); });
  return por;
}
export const buscarPrevisao = (lat, lon) => json(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,dew_point_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,cloud_cover,cloud_cover_low,precipitation_probability,precipitation,pressure_msl,weather_code,cape&daily=sunrise,sunset,precipitation_probability_max&timezone=America/Sao_Paulo&forecast_days=3&wind_speed_unit=kn`);
async function geocodificar(q) {
  const r = await json('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br,ar,py,uy&q=' + encodeURIComponent(q));
  if (!r.length) throw new Error('Lugar não encontrado');
  return { nome: r[0].display_name.split(',').slice(0, 2).join(','), lat: +r[0].lat, lon: +r[0].lon };
}
async function nomeDe(lat, lon) {
  try { const r = await json(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=12&lat=${lat}&lon=${lon}`); const a = r.address || {}; return [a.city || a.town || a.village || a.municipality || r.name, a.state].filter(Boolean).join(', ') || 'Minha posição'; }
  catch { return 'Minha posição'; }
}

const WMO = { 0: 'céu limpo', 1: 'quase limpo', 2: 'parcialmente nublado', 3: 'encoberto', 45: 'nevoeiro', 48: 'nevoeiro com gelo', 51: 'chuvisco fraco', 53: 'chuvisco', 55: 'chuvisco forte', 56: 'chuvisco congelante', 57: 'chuvisco congelante', 61: 'chuva fraca', 63: 'chuva', 65: 'chuva forte', 66: 'chuva congelante', 67: 'chuva congelante', 71: 'neve fraca', 73: 'neve', 75: 'neve forte', 77: 'grãos de neve', 80: 'pancadas fracas', 81: 'pancadas', 82: 'pancadas fortes', 85: 'neve', 86: 'neve', 95: 'trovoada', 96: 'trovoada com granizo', 99: 'trovoada com granizo' };
// Classificação de uma hora da previsão: o modelo não dá teto, então nuvens baixas acima de 75% viram "atenção", nunca "abaixo".
function classificarHora(h) {
  const pe = [], al = [];
  if (h.vis != null && h.vis < 5000) pe.push('visibilidade'); else if (h.vis != null && h.vis < 8000) al.push('visibilidade');
  if (h.vel > 20 || h.raj > 25) pe.push('vento'); else if (h.vel > 15 || h.raj > 20) al.push('vento');
  if (h.cod >= 95 || h.cod === 45 || h.cod === 48) pe.push(WMO[h.cod]);
  else if (h.cod >= 51 || h.prob >= 60) al.push(h.cod >= 51 ? WMO[h.cod] : 'chance de chuva');
  if (h.baixa >= 75) al.push('nuvens baixas');
  if (h.cape >= 1000) al.push('instabilidade (CAPE)');
  return pe.length ? { n: 'pe', por: pe.join(', ') } : al.length ? { n: 'al', por: al.join(', ') } : { n: 'ok', por: '' };
}
function horas(prev) {
  const H = prev.hourly, out = [];
  for (let i = 0; i < H.time.length; i++) out.push({ t: H.time[i], dia: H.time[i].slice(0, 10), hora: +H.time[i].slice(11, 13), temp: H.temperature_2m[i], orv: H.dew_point_2m[i], vel: Math.round(H.wind_speed_10m[i]), dir: H.wind_direction_10m[i], raj: Math.round(H.wind_gusts_10m[i]),
    vis: H.visibility[i], nub: H.cloud_cover[i], baixa: H.cloud_cover_low[i], prob: H.precipitation_probability[i], mm: H.precipitation[i], qnh: Math.round(H.pressure_msl[i]), cod: H.weather_code[i], cape: H.cape[i] });
  return out.map((h) => ({ ...h, c: classificarHora(h) }));
}

// ---------- estado e tela ----------
let local = null, dados = { metar: {}, taf: {}, prev: null, erro: {} }, carregando = false, dia = 0, noite = false, ultima = null;
const guardar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(local)); } catch {} };
const lembrado = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch { return null; } };
const porEstacao = (e) => ({ nome: `${e.nome} (${e.icao})`, lat: e.lat, lon: e.lon, elev: e.elev, icao: e.icao });
export const localAtual = () => local || lembrado() || porEstacao(ESTACOES[0]);
const proximas = (l, n = 4, max = 250) => ESTACOES.filter((e) => !e.semMetar).map((e) => ({ ...e, dist: km(l, e), rumo: rumo(l, e) })).sort((a, b) => a.dist - b.dist).filter((e) => e.dist <= max).slice(0, n);

export function telaTempo() {
  const l = localAtual(), est = proximas(l);
  const atalhos = ['SISY', 'SBBI', 'SBCT', 'SBJV', 'SBFL'].map((k) => ESTACOES.find((e) => e.icao === k));
  return `<div class="cab"><h2>Tempo para o voo</h2>${ultima ? `<span class="sub">atualizado ${hhmm(ultima)}</span>` : ''}</div>
  <p class="intro">Na véspera, olhe a previsão de amanhã. Antes de sair, o METAR e o TAF de agora. Isto orienta o briefing; quem decide é o instrutor.</p>
  <div class="caixa">
    <form id="tpForm" class="linha-acao"><input id="tpQ" style="flex:1 1 220px" placeholder="ICAO (SBBI), cidade ou lugar" autocomplete="off" maxlength="80"><button class="pri" type="submit">Buscar</button><button type="button" id="tpGeo">📍 Minha posição</button></form>
    <div class="chips">${atalhos.map((e) => `<button type="button" class="chip" aria-pressed="${l.icao === e.icao}" data-tp-est="${e.icao}">${e.icao} · ${esc(e.nome.split(' · ').pop())}</button>`).join('')}</div>
    <p class="sub" id="tpLocal">📍 <b>${esc(l.nome)}</b> · ${gms(l.lat, true)} ${gms(l.lon)}${l.elev ? ` · elev. ${l.elev} ft` : ''}${sol()}</p>
  </div>
  <div class="grade">
    <div class="caixa"><div class="cab"><h3>Agora: METAR mais próximos</h3><button class="mini" id="tpAtual" ${carregando ? 'disabled' : ''}>${carregando ? 'Buscando…' : 'Atualizar'}</button></div>
      ${est.length ? est.map(cartaoMetar).join('') : '<p class="sub">Nenhum aeródromo com METAR a menos de 250 km.</p>'}
      ${dados.erro.metar ? `<p class="sub" style="color:var(--perigo)">Não deu para buscar o METAR (${esc(dados.erro.metar)}). Veja no REDEMET, abaixo.</p>` : ''}</div>
    <div class="caixa"><h3>TAF: previsão oficial do aeródromo</h3>
      ${est.filter((e) => e.taf).slice(0, 2).map(cartaoTaf).join('') || '<p class="sub">Nenhum aeródromo com TAF por perto.</p>'}
      ${dados.erro.taf ? `<p class="sub" style="color:var(--perigo)">Não deu para buscar o TAF (${esc(dados.erro.taf)}).</p>` : ''}</div>
  </div>
  <div class="caixa"><div class="cab"><h3>Previsão hora a hora em ${esc(l.nome.split(' (')[0])}</h3><span class="sub">modelo Open-Meteo</span></div>
    ${tabelaPrevisao()}
    <p class="sub">Cores: <span class="selo ok">ok</span> dentro da referência da turma · <span class="selo al">atenção</span> vento 15–20 kt, visibilidade 5–8 km, chuva ou nuvens baixas · <span class="selo pe">abaixo</span> vento acima de 20 kt (rajadas 25), visibilidade abaixo de 5 km, trovoada ou nevoeiro. O modelo não informa o teto: confira nuvens no METAR e no TAF.</p></div>
  ${sites(l, est)}
  <p class="sub">Fontes: METAR da VATSIM (espelho da rede NOAA), TAF do MET Norway, previsão da Open-Meteo (ECMWF/GFS), lugares do OpenStreetMap. Horários em hora de Brasília. ${lembrado() ? 'O último lugar fica guardado neste aparelho.' : ''}</p>`;
}
function sol() {
  const d = dados.prev?.daily; if (!d) return '';
  return ` · 🌅 ${d.sunrise[0].slice(11)} 🌇 ${d.sunset[0].slice(11)}`;
}
function cartaoMetar(e) {
  const m = dados.metar[e.icao];
  const cab = `<div class="cab"><div><b>${e.icao}</b> <span class="sub">${esc(e.nome)} · ${Math.round(e.dist)} km ao ${esc(pontoCardeal(e.rumo))}</span></div>`;
  if (!m) return `<div class="tp-est">${cab}${carregando ? '<span class="sub">buscando…</span>' : '<span class="sub">sem METAR agora</span>'}</div></div>`;
  return `<div class="tp-est">${cab}<span class="selo ${m.c.n}" title="${esc(m.c.por)}">${m.c.t}</span></div>
    ${chips(m.r)}${m.c.por ? `<div class="sub">Motivo: ${esc(m.c.por)}</div>` : ''}
    <div class="mono tp-raw">${esc(m.raw)}</div>
    <div class="sub">${m.quando ? `às ${hhmm(m.quando)}${m.idade != null ? ` (há ${m.idade >= 60 ? Math.floor(m.idade / 60) + ' h ' + (m.idade % 60) + ' min' : m.idade + ' min'})` : ''}` : ''} · <button class="mini" type="button" data-tp-ler="${e.icao}">Ler por partes</button></div><div id="tpLer-${e.icao}"></div></div>`;
}
function cartaoTaf(e) {
  const t = dados.taf[e.icao];
  if (!t) return `<div class="tp-est"><b>${e.icao}</b> <span class="sub">${esc(e.nome)} · ${carregando ? 'buscando…' : 'sem TAF agora'}</span></div>`;
  return `<div class="tp-est"><div><b>${e.icao}</b> <span class="sub">${esc(e.nome)}${t.emitido ? ` · emitido ${hhmm(t.emitido)}` : ''}${t.de ? ` · válido ${diaHora(t.de)} → ${diaHora(t.ate)}` : ''}</span></div>
    ${t.grupos.map((g) => `<div class="tp-grupo"><div class="cab"><b class="sub">${esc(g.rot)}</b><span class="selo ${g.c.n}" title="${esc(g.c.por)}">${g.c.t}</span></div>${chips(g.r)}${g.extremos.length ? `<div class="sub">${esc(g.extremos.join(' · '))}</div>` : ''}</div>`).join('')}
    <div class="mono tp-raw">${esc(t.raw)}</div></div>`;
}
const pontoCardeal = (g) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(g / 45) % 8];
function tabelaPrevisao() {
  const p = dados.prev; if (!p) return `<p class="sub">${carregando ? 'Buscando a previsão…' : dados.erro.prev ? 'Não deu para buscar a previsão (' + esc(dados.erro.prev) + ').' : ''}</p>`;
  const dias = p.daily.time, hs = horas(p).filter((h) => h.dia === dias[dia] && (noite || (h.hora >= 5 && h.hora <= 20)));
  const rot = (i) => i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : new Date(dias[i] + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long' });
  return `<div class="chips">${dias.map((d, i) => `<button type="button" class="chip" aria-pressed="${dia === i}" data-tp-dia="${i}">${rot(i)} ${d.slice(8, 10)}/${d.slice(5, 7)}</button>`).join('')}<button type="button" class="chip" aria-pressed="${noite}" data-tp-noite>madrugada</button></div>
  <p class="sub">🌅 nascer ${p.daily.sunrise[dia].slice(11)} · 🌇 pôr ${p.daily.sunset[dia].slice(11)} · chuva no dia: até ${p.daily.precipitation_probability_max[dia]}%</p>
  <div class="tabela"><table class="tp-tab"><thead><tr><th>Hora</th><th>Vento</th><th>Visib.</th><th>Nuvens baixas</th><th>Chuva</th><th>Tempo</th><th>T / orv.</th><th>QNH</th></tr></thead><tbody>
    ${hs.map((h) => `<tr class="tp-${h.c.n}" title="${esc(h.c.por)}"><td class="mono">${String(h.hora).padStart(2, '0')}h</td><td>${h.dir}° ${h.vel} kt${h.raj > h.vel + 4 ? ` <span class="sub">raj. ${h.raj}</span>` : ''}</td><td>${h.vis >= 9999 ? '10 km+' : h.vis >= 1000 ? (h.vis / 1000).toFixed(0) + ' km' : h.vis + ' m'}</td><td>${h.baixa}% <span class="sub">(total ${h.nub}%)</span></td><td>${h.prob}%${h.mm ? ` <span class="sub">${h.mm} mm</span>` : ''}</td><td>${esc(WMO[h.cod] || '')}</td><td>${Math.round(h.temp)} / ${Math.round(h.orv)} °C</td><td>${h.qnh}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function sites(l, est) {
  const icao = est[0]?.icao || 'SBBI', lista = est.map((e) => e.icao).join(','), ll = `${l.lat.toFixed(3)},${l.lon.toFixed(3)}`;
  const mb = `${Math.abs(l.lat).toFixed(3)}${l.lat < 0 ? 'S' : 'N'}${Math.abs(l.lon).toFixed(3)}${l.lon < 0 ? 'W' : 'E'}`;
  const S = [
    ['REDEMET (DECEA)', 'Oficial. METAR, TAF, SIGMET, satélite, radar e cartas SIGWX do Brasil. Entre sem conta.', [['Consulta METAR/TAF', 'https://redemet.decea.mil.br/?i=produtos&p=consulta-de-mensagens-opmet'], ['Página inicial (satélite, radar, SIGWX)', 'https://redemet.decea.mil.br/']]],
    ['AISWEB (DECEA)', 'Oficial. Ficha do aeródromo (pista, frequências, cartas), NOTAM e as mensagens meteorológicas dele.', [[`Aeródromo ${icao}`, `https://aisweb.decea.mil.br/?i=aerodromos&codigo=${icao}`], ['Piraquara (SISY)', 'https://aisweb.decea.mil.br/?i=aerodromos&codigo=SISY']]],
    ['Windy', 'Mapa animado de vento, rajadas, nuvens, chuva e trovoadas, com a camada dos aeroportos (METAR/TAF). Grátis sem conta.', [['Aeroportos (METAR/TAF)', `https://www.windy.com/?metars,${ll},10`], ['Rajadas', `https://www.windy.com/?gust,${ll},10`], ['Nuvens', `https://www.windy.com/?clouds,${ll},10`], ['Chuva e trovoadas', `https://www.windy.com/?rain,${ll},10`]]],
    ['meteoblue', 'Meteograma por hora, com base e topo das nuvens, e a página "Ar" para quem voa. Grátis com anúncios.', [['Semana no local', `https://www.meteoblue.com/pt/tempo/semana/${mb}`], ['Ar (voo e nuvens)', `https://www.meteoblue.com/pt/tempo/outdoorsports/air/${mb}`]]],
    ['AeroMet (app)', 'Indicado pelo instrutor. METAR, TAF, NOTAM, SIGMET, satélite e radar no celular, em português. Grátis, com itens pagos.', [['App Store (iPhone)', 'https://apps.apple.com/br/app/aeromet-metar-taf/id1549597697'], ['Google Play (buscar)', 'https://play.google.com/store/search?q=aeromet%20metar%20taf&c=apps']]],
  ];
  return `<div class="caixa"><h3>Sites de referência</h3><p class="sub">Os links já abrem no lugar escolhido. Todos têm versão gratuita.</p>
    <div class="grade">${S.map(([n, d, ls]) => `<div class="tp-site"><b>${esc(n)}</b><div class="sub">${esc(d)}</div><div class="links">${ls.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">↗ ${esc(t)}</a>`).join('')}</div></div>`).join('')}</div>
    <p class="sub">Também: <a href="https://aviationweather.gov/data/metar/?ids=${lista}&hours=0&decoded=yes&include_taf=yes" target="_blank" rel="noopener noreferrer">aviationweather.gov</a> (METAR e TAF decodificados em inglês) e <a href="https://site.metarsul.com.br/" target="_blank" rel="noopener noreferrer">Metarsul</a> (câmeras ao vivo em aeroportos do Sul).</p></div>`;
}

// ---------- ações ----------
export async function carregarTempo(render, forcar) {
  const l = localAtual(); local = l;
  if (carregando) return;
  if (!forcar && ultima && Date.now() - ultima < 5 * 6e4 && dados.local === l.nome) return;
  carregando = true; dados = { metar: {}, taf: {}, prev: null, erro: {}, local: l.nome }; render();
  const est = proximas(l);
  await Promise.all([
    buscarMetar(est.map((e) => e.icao)).then((m) => { dados.metar = m; }).catch((e) => { dados.erro.metar = e.message; }),
    buscarTaf(est.filter((e) => e.taf).slice(0, 2).map((e) => e.icao)).then((t) => { dados.taf = t; }).catch((e) => { dados.erro.taf = e.message; }),
    buscarPrevisao(l.lat, l.lon).then((p) => { dados.prev = p; }).catch((e) => { dados.erro.prev = e.message; }),
  ]);
  carregando = false; ultima = new Date(); render();
}
export function ligarTempo(c, { decodificarMetar, toast, render }) {
  const ir = async (novo) => { local = novo; guardar(); ultima = null; await carregarTempo(render, true); };
  c.querySelectorAll('[data-tp-est]').forEach((b) => b.onclick = () => ir(porEstacao(ESTACOES.find((e) => e.icao === b.dataset.tpEst))));
  c.querySelector('#tpForm').onsubmit = async (e) => {
    e.preventDefault(); const q = c.querySelector('#tpQ').value.trim(); if (!q) return;
    const e1 = ESTACOES.find((x) => x.icao === q.toUpperCase());
    if (e1) return ir(porEstacao(e1));
    try { toast('Procurando o lugar…'); ir(await geocodificar(q)); } catch { toast('Não achei esse lugar. Tente cidade e estado, ou o ICAO.'); }
  };
  c.querySelector('#tpGeo').onclick = () => {
    if (!navigator.geolocation) return toast('Este navegador não dá a posição.');
    toast('Pedindo a posição…');
    navigator.geolocation.getCurrentPosition(async (p) => { const { latitude: lat, longitude: lon } = p.coords; ir({ nome: await nomeDe(lat, lon), lat, lon }); }, () => toast('Sem permissão para a posição. Digite o lugar.'), { timeout: 12000, maximumAge: 60000 });
  };
  c.querySelector('#tpAtual').onclick = () => carregarTempo(render, true);
  c.querySelectorAll('[data-tp-dia]').forEach((b) => b.onclick = () => { dia = +b.dataset.tpDia; render(); });
  c.querySelector('[data-tp-noite]')?.addEventListener('click', () => { noite = !noite; render(); });
  c.querySelectorAll('[data-tp-ler]').forEach((b) => b.onclick = () => {
    const m = dados.metar[b.dataset.tpLer], alvo = c.querySelector('#tpLer-' + b.dataset.tpLer); if (!m || !alvo) return;
    if (alvo.innerHTML) { alvo.innerHTML = ''; b.textContent = 'Ler por partes'; return; }
    const d = decodificarMetar(m.raw); alvo.innerHTML = `<dl class="decod">${d.r.map(([a, v]) => `<dt>${esc(a)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`; b.textContent = 'Fechar';
  });
  carregarTempo(render, false);
}

// Resumo para o Início: o METAR mais próximo do último lugar escolhido, numa linha.
export async function resumoInicio(el) {
  const l = localAtual(), e = proximas(l, 1)[0]; if (!e || !el) return;
  try {
    const m = (await buscarMetar([e.icao]))[e.icao]; if (!m) return;
    el.innerHTML = `<span class="selo ${m.c.n}">${m.c.t}</span> <b>${e.icao}</b> ${hhmm(m.quando)} · ${esc(ventoTxt(m.r.vento))} · ${esc(visTxt(m.r.vis, m.r.cavok))} · ${m.r.teto != null ? 'teto ' + m.r.teto + ' ft' : 'sem teto'}${m.r.fen.length ? ' · ' + esc(m.r.fen.join('; ')) : ''}${m.c.por ? ` <span class="sub">(${esc(m.c.por)})</span>` : ''}`;
  } catch { el.innerHTML = '<span class="sub">METAR indisponível agora.</span>'; }
}
