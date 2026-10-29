// Simulador de Helicóptero para Estudo (PPH/IFR). App shell: telas, loop do jogo, integração das fases.
import { AERONAVES, ORDEM_AERONAVES } from './data/aeronaves.js';
import { FASES, TRILHA_IFR } from './data/fases.js';
import { QUIZ_VOO } from './data/quiz-voo.js';
import { QUIZ_TEORIA, METAR, ALTIMETRO, NAVEGACAO, SIPAER_ORDEM } from './data/quiz-teoria.js';
import { FONIA, TRANSPONDER } from './data/fonia.js';
import { Helicoptero } from './sim/fisica.js';
import { Cena } from './sim/cena.js';
import { Controles, vibrar } from './sim/controles.js';
import { Hud } from './ui/hud.js';
import { MISSOES } from './sim/missoes.js';
import { PilotoAutomatico, dicaDeAjuda } from './sim/piloto.js';
import { montarQuiz, embaralhar } from './ui/quiz.js';
import { montarIdentificar } from './ui/identificar.js';
import { montarFonia, montarMetar, montarSipaer, exParaQuiz } from './ui/teoria.js';
import { estado } from './estado.js';

const $ = (s) => document.querySelector(s);
const telas = $('#telas'), jogo = $('#jogo');
const BANCO = { ...QUIZ_VOO, ...QUIZ_TEORIA };
const estrelasTxt = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

