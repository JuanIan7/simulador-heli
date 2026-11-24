// Aba "Navegação visual" do Hangar da Turma (grupo Voo): os pontos do levantamento da turma e referências fáceis de ver do ar,
// com proa magnética, distância e tempo a partir de SISY (ou de qualquer outro ponto), num mapa de satélite.
// Serve para estudar a saída de SISY e o caminho até as áreas de missão antes do voo. Quem decide a rota é o instrutor.
import { PONTOS, DECLINACAO, VELOCIDADES, TIPOS } from './navegacao/pontos.js';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const R_NM = 3440.065, rad = Math.PI / 180;
export function distNM(a, b) {
  const la1 = a.lat * rad, la2 = b.lat * rad, dlo = (b.lon - a.lon) * rad;
  return Math.acos(Math.min(1, Math.sin(la1) * Math.sin(la2) + Math.cos(la1) * Math.cos(la2) * Math.cos(dlo))) * R_NM;
}
export function proaVerdadeira(a, b) {
  const la1 = a.lat * rad, la2 = b.lat * rad, dlo = (b.lon - a.lon) * rad;
  const y = Math.sin(dlo) * Math.cos(la2), x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dlo);
  return (Math.atan2(y, x) / rad + 360) % 360;
}
// declinação oeste: proa magnética = verdadeira + declinação
export const proaMagnetica = (a, b) => (proaVerdadeira(a, b) + DECLINACAO + 360) % 360;
export const fmtProa = (p) => String(Math.round(p) % 360 || 360).padStart(3, '0') + '°';
export const fmtNM = (d) => d.toFixed(1).replace('.', ',') + ' NM';
export function fmtTempo(nm, kt) { const m = nm / kt * 60; return m < 1 ? `${Math.round(m * 60)} s` : m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')}`; }
export const porId = (id) => PONTOS.find((p) => p.id === id);
// Imagem de satélite do ponto (serviço de imagens da Esri, o mesmo do fundo do mapa). Largura = 2 × raio (km).
export function fotoUrl(p, w = 640, h = 360) {
  const r = p.raio || 0.6, dlat = r / 111.32, dx = dlat * (w / h) / Math.cos(p.lat * rad);   // meia altura e meia largura, em graus
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${(p.lon - dx).toFixed(5)},${(p.lat - dlat).toFixed(5)},${(p.lon + dx).toFixed(5)},${(p.lat + dlat).toFixed(5)}&bboxSR=4326&imageSR=3857&size=${w},${h}&format=jpg&f=image`;
}
const mapsUrl = (p) => `https://www.google.com/maps/@${p.lat},${p.lon},900m/data=!3m1!1e3`;
const rotuloTipo = (p) => `${esc(p.que || TIPOS[p.tipo] || '')}${p.fonte === 'levantamento' ? ' · levantamento da turma' : p.tipo === 'referencia' ? ' · referência' : ''}`;
// pistas: proa magnética de pouso/decolagem por cada cabeceira (da cabeceira em direção à outra)
const eixo = (pista) => pista.cab.map((c, i) => `${c.n}: ${fmtProa(proaMagnetica(c, pista.cab[1 - i]))}`).join(' · ');
const descPistas = (p) => (p.pistas || []).map((x) => `<div class="nv-pista"><b>Pista ${esc(x.des)}</b> · ${x.m} m · ${esc(x.piso)} · proa pela ${eixo(x)}${x.alerta ? `<p class="nv-alerta">⚠ ${esc(x.alerta)}</p>` : ''}</div>`).join('')
  + (p.fato ? `<div class="nv-pista"><b>Heliponto</b> · FATO ${esc(p.fato)}</div>` : '');
const irUrls = (p) => [['Google Maps', `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`], ['Waze', `https://waze.com/ul?ll=${p.lat},${p.lon}&navigate=yes`], ['Apple Maps', `https://maps.apple.com/?daddr=${p.lat},${p.lon}`]];
// arquivos para o aplicativo de navegação (pontos e cabeceiras)
function waypoints() {
  const w = [];
  for (const p of PONTOS) { w.push({ n: p.curto || p.nome, d: `${p.que || ''} · ${p.nome}`, lat: p.lat, lon: p.lon }); for (const x of p.pistas || []) for (const c of x.cab) w.push({ n: `${p.curto || p.nome} ${c.n}`, d: `Cabeceira ${c.n} · ${p.nome}`, lat: c.lat, lon: c.lon }); }
  return w;
}
const xml = (t) => String(t).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
export const gpx = () => `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Hangar da Turma" xmlns="http://www.topografix.com/GPX/1/1">\n${waypoints().map((w) => `<wpt lat="${w.lat}" lon="${w.lon}"><name>${xml(w.n)}</name><desc>${xml(w.d)}</desc></wpt>`).join('\n')}\n</gpx>\n`;
export const kml = () => `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Hangar da Turma · Navegação visual</name>\n${waypoints().map((w) => `<Placemark><name>${xml(w.n)}</name><description>${xml(w.d)}</description><Point><coordinates>${w.lon},${w.lat},0</coordinates></Point></Placemark>`).join('\n')}\n</Document></kml>\n`;
function baixar(nome, texto, mime) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: mime })); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }

let origem = 'sisy', destino = '', kt = 70, rota = [], camada = 'sat', mapa = null, grupo = null, linha = null, marcas = {};

// ---------- tela ----------
function pernas() {
  const seq = [porId(origem), ...rota.map(porId)].filter(Boolean), out = [];
  for (let i = 1; i < seq.length; i++) out.push({ de: seq[i - 1], para: seq[i], pm: proaMagnetica(seq[i - 1], seq[i]), nm: distNM(seq[i - 1], seq[i]) });
  return out;
}
function cartaoDestino() {
  const o = porId(origem), d = porId(destino);
  if (!d || d.id === o.id) return `<p class="sub">Toque num ponto do mapa ou da lista para ver a proa e a distância a partir de <b>${esc(o.nome)}</b>.</p>`;
  const nm = distNM(o, d);
  return `<div class="nv-dest"><div><div class="rotulo">${rotuloTipo(d)}</div><h3>${esc(d.nome)}</h3>${d.dica ? `<p class="sub">${esc(d.dica)}</p>` : ''}</div>
    ${descPistas(d)}
    <figure class="nv-figura"><img src="${fotoUrl(d)}" alt="Imagem de satélite: ${esc(d.nome)}" width="640" height="360" loading="lazy"><figcaption><span>Visto de cima · imagens Esri</span><a href="${mapsUrl(d)}" target="_blank" rel="noopener">Abrir no Google Maps ↗</a></figcaption></figure>
    <div class="nv-ir"><span class="rotulo">Ir até o local</span>${irUrls(d).map(([n, u]) => `<a class="btn mini" href="${u}" target="_blank" rel="noopener">${n}</a>`).join('')}</div>
    <div class="nv-nums"><div><small>Proa magnética</small><b>${fmtProa(proaMagnetica(o, d))}</b></div><div><small>Distância</small><b>${fmtNM(nm)}</b></div><div><small>a ${kt} kt</small><b>${fmtTempo(nm, kt)}</b></div><div><small>Volta para ${esc(o.nome)}</small><b>${fmtProa(proaMagnetica(d, o))}</b></div></div>
    <div class="linha-acao"><button class="mini pri" data-nv-add="${d.id}">+ Pôr na rota</button><button class="mini fantasma" data-nv-origem="${d.id}">Sair daqui</button></div></div>`;
}
function cartaoRota() {
  const ps = pernas();
  if (!ps.length) return '';
  const total = ps.reduce((t, p) => t + p.nm, 0), volta = distNM(ps[ps.length - 1].para, porId(origem));
  return `<div class="caixa nv-rota"><div class="cab"><h3>Rota de treino</h3><div class="linha-acao"><button class="mini" data-nv-print>Imprimir cartão</button><button class="mini fantasma" data-nv-limpar>Limpar</button></div></div>
    <table class="nv-tab"><thead><tr><th>#</th><th>De</th><th>Para</th><th>Proa M</th><th>Dist.</th><th>a ${kt} kt</th><th></th></tr></thead><tbody>
    ${ps.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.de.nome)}</td><td>${esc(p.para.nome)}</td><td class="n"><b>${fmtProa(p.pm)}</b></td><td class="n">${fmtNM(p.nm)}</td><td class="n">${fmtTempo(p.nm, kt)}</td><td><button class="mini fantasma" data-nv-tirar="${i}" aria-label="Tirar ${esc(p.para.nome)} da rota">×</button></td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="4">Total · volta para ${esc(porId(origem).nome)} na proa <b>${fmtProa(proaMagnetica(ps[ps.length - 1].para, porId(origem)))}</b> (${fmtNM(volta)})</td><td class="n"><b>${fmtNM(total)}</b></td><td class="n"><b>${fmtTempo(total, kt)}</b></td><td></td></tr></tfoot></table></div>`;
}
function tabela() {
  const o = porId(origem);
  const l = PONTOS.filter((p) => p.id !== o.id && !p.oculto).map((p) => ({ p, nm: distNM(o, p), pm: proaMagnetica(o, p) })).sort((a, b) => a.nm - b.nm);
  return `<table class="nv-tab nv-lista"><thead><tr><th></th><th>Ponto</th><th>O que procurar</th><th>Proa M</th><th>Dist.</th><th>a ${kt} kt</th></tr></thead><tbody>
    ${l.map(({ p, nm, pm }) => `<tr class="${p.id === destino ? 'sel' : ''}" data-nv-ir="${p.id}"><td class="nv-mini"><img src="${fotoUrl(p, 192, 128)}" alt="" width="96" height="64" loading="lazy"></td><td><span class="nv-pt t-${p.tipo}"></span><b>${esc(p.nome)}</b><br><span class="sub">${rotuloTipo(p)}</span></td><td class="sub">${esc(p.dica || '')}</td><td class="n"><b>${fmtProa(pm)}</b></td><td class="n">${fmtNM(nm)}</td><td class="n">${fmtTempo(nm, kt)}</td></tr>`).join('')}
  </tbody></table>`;
}
export function telaNavegacao() {
  return `<div class="cab"><h2>Navegação visual</h2><span class="sub">Declinação ${DECLINACAO > 0 ? DECLINACAO + '° W' : -DECLINACAO + '° E'} · proas magnéticas</span></div>
  <p class="intro">Os pontos do levantamento feito pelo <b>Juan Meira</b>, as pistas e helipontos da região e referências fáceis de ver do ar, com a proa e a distância a partir de SISY. Use para estudar a saída e o caminho até a área de missão antes do voo. No ar, confirme sempre pelo terreno; quem decide a rota é o instrutor.</p>
  <div class="nv-ctl"><div class="chips" role="group" aria-label="Velocidade">${VELOCIDADES.map((v) => `<button type="button" class="chip" data-nv-kt="${v}" aria-pressed="${v === kt}">${v} kt</button>`).join('')}</div>
    <div class="chips" role="group" aria-label="Fundo do mapa"><button type="button" class="chip" data-nv-camada="sat" aria-pressed="${camada === 'sat'}">Satélite</button><button type="button" class="chip" data-nv-camada="mapa" aria-pressed="${camada === 'mapa'}">Mapa</button></div>
    <div class="chips" role="group" aria-label="Para o aplicativo de navegação"><button type="button" class="chip" data-nv-baixar="gpx">⬇ GPX</button><button type="button" class="chip" data-nv-baixar="kml">⬇ KML</button></div></div>
  <div class="nv-grade"><div class="caixa nv-mapa-caixa"><div id="nvMapa" class="nv-mapa" role="application" aria-label="Mapa dos pontos"></div><p class="sub nv-legenda"><span class="nv-pt t-aerodromo"></span> aeródromo e cabeceiras · <span class="nv-pt t-heliponto"></span> heliponto · <span class="nv-pt t-levantamento"></span> ponto do levantamento · <span class="nv-pt t-referencia"></span> referência visual</p></div>
    <div class="caixa" id="nvDestino">${cartaoDestino()}</div></div>
  <div id="nvRota">${cartaoRota()}</div>
  <div class="caixa"><div class="cab"><h3>Todos os pontos a partir de ${esc(porId(origem).nome)}</h3><span class="sub">do mais perto ao mais longe</span></div><div class="nv-rolar" id="nvLista">${tabela()}</div></div>
  <p class="sub">Fontes: levantamento "Voo em Piraquara", feito pelo Juan Meira no Google Earth; pistas e helipontos do cadastro aberto da ANAC e da base OurAirports; referências acrescentadas pelo Hangar (conferir no voo). Cabeceiras de SISY, SSUL e SWYG posicionadas pela imagem de satélite; a numeração das pistas é a do cadastro da ANAC. Proas arredondadas ao grau; vento não considerado. Os arquivos GPX e KML servem para importar os pontos num aplicativo de navegação.</p>`;
}