function mostrarTela(html, vitrine = false) { telas.hidden = false; telas.innerHTML = html; telas.scrollTop = 0; jogo.hidden = !vitrine; jogo.classList.toggle('vitrine', vitrine); telas.classList.toggle('sobre-3d', vitrine); if (vitrine) ligarVitrine(); else modoVitrine = false; }
let modoVitrine = false, vitrineT = 0;
function garantirCena() { if (!cena) { cena = new Cena($('#canvas3d')); window.__cena = cena; hud = new Hud($('#hud')); ctl = new Controles($('#controles')); window.addEventListener('resize', () => cena.redimensionar()); } }
function ligarVitrine() {
  garantirCena(); const ac = AERONAVES[estado.aeronave];
  if (!cena.ac || cena.ac.id !== ac.id) { cena.criarHeli(ac); cena.limparMarcadores(); }
  cena.redimensionar();
  if (modoVitrine) return; modoVitrine = true; vitrineT = performance.now();
  const passo = (t) => { if (!modoVitrine) return; const dt = Math.min(0.05, (t - vitrineT) / 1000); vitrineT = t; cena.vitrine(dt); cena.render(); requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
}

// ---------- Menu ----------
function menu() {
  const ac = AERONAVES[estado.aeronave];
  mostrarTela(`
    <div class="tela menu">
      <header class="cabecalho"><img src="icons/icon-192.png" alt="" class="logo"><div><h1>Simulador de Helicóptero</h1><div class="sub">Estudo para PPH e IFR · jogo de estudo, não é simulador certificado</div></div></header>
      <section class="cartao">
        <div class="linha"><b>Aeronave:</b> ${ac.nome} <button class="btn btn-cinza" id="btnAeronave">Trocar</button></div>
        <div class="linha"><b>Estrelas:</b> ${estado.totalEstrelas()} de ${FASES.length * 3}</div>
      </section>
      <div class="grade-botoes">
        <button class="btn btn-laranja grande" id="btnFases">🎮 Fases (trilha PPH)</button>
        <button class="btn btn-cinza grande" id="btnLivre">🚁 Voo livre</button>
        <button class="btn btn-cinza grande" id="btnAjustes">⚙️ Ajustes e controles</button>
        <button class="btn btn-cinza grande" id="btnCreditos">ℹ️ Sobre e créditos</button>
      </div>
      <footer class="rodape">Desenvolvido por Juan Araujo &amp; Filho · CBMERJ 1856</footer>
    </div>`, true);
  $('#btnAeronave').onclick = telaAeronaves; $('#btnFases').onclick = telaFases; $('#btnLivre').onclick = () => iniciarVoo(null);
  $('#btnAjustes').onclick = telaAjustes; $('#btnCreditos').onclick = telaCreditos;
}

function telaAeronaves() {
  mostrarTela(`<div class="tela"><h2>Escolha a aeronave</h2><div class="lista-ac">${ORDEM_AERONAVES.map(id => { const a = AERONAVES[id]; return `
    <button class="cartao ac ${estado.aeronave === id ? 'sel' : ''}" data-id="${id}"><div class="ac-cor" style="background:#${a.cores.fuselagem.toString(16).padStart(6, '0')};border-color:#${a.cores.faixa.toString(16).padStart(6, '0')}"></div>
    <div><b>${a.nome}</b><div class="sub">${a.descricao}</div><div class="sub">${a.tipoMotor === 'pistao' ? 'Pistão' : 'Turbina'} · ${a.lugares} lugares · Vne ${a.vneKt} kt · rotor ${a.sentidoRotor === 'antihorario' ? 'anti-horário' : 'horário'}</div></div></button>`; }).join('')}</div>
    <button class="btn btn-cinza" id="voltar">Voltar</button></div>`);
  telas.querySelectorAll('.ac').forEach(b => b.onclick = () => { estado.aeronave = b.dataset.id; menu(); }); $('#voltar').onclick = menu;
}

function telaFases() {
  mostrarTela(`<div class="tela"><h2>Trilha PPH (21 fases)</h2><div class="lista-fases">${FASES.map(f => `
    <button class="fase-item" data-n="${f.n}"><span class="fase-ico">${f.icone}</span><span class="fase-txt"><b>${f.n}. ${f.titulo}</b><span class="sub">${f.conceito}</span></span><span class="estrelas">${estrelasTxt(estado.estrelas(f.n))}</span></button>`).join('')}</div>
    <h3>Trilha IFR (em breve)</h3><div class="sub">${TRILHA_IFR.map(t => `• ${t.titulo}: ${t.mecanica}`).join('<br>')}</div>
    <button class="btn btn-cinza" id="voltar">Voltar</button></div>`);
  telas.querySelectorAll('.fase-item').forEach(b => b.onclick = () => briefing(+b.dataset.n)); $('#voltar').onclick = menu;
}

function briefing(n) {
  const f = FASES[n - 1];
  mostrarTela(`<div class="tela"><div class="brief-topo"><span class="fase-ico grande">${f.icone}</span><div><h2>Fase ${f.n}: ${f.titulo}</h2><div class="sub">${f.conceito} · ${AERONAVES[estado.aeronave].nome}</div></div></div>
    <section class="cartao"><h3>O que fazer</h3><p>${f.briefing}</p></section>
    <section class="cartao"><h3>Teoria (cai na prova)</h3><ul>${f.teoria.map(t => `<li>${t}</li>`).join('')}</ul></section>
    ${f.tipo === 'voo' ? '<section class="cartao sub">Controles: esquerda = coletivo (barra vertical) e pedais (barra horizontal); direita = cíclico (ou inclinação do celular, nos ajustes). No Mac: W/S coletivo, setas cíclico, A/D pedais, C câmera. Durante o voo, o botão 💡 troca o modo (sozinho → com ajuda → demonstração).</section>' : ''}
    <div class="grade-botoes">${f.tipo === 'voo' ? `
      <button class="btn btn-laranja grande" id="comecar">🎮 Fazer sozinho <span class="sub-btn">até 3 estrelas</span></button>
      <button class="btn btn-laranja grande" id="comAjuda">🧑‍✈️ Fazer com ajuda <span class="sub-btn">instrutor diz o que fazer · até 2 estrelas</span></button>
      <button class="btn btn-cinza grande" id="demo">▶️ Ver demonstração <span class="sub-btn">o piloto automático voa e mostra os comandos</span></button>` : '<button class="btn btn-laranja grande" id="comecar">Começar</button>'}
      <button class="btn btn-cinza" id="voltar">Voltar</button></div></div>`);
  $('#voltar').onclick = telaFases;
  if (f.tipo === 'voo') { $('#comAjuda').onclick = () => iniciarVoo(n, 'ajuda'); $('#demo').onclick = () => iniciarVoo(n, 'auto'); }
  $('#comecar').onclick = () => {
    if (f.tipo === 'voo') iniciarVoo(n, 'livre');
    else if (f.tipo === 'identificar') { mostrarTela('<div class="tela" id="alvo"></div>'); montarIdentificar($('#alvo'), (r) => { const p = r.certas / r.total; miniQuiz(n, p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.4 ? 1 : 0, `Peças: ${r.certas} certas de primeira, ${r.aposErro} depois de errar, ${r.consultadas} viu a resposta, ${r.puladas} pulou (de ${r.total}).`); }); }
    else if (f.tipo === 'quiz') quizFase(n);
    else if (f.tipo === 'metar') { mostrarTela('<div class="tela" id="alvo"></div>'); montarMetar($('#alvo'), embaralhar(METAR).slice(0, 6), (r) => resultadoTeoria(n, r)); }
    else if (f.tipo === 'fonia') { mostrarTela('<div class="tela" id="alvo"></div>'); montarFonia($('#alvo'), embaralhar(FONIA).slice(0, 5), (r) => resultadoTeoria(n, r)); }
    else if (f.tipo === 'sipaer') { mostrarTela('<div class="tela" id="alvo"></div>'); montarSipaer($('#alvo'), SIPAER_ORDEM, (r) => resultadoTeoria(n, r, true)); }
    else if (f.tipo === 'prova') prova();
  };
}

// resumo do quiz: acertos, viu a resposta, pulou e a lista do que revisar
function resumoQuiz(r) {
  const vistas = r.respostas.filter(x => x.consultada), puladas = r.respostas.filter(x => x.pulada), erradas = r.respostas.filter(x => !x.ok && !x.consultada && !x.pulada);
  const rev = [...erradas, ...vistas, ...puladas];
  return `${r.acertos} de ${r.total} certas · ${erradas.length} erradas · ${vistas.length} viu a resposta · ${puladas.length} pulou.` +
    (rev.length ? `<section class="cartao" style="text-align:left"><h3>Para estudar</h3><ul class="revisar">${rev.map(x => `<li><b>${x.q.p}</b> <span class="sub">(${x.consultada ? 'viu a resposta' : x.pulada ? 'pulou' : 'errou'})</span><br>Resposta: ${x.q.o[x.q.r]}. ${x.q.e}</li>`).join('')}</ul></section>` : '');
}
function quizFase(n) {
  let qs = embaralhar(BANCO[n] || []).slice(0, 8);
  if (n === 16) qs = embaralhar([...qs.slice(0, 4), ...ALTIMETRO.map(exParaQuiz)]).slice(0, 10);
  if (n === 17) qs = embaralhar([...qs.slice(0, 4), ...NAVEGACAO.map(exParaQuiz)]).slice(0, 10);
  mostrarTela('<div class="tela" id="alvo"></div>');
  montarQuiz($('#alvo'), qs, { titulo: `Fase ${n}`, aoTerminar: (r) => { const p = r.acertos / r.total; const est = p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.5 ? 1 : 0; estado.gravarEstrelas(n, est); telaResultado(n, est, resumoQuiz(r)); } });
}
function resultadoTeoria(n, r, seguirQuiz = false) {
  const p = r.total ? r.acertos / r.total : 0; const est = p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.5 ? 1 : 0;
  if (seguirQuiz) miniQuiz(n, est, `${r.acertos} de ${r.total} acertos nas ações.`); else { estado.gravarEstrelas(n, est); telaResultado(n, est, `${r.acertos} de ${r.total} acertos.`); }
}
// mini-quiz pós-fase (3 questões); as estrelas finais combinam a prática e o quiz
function miniQuiz(n, estPratica, resumo) {
  const qs = embaralhar(BANCO[n] || []).slice(0, 3);
  if (!qs.length) { estado.gravarEstrelas(n, estPratica); return telaResultado(n, estPratica, resumo); }
  mostrarTela('<div class="tela" id="alvo"></div>');
  montarQuiz($('#alvo'), qs, { titulo: `Mini-quiz da fase ${n}`, aoTerminar: (r) => { const est = Math.max(0, Math.min(3, Math.round((estPratica * 2 + (r.acertos / r.total) * 3) / 3))); estado.gravarEstrelas(n, est); telaResultado(n, est, `${resumo}<br>Mini-quiz: ${resumoQuiz(r)}`); } });
}
function telaResultado(n, est, resumo) {
  const f = FASES[n - 1]; const prox = FASES[n];
  mostrarTela(`<div class="tela centro"><div class="fase-ico grande">${est >= 2 ? '🏅' : est === 1 ? '👍' : '🔁'}</div><h2>Fase ${n}: ${f.titulo}</h2><div class="estrelas grande">${estrelasTxt(est)}</div><p>${resumo}</p>
    <div class="grade-botoes">${prox ? `<button class="btn btn-laranja grande" id="prox">Próxima: ${prox.n}. ${prox.titulo}</button>` : ''}<button class="btn btn-cinza" id="repetir">Repetir</button><button class="btn btn-cinza" id="voltar">Fases</button></div></div>`);
  if (prox) $('#prox').onclick = () => briefing(prox.n); $('#repetir').onclick = () => briefing(n); $('#voltar').onclick = telaFases;
}

function prova() {
  const porMateria = { 'Regulamentos': [18, 19, 20, 7], 'Meteorologia': [14, 15, 16], 'Navegação': [17], 'Teoria de Voo': [2, 3, 4, 5, 11, 12, 13, 10], 'Conh. Técnicos': [1, 6, 8, 9] };
  let qs = [];
  for (const [m, fases] of Object.entries(porMateria)) { const pool = embaralhar(fases.flatMap(n => (BANCO[n] || []).map(q => ({ ...q, m })))); qs.push(...pool.slice(0, 8)); }
  qs = embaralhar([...qs, ...embaralhar(BANCO[21] || []).slice(0, 0)]).slice(0, 40);
  mostrarTela('<div class="tela" id="alvo"></div>');
  montarQuiz($('#alvo'), qs, { titulo: 'Prova ANAC (simulado)', limiteS: 40 * 60, aoTerminar: (r) => {
    const porM = {}; for (const x of r.respostas) { porM[x.q.m] = porM[x.q.m] || { a: 0, t: 0 }; porM[x.q.m].t++; if (x.ok) porM[x.q.m].a++; }
    const p = r.acertos / qs.length; const est = p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.5 ? 1 : 0; estado.gravarEstrelas(21, est); estado.registrarProva({ data: new Date().toISOString(), acertos: r.acertos, total: qs.length });
    telaResultado(21, est, `${r.acertos} de ${qs.length} (${(p * 100).toFixed(0)} %) ${p >= 0.7 ? 'APROVADO' : 'reprovado, mínimo 70 %'}.<br>` + Object.entries(porM).map(([m, v]) => `${m}: ${v.a}/${v.t}`).join(' · ') + '<br>' + resumoQuiz({ ...r, total: qs.length }));
  } });
}

function telaAjustes() {
  mostrarTela(`<div class="tela"><h2>Ajustes</h2>
    <section class="cartao"><h3>Assistência de voo</h3><div class="sub">Quanto o jogo ajuda a nivelar o helicóptero. 0 = realista (instável como o R22), 1 = muito assistido.</div><input type="range" id="assist" min="0" max="1" step="0.1" value="${estado.assist}"><div id="assistV">${estado.assist}</div></section>
    <section class="cartao"><h3>Cíclico pelo giroscópio</h3><div class="sub">Incline o celular para comandar o cíclico (iPhone pede permissão num toque). Ligue dentro do voo, pelo botão 📱.</div><label><input type="checkbox" id="giro" ${estado.giro ? 'checked' : ''}> Usar giroscópio por padrão</label></section>
    <section class="cartao"><h3>Câmera</h3><select id="cam"><option value="atras" ${estado.camera === 'atras' ? 'selected' : ''}>Atrás do helicóptero</option><option value="cabine" ${estado.camera === 'cabine' ? 'selected' : ''}>Cabine</option><option value="externa" ${estado.camera === 'externa' ? 'selected' : ''}>Externa (orbita)</option></select></section>
    <section class="cartao"><h3>Progresso</h3><button class="btn btn-vermelho" id="zerar">Apagar estrelas</button></section>
    <button class="btn btn-cinza" id="voltar">Voltar</button></div>`);
  $('#assist').oninput = (e) => { estado.assist = +e.target.value; $('#assistV').textContent = e.target.value; };
  $('#giro').onchange = (e) => { estado.giro = e.target.checked; }; $('#cam').onchange = (e) => { estado.camera = e.target.value; };
  $('#zerar').onclick = () => { if (confirm('Apagar todo o progresso?')) { estado.dados.estrelas = {}; estado.aeronave = estado.aeronave; menu(); } };
  $('#voltar').onclick = menu;
}
function telaCreditos() {
  mostrarTela(`<div class="tela"><h2>Sobre</h2><section class="cartao"><p><b>Simulador de Helicóptero para Estudo</b>, versão ${__APP_VERSION__}.</p><p>Jogo de estudo para a habilitação PPH (e depois IFR). <b>Não é um simulador certificado</b> e não substitui o POH da aeronave, as normas vigentes nem o instrutor.</p>
    <p>Dados das aeronaves: POH/RFM Robinson R22, R44 e R66; TCDS EASA; dados públicos do Esquilo AS350 B2 e B3/H125 (Airbus). Normas: DECEA (ICA 100-12, ICA 100-4, MCA 100-16) e ANAC (RBAC 61, 67, 91). Material do curso CCOA/PPH.</p>
    <p>Motor de voo simplificado, calibrado pelos tetos IGE/OGE publicados. Fraseologia em modelo didático (conferir no AISWEB e com o instrutor).</p></section>
    <section class="cartao"><h3>Créditos dos recursos 3D</h3><ul class="sub">
    <li>Modelo "Robinson R44" por syarifudinirfan701 (Sketchfab), licença CC-BY 4.0. Usado para R22, R44 e R66.</li>
    <li>Modelo "Squirrel Eurocopter AS350 Écureuil" por MonkiFlip Resource (Sketchfab), licença CC-BY 4.0. Usado para os Esquilos.</li>
    <li>Céu HDRI "Kloofendal 48d Partly Cloudy (Pure Sky)", Poly Haven, CC0.</li>
    <li>Texturas Grass004, Asphalt012, Concrete034 e Rock035, ambientCG, CC0.</li>
    <li>Vegetação do "Nature Kit", Kenney (kenney.nl), CC0.</li>
    <li>Fotos da fase 1: R22 N2584F por Acroterion (CC BY-SA 4.0) e cockpit de R22 por NJR ZA (CC BY-SA 3.0), Wikimedia Commons.</li>
    <li>Three.js (MIT). Lista completa em CREDITOS.md no repositório.</li></ul></section>
    <section class="cartao centro"><img src="icons/icon-192.png" class="logo" alt=""><p><b>Desenvolvido por Juan Araujo &amp; Filho</b><br>CBMERJ · 1856</p></section>
    <button class="btn btn-cinza" id="voltar">Voltar</button></div>`);
  $('#voltar').onclick = menu;
}

// ---------- Voo ----------
let cena = null, hud = null, ctl = null, heli = null, missao = null, faseAtual = null, rodando = false, ultimoT = 0, cmdExtra = {};
let modoVoo = 'livre', piloto = null, guiaUltimo = '';
const NOME_MODO = { livre: 'Sozinho', ajuda: 'Com ajuda', auto: 'Demonstração' };
const fila = []; let msgTimer = 0;

function iniciarVoo(n, modo = 'livre') {
  faseAtual = n; modoVoo = n ? modo : 'livre'; const ac = AERONAVES[estado.aeronave];
  telas.hidden = true; jogo.hidden = false;
  modoVitrine = false; jogo.classList.remove('vitrine'); telas.classList.remove('sobre-3d'); garantirCena(); cena.redimensionar();
  cena.criarHeli(ac); cena.modoCamera = estado.camera; cena._camPos = null;
  heli = new Helicoptero(ac, { assist: estado.assist });
  ctl.zerar(); cmdExtra = {}; fila.length = 0;
  if (estado.giro) ctl.ligarGiro(); else ctl.desligarGiro();
  if (n && MISSOES[n]) { missao = new MISSOES[n](cena, heli, {}); } else { missao = null; cena.limparMarcadores(); heli.reset({ hpFt: 0, oatC: 25, ventoKt: 5, ventoDirDeg: 360 }); }
  ctl.coletivo = heli.coletivo; ctl.atualizarVisual(); // missões que começam em voo já vêm com o coletivo no pairado
  piloto = new PilotoAutomatico(heli); piloto.reset(); ctl.externo = modoVoo === 'auto'; guiaUltimo = ''; mostrarGuia(null, []);
  $('#painelTitulo').textContent = n ? `Fase ${n}: ${FASES[n - 1].titulo}` : `Voo livre · ${ac.curto}`;
  montarBotoesExtras();
  atualizarPainel(); rodando = true; ultimoT = performance.now(); requestAnimationFrame(loop);
}
function montarBotoesExtras() {
  const box = $('#botoesExtras'); box.innerHTML = '';
  const add = (rot, fn, cls = '') => { const b = document.createElement('button'); b.className = 'btn-mini ' + cls; b.textContent = rot; b.onclick = fn; box.appendChild(b); return b; };
  add('📷', () => { const m = ['atras', 'cabine', 'externa']; cena.modoCamera = m[(m.indexOf(cena.modoCamera) + 1) % 3]; estado.camera = cena.modoCamera; });
  add('📱', async () => { if (ctl.giro) { ctl.desligarGiro(); aviso('Giroscópio desligado'); } else { const ok = await ctl.ligarGiro(); aviso(ok ? 'Giroscópio ligado: segure o celular nivelado e incline para comandar' : 'Giroscópio não disponível neste aparelho/navegador'); } });
  if (!faseAtual) add('MOTOR', () => { cmdExtra.motor = heli.motor === 'on' ? 'off' : 'on'; aviso(cmdExtra.motor === 'off' ? 'Pane de motor simulada' : 'Motor religado'); });
  if (missao) for (const b of missao.botoes) add(b.rotulo, () => { missao.cmdExtra[b.id] = true; }, 'vermelho');
  if (missao) add('💡 ' + NOME_MODO[modoVoo], () => { const seq = ['livre', 'ajuda', 'auto']; modoVoo = seq[(seq.indexOf(modoVoo) + 1) % 3]; ctl.externo = modoVoo === 'auto'; if (modoVoo !== 'auto') { ctl.coletivo = heli.coletivo; } piloto.reset(); aviso('Modo: ' + NOME_MODO[modoVoo]); montarBotoesExtras(); mostrarGuia(null, []); });
  add('↻', () => iniciarVoo(faseAtual, modoVoo));
  add('✕', sairVoo, 'vermelho');
}
function aviso(txt) { fila.push(txt); }
function mostrarGuia(texto, acoes) {
  const el = $('#guia'); const chave = (texto || '') + '|' + acoes.map(a => a.t).join(',');
  if (chave !== guiaUltimo) {
    guiaUltimo = chave;
    el.hidden = !texto; if (texto) el.innerHTML = `<div class="guia-alvo">${modoVoo === 'auto' ? '▶️ ' : '🧑‍✈️ '}${texto}</div>${acoes.length ? `<div class="guia-acoes">${acoes.map(a => `<span class="chip">${a.t}</span>`).join('')}</div>` : ''}`;
  }
  const usados = new Set(acoes.map(a => a.ctl));
  $('#ctlCol')?.classList.toggle('destaque', usados.has('col')); $('#ctlPed')?.classList.toggle('destaque', usados.has('ped')); $('#ctlCic')?.classList.toggle('destaque', usados.has('cic'));
  $('#botoesExtras')?.classList.toggle('destaque', acoes.some(a => a.ctl === 'botao'));
}
function atualizarPainel() {
  const el = $('#objetivos');
  if (!missao) { el.innerHTML = '<div class="sub">Voo livre. Experimente os comandos.</div>'; return; }
  el.innerHTML = missao.objetivos.map(o => `<div class="obj ${o.feito ? 'feito' : ''}">${o.feito ? '✅' : '⬜'} ${o.texto}</div>`).join('');
}
function loop(t) {
  if (!rodando) return;
  const dt = Math.min(0.05, (t - ultimoT) / 1000); ultimoT = t;
  ctl.tick(dt);
  if (ctl.teclas.KeyC) { ctl.teclas.KeyC = false; $('#botoesExtras .btn-mini').click(); }
  let cmd = { ...ctl.comando(), ...cmdExtra, ...(missao ? missao.cmdExtra : {}) };
  if (missao && modoVoo !== 'livre' && missao.estado === 'andamento') {
    const alvo = missao.guia(); const cmdAuto = alvo ? piloto.calcular(alvo, dt) : null;
    if (cmdAuto && modoVoo === 'auto') {
      cmd = { ...cmd, coletivo: cmdAuto.coletivo, cicX: cmdAuto.cicX, cicY: cmdAuto.cicY, pedal: cmdAuto.pedal };
      ctl.coletivo = cmd.coletivo; ctl.cicX = cmd.cicX; ctl.cicY = cmd.cicY; ctl.pedal = cmd.pedal; ctl.atualizarVisual();
      if (cmdAuto.extra.cortar) missao.cmdExtra.cortar = true;
      mostrarGuia(alvo.texto, cmdAuto.acoes.length ? cmdAuto.acoes : [{ ctl: null, t: 'Mantendo' }]);
    } else if (cmdAuto && modoVoo === 'ajuda') {
      const d = alvo.botao ? { ctl: 'botao', t: 'Aperte o botão ' + alvo.botao.toUpperCase() } : dicaDeAjuda(cmdAuto, cmd, heli);
      mostrarGuia(alvo.texto, d ? [d] : []);
    }
  }
  // sub-passos para estabilidade numérica
  const n = 2; for (let i = 0; i < n; i++) heli.update(dt / n, cmd);
  if (missao) {
    missao.update(dt);
    for (const m of missao.msgs.splice(0)) fila.push(m);
    atualizarPainel();
    if (missao.estado !== 'andamento') { fimMissao(); return; }
  } else if (heli.crash) { aviso(heli.crash.texto); setTimeout(() => iniciarVoo(null), 4000); rodando = false; }
  // mensagens do instrutor
  msgTimer -= dt;
  if (msgTimer <= 0 && fila.length) { const m = fila.shift(); const el = $('#instrutor'); el.textContent = m; el.classList.add('on'); msgTimer = Math.min(8, 3 + m.length / 25); setTimeout(() => el.classList.remove('on'), msgTimer * 1000 - 300); }
  if (heli.buzina && Math.floor(t / 400) % 2 === 0) vibrar(40);
  cena.atualizar(heli, dt); cena.render(); hud.desenhar(heli, heli.ac);
  requestAnimationFrame(loop);
}
function fimMissao() {
  rodando = false; const ok = missao.estado === 'sucesso'; let est = missao.estrelas; const n = faseAtual; const resumo = missao.resumo;
  mostrarGuia(null, []);
  if (modoVoo === 'auto') { setTimeout(() => { mostrarTela(`<div class="tela centro"><div class="fase-ico grande">▶️</div><h2>Demonstração ${ok ? 'concluída' : 'interrompida'}</h2><p>${resumo}</p><p class="sub">A demonstração não dá estrelas. Agora é a sua vez.</p><div class="grade-botoes"><button class="btn btn-laranja grande" id="aj">🧑‍✈️ Fazer com ajuda</button><button class="btn btn-laranja grande" id="so">🎮 Fazer sozinho</button><button class="btn btn-cinza" id="rep">▶️ Ver de novo</button><button class="btn btn-cinza" id="voltar">Briefing</button></div></div>`); $('#aj').onclick = () => iniciarVoo(n, 'ajuda'); $('#so').onclick = () => iniciarVoo(n, 'livre'); $('#rep').onclick = () => iniciarVoo(n, 'auto'); $('#voltar').onclick = () => briefing(n); }, 800); return; }
  if (modoVoo === 'ajuda') est = Math.min(est, 2);
  setTimeout(() => { if (ok) miniQuiz(n, est, resumo); else { mostrarTela(`<div class="tela centro"><div class="fase-ico grande">💥</div><h2>Não deu certo</h2><p>${resumo}</p><div class="grade-botoes"><button class="btn btn-laranja grande" id="rep">Tentar de novo</button><button class="btn btn-cinza" id="voltar">Briefing</button></div></div>`); $('#rep').onclick = () => iniciarVoo(n, modoVoo); $('#voltar').onclick = () => briefing(n); } }, ok ? 600 : 1200);
}
function sairVoo() { rodando = false; if (faseAtual) briefing(faseAtual); else menu(); }

// ---------- Início ----------
menu();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
// evita zoom por duplo toque no iOS
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