// ---------- mapa (Leaflet, carregado só quando a aba abre) ----------
let leafletPronto = null;
function carregarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPronto) return leafletPronto;
  leafletPronto = new Promise((ok, erro) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = () => ok(window.L); s.onerror = () => { leafletPronto = null; erro(new Error('mapa')); }; document.head.appendChild(s);
  });
  return leafletPronto;
}
const COR = { levantamento: '#E8600A', referencia: '#1B1714', aerodromo: '#1D7A46' };
function icone(L, p, sel) {
  return L.divIcon({ className: 'nv-ico', iconSize: [1, 1], html: `<span class="nv-pino t-${p.tipo}${sel ? ' sel' : ''}${p.id === origem ? ' ori' : ''}"></span><span class="nv-rot t-${p.tipo}${p.rot ? ' r-' + p.rot : ''}">${esc(p.curto || p.nome)}</span>` });
}
function desenharMapa(L) {
  const o = porId(origem), d = porId(destino);
  if (grupo) grupo.clearLayers(); else grupo = L.layerGroup().addTo(mapa);
  marcas = {};
  for (const p of PONTOS) {
    if (p.oculto) continue;
    const m = L.marker([p.lat, p.lon], { icon: icone(L, p, p.id === destino), keyboard: false }).addTo(grupo);
    // ao passar o mouse (ou tocar e segurar): o que é, o que procurar e a imagem de satélite; a imagem só carrega quando abre
    m.bindTooltip(`<div class="nv-tip"><b>${esc(p.nome)}</b><span>${rotuloTipo(p)}</span><img data-src="${fotoUrl(p, 320, 180)}" alt="" width="320" height="180">${(p.pistas || []).map((x) => `<small><b>Pista ${esc(x.des)}</b> · ${x.m} m · ${esc(x.piso)} · ${eixo(x)}</small>`).join('')}${p.fato ? `<small><b>FATO ${esc(p.fato)}</b></small>` : ''}${p.dica ? `<small>${esc(p.dica)}</small>` : ''}</div>`, { direction: 'top', offset: [0, -10], opacity: 1, className: 'nv-tip-caixa' });
    m.on('tooltipopen', (e) => { const i = e.tooltip.getElement()?.querySelector('img[data-src]'); if (i) { i.src = i.dataset.src; i.removeAttribute('data-src'); } });
    m.on('click', () => escolher(p.id)); marcas[p.id] = m;
  }
  for (const p of PONTOS) for (const x of p.pistas || []) {
    L.polyline(x.cab.map((c) => [c.lat, c.lon]), { color: '#fff', weight: 4, opacity: .95 }).addTo(grupo);
    x.cab.forEach((c, i) => L.marker([c.lat, c.lon], { icon: L.divIcon({ className: 'nv-ico', iconSize: [1, 1], html: `<span class="nv-cab">${esc(c.n)}</span>` }), keyboard: false, zIndexOffset: 500 })
      .bindTooltip(`<div class="nv-tip nv-tip-cab"><b>Cabeceira ${esc(c.n)}</b><span>${esc(p.curto || p.nome)} · pista ${esc(x.des)}</span><small>Pouso ou decolagem pela ${esc(c.n)}: proa <b>${fmtProa(proaMagnetica(c, x.cab[1 - i]))}</b> magnética.</small></div>`, { direction: 'top', offset: [0, -8], opacity: 1, className: 'nv-tip-caixa' })
      .on('click', () => escolher(p.id)).addTo(grupo));
  }
  if (linha) { linha.remove(); linha = null; }
  const seq = [o, ...rota.map(porId)].filter(Boolean);
  if (d && d.id !== o.id && !rota.includes(d.id)) seq.push(d);
  if (seq.length > 1) linha = L.polyline(seq.map((p) => [p.lat, p.lon]), { color: '#E8600A', weight: 3, dashArray: '8 6' }).addTo(mapa);
}
let camadaAtual = null;
function fundo(L) {
  if (camadaAtual) camadaAtual.remove();
  camadaAtual = camada === 'sat'
    ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, attribution: 'Imagens: Esri, Maxar, Earthstar Geographics' })
    : L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
  camadaAtual.addTo(mapa);
}
async function montarMapa(c) {
  const el = c.querySelector('#nvMapa'); if (!el) return;
  try {
    const L = await carregarLeaflet();
    if (!c.isConnected) return;
    mapa = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    fundo(L); desenharMapa(L);
    const vis = PONTOS.filter((p) => !p.oculto && !p.longe);
    mapa.fitBounds(L.latLngBounds(vis.map((p) => [p.lat, p.lon])), { padding: [24, 24] });
    mapa.on('click', () => { if (destino) { destino = ''; atualizar(c); } });
    // no celular, longe, só os rótulos do levantamento ficam; os outros voltam ao aproximar
    const rot = () => el.classList.toggle('nv-longe', mapa.getZoom() < 12); mapa.on('zoomend', rot); rot();
  } catch { el.innerHTML = '<p class="sub" style="padding:16px">O mapa não carregou (sem internet ou bloqueado). A lista abaixo continua valendo.</p>'; }
}
let ctxEl = null;
function atualizar(c) {
  c = c || ctxEl; if (!c) return;
  c.querySelector('#nvDestino').innerHTML = cartaoDestino();
  c.querySelector('#nvRota').innerHTML = cartaoRota();
  c.querySelector('#nvLista').innerHTML = tabela();
  c.querySelectorAll('[data-nv-kt]').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.nvKt === kt));
  c.querySelectorAll('h3').forEach((h) => { if (/^Todos os pontos/.test(h.textContent)) h.textContent = `Todos os pontos a partir de ${porId(origem).nome}`; });
  if (mapa && window.L) desenharMapa(window.L);
}
function escolher(id) {
  destino = id === destino ? '' : id; atualizar();
  const p = porId(destino); if (p && mapa) mapa.panTo([p.lat, p.lon]);
}
export const digitandoNavegacao = () => false;
export function ligarNavegacao(c, { toast } = {}) {
  ctxEl = c; mapa = null; grupo = null; linha = null;
  montarMapa(c);
  c.addEventListener('click', (e) => {
    const b = e.target.closest('[data-nv-kt],[data-nv-camada],[data-nv-add],[data-nv-origem],[data-nv-tirar],[data-nv-limpar],[data-nv-print],[data-nv-ir],[data-nv-baixar]');
    if (!b) return;
    if (b.dataset.nvKt) { kt = +b.dataset.nvKt; atualizar(c); }
    else if (b.dataset.nvCamada) { camada = b.dataset.nvCamada; c.querySelectorAll('[data-nv-camada]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.nvCamada === camada)); if (mapa && window.L) fundo(window.L); }
    else if (b.dataset.nvAdd) { if (rota.length >= 12) return toast?.('A rota já tem 12 pontos.'); rota.push(b.dataset.nvAdd); destino = ''; atualizar(c); toast?.('Ponto posto na rota.'); }
    else if (b.dataset.nvOrigem) { origem = b.dataset.nvOrigem; destino = ''; rota = rota.filter((x) => x !== origem); atualizar(c); }
    else if (b.dataset.nvTirar) { rota.splice(+b.dataset.nvTirar, 1); atualizar(c); }
    else if (b.hasAttribute('data-nv-limpar')) { rota = []; origem = 'sisy'; destino = ''; atualizar(c); }
    else if (b.hasAttribute('data-nv-print')) { document.body.classList.add('nv-imprimindo'); window.print(); setTimeout(() => document.body.classList.remove('nv-imprimindo'), 1000); }
    else if (b.dataset.nvIr) escolher(b.dataset.nvIr);
    else if (b.dataset.nvBaixar === 'gpx') baixar('hangar-navegacao-visual.gpx', gpx(), 'application/gpx+xml');
    else if (b.dataset.nvBaixar === 'kml') baixar('hangar-navegacao-visual.kml', kml(), 'application/vnd.google-earth.kml+xml');
  });
}
