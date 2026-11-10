// Diário de Voo (instrução de helicóptero). Cada pessoa entra com o próprio Google e só ela vê os seus voos.
// Banco (Firestore): diario/{uid} = perfil (nome, CANAC, escola, instrutor, aeronave padrão, meta)
//                    diario/{uid}/voos/{id} = um voo. Regras em firestore.rules (só o dono lê e grava).
// O login é o mesmo do Simulador Heli: quem já entrou no jogo já entra aqui.
import '../embutido.js';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { entrarGoogle, navegadorRuim, avisoNavegador, ligarAviso } from '../entrar-google.js';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../firebase-config.js';
import { limpar, limparNome, soDigitos, formatarMatricula, matriculaValida, formatarIcao, icaoValido, formatarModelo, fecharDuracao, dataValida, hojeIso, celulaCsv, ligarMascaras } from '../entrada.js';
import { LOCAIS, dividirVoo, crepusculoCivil, paraMin, paraHHMM } from './crepusculo.js';
import { TIPOS_DOC, enviarDoc, apagarDoc, urlDoc, tamanhoBR } from './docs.js';

const app = initializeApp(FIREBASE_CONFIG), auth = getAuth(app), db = getFirestore(app);
auth.languageCode = 'pt';
const $ = (s, r = document) => r.querySelector(s);
const el = $('#app');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const dBR = (iso) => iso ? iso.split('-').reverse().join('/') : '';
const hm = (min) => paraHHMM(min || 0);
const dec = (min) => ((min || 0) / 60).toFixed(1).replace('.', ',');

const FUNCOES = { instrucao: 'Piloto em instrução (duplo comando)', solo: 'Solo (aluno em comando)', pic: 'Piloto em comando', instrutor: 'Instrutor' };
const EXERCICIOS = ['Pré-voo', 'Partida e cheques', 'Efeito dos comandos', 'Voo reto nivelado', 'Curvas', 'Subida e descida', 'Táxi pairado', 'Pairado', 'Giro 360° no pairado', 'Deslocamento lateral e à ré', 'Decolagem normal', 'Tráfego padrão', 'Aproximação normal', 'Pouso', 'Decolagem de máxima performance', 'Aproximação íngreme', 'Pouso corrido', 'Autorrotação', 'Autorrotação pairada', 'Pane de governador', 'Área restrita', 'Pouso em rampa', 'Navegação', 'Voo noturno', 'Emergências simuladas'];
const CIV = { nao: ['nao', 'Falta na CIV'], lancado: ['lan', 'Lançado na CIV'], conferido: ['ok', 'Conferido'] };
// Fases como aparecem no formulário diário do GOA (Acompanhamento PPH/2026)
const FASES = { gs: 'Ground School / familiarização', f1: 'Fase/Módulo 1 – Adaptação na aeronave', f2: 'Fase/Módulo 2 – Procedimentos anormais e de emergência', f3: 'Fase/Módulo 3 – Aquisição de experiência / piloto em comando', nav: 'Navegação', solo: 'Voo solo', not: 'Voo noturno', outra: 'Outra fase prevista no programa da escola' };
const GRAUS = { '': '—', aprovado: 'Aprovado', reprovado: 'Reprovado' };
const NATUREZA = { instrucao: 'Duplo comando', solo: 'Solo', pic: 'Piloto em comando', instrutor: 'Outra' };
const FORM_GOA = 'https://forms.gle/vFepv8CD5RDd7Ret7';

let user = null, perfil = null, voos = [], docs = [], pararVoos = null, pararDocs = null, editando = null, filtro = 'todos';
const docsDo = (id) => docs.filter((d) => d.voo === id);
const docTipo = (id, t) => docs.find((d) => d.voo === id && d.tipo === t);

function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

onAuthStateChanged(auth, async (u) => {
  user = u; pararVoos?.(); pararVoos = null; pararDocs?.(); pararDocs = null; voos = []; docs = []; perfil = null;
  topo();
  if (!u) return telaLogin();
  try { const s = await getDoc(doc(db, 'diario', u.uid)); perfil = s.exists() ? s.data() : null; }
  catch (e) { el.innerHTML = `<div class="cartao"><p class="erro">Não foi possível abrir o seu diário (${esc(e.code || e.message)}). Recarregue a página.</p></div>`; return; }
  if (!perfil) return telaPerfil(true);
  topo();
  pararVoos = onSnapshot(collection(db, 'diario', u.uid, 'voos'), (s) => {
    voos = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.data + (b.inicio || '')).localeCompare(a.data + (a.inicio || '')));
    if (!editando) telaPrincipal();
  }, (e) => { el.innerHTML = `<div class="cartao"><p class="erro">Erro ao ler os voos (${esc(e.code)}).</p></div>`; });
  pararDocs = onSnapshot(collection(db, 'diario', u.uid, 'docs'), (s) => {
    docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!editando) telaPrincipal(); else if (editando !== 'novo') desenharDocs();
  }, () => {});
});

function topo() {
  const t = $('#contaTopo');
  t.innerHTML = user ? `<span>${esc(perfil?.nome || user.displayName || user.email)}</span><button class="mini" id="btSair">Sair</button>` : '';
  $('#btSair')?.addEventListener('click', () => signOut(auth));
}

function telaLogin(erro) {
  el.innerHTML = `<section class="cartao login"><h2>Entre com a sua conta Google</h2>
    <p class="sub">Cada piloto tem o próprio diário: só você vê os seus voos. É o mesmo login do Simulador Heli.</p>
    <button class="pri" id="btEntrar">Entrar com Google</button>${erro && erro !== 'navegador' ? `<p class="erro">${esc(erro)}</p>` : ''}${avisoNavegador(erro === 'navegador' || navegadorRuim())}</section>
    <section class="cartao"><h3>Para que serve</h3><p>Anote cada voo na hora, com o horário, o tempo diurno e noturno, os pousos e o que foi treinado. Depois confira com a CIV Digital da ANAC se o voo foi lançado igual. Quando tudo bater, marque como "Conferido".</p></section>`;
  ligarAviso();
  $('#btEntrar').onclick = async () => { const r = await entrarGoogle(auth); if (r) telaLogin(r); };
}

function telaPerfil(primeira) {
  const p = perfil || { nome: user.displayName || '', escola: 'EACAR – Escola de Aviação Civil Asas Rotativas', curso: 'PPH – curso prático', modelo: 'R22 Beta II', origem: 'SISY', local: 'piraquara', meta: 40 };
  el.innerHTML = `<section class="cartao"><div class="cab"><h2>${primeira ? 'Seus dados de piloto' : 'Editar meus dados'}</h2></div>
    <p class="sub">${primeira ? 'Preencha uma vez. Os dados da aeronave e do instrutor viram o padrão de cada voo novo.' : ''}</p>
    <form id="fPerfil" class="form">
      <label class="largo">Nome completo<input id="pNome" required data-m="nome" maxlength="80" value="${esc(p.nome)}"></label>
      <label>CANAC<input id="pCanac" data-m="canac" value="${esc(p.canac)}" placeholder="6 dígitos"></label>
      <label>Escola<input id="pEscola" data-m="texto" maxlength="60" value="${esc(p.escola)}"></label>
      <label>Curso<input id="pCurso" data-m="texto" maxlength="60" value="${esc(p.curso)}"></label>
      <label>Instrutor (padrão)<input id="pInstrutor" data-m="nome" maxlength="80" value="${esc(p.instrutor)}"></label>
      <label>CANAC do instrutor<input id="pCanacInstr" data-m="canac" value="${esc(p.canacInstrutor)}"></label>
      <label>Aeronave (modelo)<input id="pModelo" data-m="modelo" value="${esc(p.modelo)}"></label>
      <label>Matrícula padrão<input id="pMatricula" data-m="matricula" value="${esc(p.matricula)}" placeholder="PR-XXX"></label>
      <label>Aeródromo de origem padrão<input id="pOrigem" data-m="icao" value="${esc(p.origem)}" placeholder="SISY"></label>
      <label>Local do cálculo diurno/noturno<select id="pLocal">${Object.entries(LOCAIS).map(([k, v]) => `<option value="${k}" ${k === p.local ? 'selected' : ''}>${v.nome}</option>`).join('')}</select></label>
      <label>Meta de horas do curso<input id="pMeta" type="number" min="0" max="2000" step="0.5" value="${esc(p.meta)}"></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Salvar</button>${primeira ? '' : '<button type="button" id="pVoltar">Voltar</button>'}</div>
    </form><p class="erro" id="pErro"></p></section>`;
  ligarMascaras(el);
  $('#pVoltar')?.addEventListener('click', telaPrincipal);
  $('#fPerfil').onsubmit = async (e) => {
    e.preventDefault();
    const d = { nome: limparNome($('#pNome').value, 80), canac: soDigitos($('#pCanac').value, 6), escola: limpar($('#pEscola').value, 60), curso: limpar($('#pCurso').value, 60), instrutor: limparNome($('#pInstrutor').value, 80), canacInstrutor: soDigitos($('#pCanacInstr').value, 6), modelo: formatarModelo($('#pModelo').value).trim(), matricula: formatarMatricula($('#pMatricula').value), origem: formatarIcao($('#pOrigem').value), local: LOCAIS[$('#pLocal').value] ? $('#pLocal').value : 'piraquara', meta: Math.min(2000, Math.max(0, Number($('#pMeta').value) || 0)), email: user.email, atualizadoEm: serverTimestamp() };
    const erro = d.nome.length < 3 ? 'Escreva o nome completo.' : d.canac && d.canac.length !== 6 ? 'O CANAC tem 6 dígitos.' : d.canacInstrutor && d.canacInstrutor.length !== 6 ? 'O CANAC do instrutor tem 6 dígitos.'
      : !matriculaValida(d.matricula) ? 'Matrícula no formato PR-ABC.' : !icaoValido(d.origem) ? 'O aeródromo de origem tem 4 letras (ex.: SISY).' : '';
    if (erro) { $('#pErro').textContent = erro; return; }
    try { await setDoc(doc(db, 'diario', user.uid), d, { merge: true }); perfil = d; topo(); toast('Dados salvos'); if (primeira) location.reload(); else telaPrincipal(); }
    catch (e2) { $('#pErro').textContent = 'Não salvou: ' + (e2.code || e2.message); }
  };
}

function somar(lista) {
  const t = { total: 0, diurno: 0, noturno: 0, instrucao: 0, solo: 0, pic: 0, pousosD: 0, pousosN: 0, capota: 0, nav: 0, n: lista.length };
  for (const v of lista) {
    const tot = (v.diurno || 0) + (v.noturno || 0);
    t.total += tot; t.diurno += v.diurno || 0; t.noturno += v.noturno || 0; t.capota += v.capota || 0; t.nav += v.navegacao || 0;
    t.pousosD += v.pousosD || 0; t.pousosN += v.pousosN || 0;
    if (v.funcao === 'instrucao') t.instrucao += tot; else if (v.funcao === 'solo') t.solo += tot; else if (v.funcao === 'pic') t.pic += tot;
  }
  return t;
}

function telaPrincipal() {
  editando = null;
  const t = somar(voos), meta = (perfil.meta || 0) * 60, pend = voos.filter((v) => (v.civ || 'nao') !== 'conferido').length;
  const semDoc = voos.filter((v) => Object.keys(TIPOS_DOC).some((k) => !docTipo(v.id, k))).length;
  const lista = filtro === 'pendentes' ? voos.filter((v) => (v.civ || 'nao') !== 'conferido') : voos;
  el.innerHTML = `
    <section class="cartao"><div class="cab"><div><h2>${esc(perfil.nome)}</h2><div class="sub">${perfil.canac ? 'CANAC ' + esc(perfil.canac) + ' · ' : ''}${esc(perfil.curso || '')} · ${esc(perfil.escola || '')}</div></div>
      <div class="linha-acao"><button class="pri" id="btNovo">+ Novo voo</button><button id="btPerfil">Meus dados</button></div></div>
      <div class="totais">
        <div class="tot dest"><span>Total</span><b>${hm(t.total)}</b><span>${dec(t.total)} h · ${t.n} voo(s)</span></div>
        <div class="tot"><span>Diurno</span><b>${hm(t.diurno)}</b></div>
        <div class="tot"><span>Noturno</span><b>${hm(t.noturno)}</b></div>
        <div class="tot"><span>Duplo comando</span><b>${hm(t.instrucao)}</b></div>
        <div class="tot"><span>Solo</span><b>${hm(t.solo)}</b></div>
        <div class="tot"><span>Pousos</span><b>${t.pousosD + t.pousosN}</b><span>${t.pousosD} D · ${t.pousosN} N</span></div>
        <div class="tot"><span>Navegação</span><b>${hm(t.nav)}</b></div>
        <div class="tot"><span>Capota (IFR)</span><b>${hm(t.capota)}</b></div>
      </div>
      ${meta ? `<div><div class="cab"><span class="sub">Meta do curso: ${perfil.meta} h</span><span class="sub">${Math.min(100, Math.round(t.total / meta * 100))}%</span></div><div class="barra"><i style="width:${Math.min(100, t.total / meta * 100)}%"></i></div></div>` : ''}
      ${semDoc ? `<div class="dica alerta"><b>${semDoc} voo(s) sem a foto ou o PDF do Diário de Bordo e da Ficha de Avaliação.</b> Abra o voo e envie (o formulário diário do GOA pede os dois).</div>` : ''}
      ${pend ? `<div class="dica"><b>${pend} voo(s) ainda não conferido(s) com a CIV Digital.</b> Abra a CIV (ANAC › SACI ou app ANAC) e compare data, aeronave, tempos e pousos.</div>` : voos.length ? '<div class="dica">Todos os voos conferidos com a CIV.</div>' : ''}
    </section>
    <section class="cartao"><div class="cab"><h2>Voos</h2><div class="chips"><button class="chip" aria-pressed="${filtro === 'todos'}" data-f="todos">Todos</button><button class="chip" aria-pressed="${filtro === 'pendentes'}" data-f="pendentes">Falta conferir</button></div></div>
      ${lista.length ? `<div class="tabela"><table><thead><tr><th>Data</th><th>Aeronave</th><th>Trecho</th><th>Horário</th><th class="n">Diurno</th><th class="n">Noturno</th><th class="n">Pousos</th><th>Função</th><th>Docs</th><th>CIV</th><th></th></tr></thead><tbody>
        ${lista.map((v) => { const c = CIV[v.civ || 'nao']; return `<tr><td>${dBR(v.data)}</td><td>${esc(v.modelo)}<br><span class="sub">${esc(v.matricula)}</span></td><td>${esc(v.origem)}${v.destino && v.destino !== v.origem ? '→' + esc(v.destino) : ''}</td><td>${esc(v.inicio || '')}–${esc(v.fim || '')}</td><td class="n">${hm(v.diurno)}</td><td class="n">${hm(v.noturno)}</td><td class="n">${(v.pousosD || 0) + (v.pousosN || 0)}</td><td>${esc((FUNCOES[v.funcao] || '').split(' (')[0])}${v.missao ? `<br><span class="sub">${esc(v.missao)}</span>` : ''}</td><td>${Object.keys(TIPOS_DOC).map((k) => docTipo(v.id, k) ? `<span class="selo ok">${k === 'db' ? 'DB' : 'Ficha'} ✓</span>` : `<span class="selo nao">${k === 'db' ? 'DB' : 'Ficha'}?</span>`).join(' ')}</td><td><span class="selo ${c[0]}">${c[1]}</span></td><td><button class="mini" data-ed="${v.id}">Abrir</button></td></tr>`; }).join('')}
      </tbody></table></div>` : `<div class="vazio">${voos.length ? 'Nenhum voo pendente de conferência.' : 'Nenhum voo lançado ainda. Toque em <b>+ Novo voo</b> logo depois de cada voo, com o horário de início e fim.'}</div>`}
      ${voos.length ? '<div class="linha-acao"><button id="btCsv">Baixar planilha (CSV)</button><button id="btCopiar">Copiar resumo</button></div>' : ''}
    </section>
    <section class="cartao"><h3>Como conferir com a CIV Digital</h3>
      <p class="sub">O registro oficial das horas é a <b>CIV Digital</b> da ANAC (acesso pelo SACI com login e senha, ou pelo app ANAC). Desde 01/12/2022 os voos são registrados só nela. Diurno + noturno = tempo total do voo. Voo noturno é o feito entre o fim do crepúsculo civil da tarde e o início do da manhã; este diário calcula a sugestão pelo crepúsculo de ${esc(LOCAIS[perfil.local]?.nome || LOCAIS.piraquara.nome)}. Confira com o instrutor como a escola marca o início e o fim do tempo de voo.</p></section>`;
  $('#btNovo').onclick = () => telaVoo(null); $('#btPerfil').onclick = () => telaPerfil(false);
  el.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filtro = b.dataset.f; telaPrincipal(); });
  el.querySelectorAll('[data-ed]').forEach((b) => b.onclick = () => telaVoo(voos.find((v) => v.id === b.dataset.ed)));
  $('#btCsv')?.addEventListener('click', baixarCsv); $('#btCopiar')?.addEventListener('click', copiarResumo);
}

function telaVoo(v) {
  editando = v ? v.id : 'novo';
  const p = perfil;
  v = v || { data: hoje(), modelo: p.modelo, matricula: p.matricula, origem: p.origem, destino: p.origem, funcao: 'instrucao', instrutor: p.instrutor, canacInstrutor: p.canacInstrutor, pousosD: 1, pousosN: 0, decolagens: 1, capota: 0, navegacao: 0, exercicios: [], civ: 'nao', fase: ultimaFase() };
  vooAberto = v; filaDocs = {};
  const ex = new Set(v.exercicios || []);
  let tocado = { diurno: v.id != null, noturno: v.id != null };
  el.innerHTML = `<section class="cartao"><div class="cab"><h2>${v.id ? 'Voo de ' + dBR(v.data) : 'Novo voo'}</h2><button type="button" id="vVoltar">Voltar</button></div>
    <form id="fVoo" class="form">
      <label>Data<input id="vData" type="date" required min="2000-01-01" max="${hojeIso(1)}" value="${esc(v.data)}"></label>
      <label>Aeronave (modelo)<input id="vModelo" data-m="modelo" value="${esc(v.modelo)}"></label>
      <label>Matrícula<input id="vMatricula" data-m="matricula" value="${esc(v.matricula)}" placeholder="PR-XXX"></label>
      <label>Origem (ICAO)<input id="vOrigem" data-m="icao" placeholder="SISY" value="${esc(v.origem)}"></label>
      <label>Destino (ICAO)<input id="vDestino" data-m="icao" placeholder="SISY" value="${esc(v.destino)}"></label>
      <div class="largo dica">No Diário de Bordo os horários estão em <b>UTC (Z)</b>. Aqui use a hora local: em Piraquara é <b>Z − 3 h</b> (ex.: partida 1000Z = 07:00).</div>
      <label>Início / partida (hora local)<input id="vInicio" type="time" value="${esc(v.inicio)}"></label>
      <label>Decolagem (hora local)<input id="vDec" type="time" value="${esc(v.dec)}"></label>
      <label>Pouso (hora local)<input id="vPouso" type="time" value="${esc(v.pouso)}"></label>
      <label>Fim / corte (hora local)<input id="vFim" type="time" value="${esc(v.fim)}"></label>
      <div class="largo dica" id="vCalc">Informe início e fim: o diário sugere o tempo diurno e o noturno.</div>
      <label>Tempo diurno (h:min)<input id="vDiurno" data-m="duracao" value="${hm(v.diurno)}" placeholder="00:00"></label>
      <label>Tempo noturno (h:min)<input id="vNoturno" data-m="duracao" value="${hm(v.noturno)}" placeholder="00:00"></label>
      <label>Função a bordo<select id="vFuncao">${Object.entries(FUNCOES).map(([k, t]) => `<option value="${k}" ${k === v.funcao ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Decolagens<input id="vDecolagens" type="number" min="0" max="99" step="1" value="${v.decolagens ?? ''}"></label>
      <label>Pousos diurnos<input id="vPousosD" type="number" min="0" max="99" step="1" value="${v.pousosD || 0}"></label>
      <label>Pousos noturnos<input id="vPousosN" type="number" min="0" max="99" step="1" value="${v.pousosN || 0}"></label>
      <label>Navegação (h:min)<input id="vNav" data-m="duracao" value="${hm(v.navegacao)}" placeholder="00:00"></label>
      <label>Capota / IFR (h:min)<input id="vCapota" data-m="duracao" value="${hm(v.capota)}" placeholder="00:00"></label>
      <label>Instrutor<input id="vInstrutor" data-m="nome" maxlength="80" value="${esc(v.instrutor)}"></label>
      <label>CANAC do instrutor<input id="vCanacInstr" data-m="canac" value="${esc(v.canacInstrutor)}"></label>
      <label>Missão (como na ficha)<input id="vMissao" data-m="texto" maxlength="40" value="${esc(v.missao)}" placeholder="Ex.: INCT-02 (Etapa II, Fase 1)"></label>
      <label>Fase do curso<select id="vFase">${Object.entries(FASES).map(([k, t]) => `<option value="${k}" ${k === (v.fase || 'f1') ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label>Grau final da ficha<select id="vGrau">${Object.entries(GRAUS).map(([k, t]) => `<option value="${k}" ${k === (v.grau || '') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="largo">Parecer do instrutor (copie da ficha)<textarea id="vParecer" data-m="texto" maxlength="600" placeholder="Ex.: Bom voo, treinar fluidez dos comandos...">${esc(v.parecer)}</textarea></label>
      <div class="largo"><h3 style="margin-bottom:6px">O que foi treinado</h3><div class="chips" id="vEx">${EXERCICIOS.map((x) => `<button type="button" class="chip" aria-pressed="${ex.has(x)}" data-x="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
      <label class="largo">Observações (o que aprendi, o que errei, o que o instrutor pediu)<textarea id="vObs" data-m="texto" maxlength="2000">${esc(v.obs)}</textarea></label>
      <label>Situação na CIV Digital<select id="vCiv">${Object.entries(CIV).map(([k, c]) => `<option value="${k}" ${k === (v.civ || 'nao') ? 'selected' : ''}>${c[1]}</option>`).join('')}</select></label>
      <div class="largo"><h3 style="margin-bottom:4px">Documentos do voo</h3><p class="sub" style="margin:0 0 8px">Foto (tirada na hora ou da galeria) ou PDF do Diário de Bordo e da Ficha de Avaliação. Fica só no seu diário; o formulário do GOA pede os dois.</p><div id="vDocs" class="docs"></div></div>
      <div class="largo linha-acao"><button class="pri" type="submit">Salvar voo</button>${v.id ? '<button type="button" class="perigo" id="vApagar">Apagar</button>' : ''}</div>
    </form><p class="erro" id="vErro"></p></section>
    ${v.id ? painelGoa(v) : `<section class="cartao"><h3>Formulário diário do GOA</h3><p class="sub">Depois de salvar o voo, aparecem aqui as respostas prontas para copiar no formulário.</p></section>`}`;
  desenharDocs(); ligarGoa();
  ligarMascaras(el);
  const recalcular = () => {
    const d = $('#vData').value, i = $('#vInicio').value, f = $('#vFim').value, local = LOCAIS[perfil.local] || LOCAIS.piraquara;
    if (!d || !i || !f) return;
    const r = dividirVoo(d, i, f, local), c = crepusculoCivil(d, local.lat, local.lon);
    $('#vCalc').innerHTML = `Tempo total <b>${hm(r.total)}</b> (${dec(r.total)} h): sugestão de <b>${hm(r.diurno)}</b> diurno e <b>${hm(r.noturno)}</b> noturno. Crepúsculo civil em ${dBR(d)}: amanhece ${paraHHMM(c.inicio)}, anoitece ${paraHHMM(c.fim)}.`;
    if (!tocado.diurno) { $('#vDiurno').value = hm(r.diurno); $('#vDiurno').classList.add('sugerido'); }
    if (!tocado.noturno) { $('#vNoturno').value = hm(r.noturno); $('#vNoturno').classList.add('sugerido'); }
  };
  ['#vData', '#vInicio', '#vFim'].forEach((s) => $(s).addEventListener('change', recalcular));
  $('#vDiurno').addEventListener('input', () => { tocado.diurno = true; $('#vDiurno').classList.remove('sugerido'); });
  $('#vNoturno').addEventListener('input', () => { tocado.noturno = true; $('#vNoturno').classList.remove('sugerido'); });
  if (v.inicio && v.fim) { const salvo = { ...tocado }; tocado = { diurno: true, noturno: true }; recalcular(); tocado = salvo; }
  $('#vEx').onclick = (e) => { const b = e.target.closest('[data-x]'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); };
  $('#vVoltar').onclick = telaPrincipal;
  $('#vApagar')?.addEventListener('click', async () => { if (!confirm('Apagar este voo do seu diário (e os documentos dele)?')) return; for (const d of docsDo(v.id)) await apagarDoc(db, user.uid, d).catch(() => {}); await deleteDoc(doc(db, 'diario', user.uid, 'voos', v.id)); toast('Voo apagado'); telaPrincipal(); });
  $('#fVoo').onsubmit = async (e) => {
    e.preventDefault();
    const minDe = (s) => Math.min(24 * 60, paraMin(fecharDuracao($(s).value)) ?? 0);
    const pousos = (s) => Math.min(99, Math.max(0, Math.floor(+$(s).value) || 0));
    const d = {
      data: $('#vData').value, modelo: formatarModelo($('#vModelo').value).trim(), matricula: formatarMatricula($('#vMatricula').value), origem: formatarIcao($('#vOrigem').value), destino: formatarIcao($('#vDestino').value),
      inicio: /^\d{2}:\d{2}$/.test($('#vInicio').value) ? $('#vInicio').value : '', fim: /^\d{2}:\d{2}$/.test($('#vFim').value) ? $('#vFim').value : '', diurno: minDe('#vDiurno'), noturno: minDe('#vNoturno'), funcao: FUNCOES[$('#vFuncao').value] ? $('#vFuncao').value : 'instrucao',
      pousosD: pousos('#vPousosD'), pousosN: pousos('#vPousosN'), navegacao: minDe('#vNav'), capota: minDe('#vCapota'),
      instrutor: limparNome($('#vInstrutor').value, 80), canacInstrutor: soDigitos($('#vCanacInstr').value, 6),
      dec: /^\d{2}:\d{2}$/.test($('#vDec').value) ? $('#vDec').value : '', pouso: /^\d{2}:\d{2}$/.test($('#vPouso').value) ? $('#vPouso').value : '',
      decolagens: $('#vDecolagens').value === '' ? null : pousos('#vDecolagens'), missao: limpar($('#vMissao').value, 40), fase: FASES[$('#vFase').value] ? $('#vFase').value : 'outra',
      grau: GRAUS[$('#vGrau').value] != null ? $('#vGrau').value : '', parecer: limpar($('#vParecer').value, 600, { multilinha: true }),
      exercicios: [...el.querySelectorAll('#vEx [aria-pressed="true"]')].map((b) => b.dataset.x).filter((x) => EXERCICIOS.includes(x)), obs: limpar($('#vObs').value, 2000, { multilinha: true }), civ: CIV[$('#vCiv').value] ? $('#vCiv').value : 'nao', atualizadoEm: serverTimestamp(),
    };
    if (!dataValida(d.data, '2000-01-01', hojeIso(1))) { $('#vErro').textContent = 'Informe uma data válida (não pode ser no futuro).'; return; }
    if (!matriculaValida(d.matricula)) { $('#vErro').textContent = 'Matrícula no formato PR-ABC.'; return; }
    if (!icaoValido(d.origem) || !icaoValido(d.destino)) { $('#vErro').textContent = 'Origem e destino têm 4 letras (código ICAO, ex.: SISY).'; return; }
    if (d.canacInstrutor && d.canacInstrutor.length !== 6) { $('#vErro').textContent = 'O CANAC do instrutor tem 6 dígitos.'; return; }
    if (d.diurno + d.noturno <= 0) { $('#vErro').textContent = 'Informe o tempo de voo (início e fim, ou diurno/noturno).'; return; }
    const id = v.id || (d.data + '-' + (d.inicio || '').replace(':', '') + '-' + Math.random().toString(36).slice(2, 6));
    try {
      await setDoc(doc(db, 'diario', user.uid, 'voos', id), v.id ? d : { ...d, criadoEm: serverTimestamp() }, { merge: true });
      const fila = Object.entries(filaDocs);
      if (fila.length) { $('#vErro').textContent = ''; toast('Voo salvo. Enviando documentos…'); for (const [tipo, arq] of fila) await enviarDoc(db, user.uid, id, tipo, arq, docs); filaDocs = {}; }
      toast(fila.length ? 'Voo e documentos salvos' : 'Voo salvo');
      if (v.id) telaPrincipal(); else telaVoo({ id, ...d });
    }
    catch (e2) { $('#vErro').textContent = 'Não salvou: ' + (e2.code || e2.message); }
  };
}

function linhasCsv() {
  const cab = ['Data', 'Modelo', 'Matrícula', 'Origem', 'Destino', 'Início', 'Fim', 'Diurno', 'Noturno', 'Total', 'Função', 'Pousos diurnos', 'Pousos noturnos', 'Navegação', 'Capota', 'Instrutor', 'CANAC instrutor', 'Missão', 'Fase', 'Grau', 'Parecer do instrutor', 'Treinado', 'Observações', 'CIV'];
  const q = celulaCsv;
  return [cab.map(q).join(';'), ...[...voos].reverse().map((v) => [dBR(v.data), v.modelo, v.matricula, v.origem, v.destino, v.inicio, v.fim, hm(v.diurno), hm(v.noturno), hm((v.diurno || 0) + (v.noturno || 0)), FUNCOES[v.funcao], v.pousosD, v.pousosN, hm(v.navegacao), hm(v.capota), v.instrutor, v.canacInstrutor, v.missao, FASES[v.fase] || '', GRAUS[v.grau || ''], v.parecer, (v.exercicios || []).join(', '), v.obs, CIV[v.civ || 'nao'][1]].map(q).join(';'))].join('\r\n');
}
function baixarCsv() {
  const b = new Blob(['﻿' + linhasCsv()], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = `diario-de-voo-${(perfil.nome || 'piloto').split(' ')[0].toLowerCase()}-${hoje()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function copiarResumo() {
  const t = somar(voos);
  const txt = `Diário de voo – ${perfil.nome}${perfil.canac ? ' (CANAC ' + perfil.canac + ')' : ''}\nTotal ${hm(t.total)} em ${t.n} voo(s): diurno ${hm(t.diurno)}, noturno ${hm(t.noturno)}, duplo comando ${hm(t.instrucao)}, solo ${hm(t.solo)}; pousos ${t.pousosD} D e ${t.pousosN} N.\n` +
    [...voos].reverse().map((v) => `${dBR(v.data)} ${v.matricula || v.modelo} ${v.origem}${v.destino && v.destino !== v.origem ? '→' + v.destino : ''} ${v.inicio || ''}–${v.fim || ''}: D ${hm(v.diurno)} N ${hm(v.noturno)}, ${(v.pousosD || 0) + (v.pousosN || 0)} pouso(s) [${CIV[v.civ || 'nao'][1]}]`).join('\n');
  navigator.clipboard.writeText(txt).then(() => toast('Resumo copiado'), () => toast('Não deu para copiar'));
}

// ---------- documentos do voo (DB e ficha) ----------
let vooAberto = null, filaDocs = {};
function ultimaFase() { return voos[0]?.fase || 'f1'; }
function desenharDocs() {
  const box = $('#vDocs'); if (!box || !vooAberto) return;
  const id = vooAberto.id;
  box.innerHTML = Object.entries(TIPOS_DOC).map(([k, nome]) => {
    const d = id ? docTipo(id, k) : null, fila = filaDocs[k];
    return `<div class="doc-slot ${d || fila ? 'tem' : ''}"><div class="doc-tit">${esc(nome)}</div>
      ${d ? `<div class="sub">📎 ${esc(d.nome)} · ${tamanhoBR(d.tamanho || 0)}</div><div class="linha-acao"><button type="button" class="mini" data-doc-abrir="${d.id}">Abrir</button><button type="button" class="mini" data-doc-baixar="${d.id}">Baixar</button><label class="btn mini">Trocar<input type="file" accept="image/*,application/pdf" data-doc-tipo="${k}" hidden></label><button type="button" class="mini" data-doc-tirar="${d.id}">Tirar</button></div>`
        : fila ? `<div class="sub">📎 ${esc(fila.name)} (envia ao salvar o voo)</div><div class="linha-acao"><label class="btn mini">Trocar<input type="file" accept="image/*,application/pdf" data-doc-tipo="${k}" hidden></label></div>`
        : `<div class="linha-acao"><label class="btn mini pri">📷 Foto ou PDF<input type="file" accept="image/*,application/pdf" data-doc-tipo="${k}" hidden></label></div>`}
      <div class="sub doc-st" data-doc-st="${k}"></div></div>`;
  }).join('');
  box.querySelectorAll('[data-doc-tipo]').forEach((inp) => inp.onchange = async () => {
    const arq = inp.files?.[0], tipo = inp.dataset.docTipo; if (!arq) return;
    if (!id) { filaDocs[tipo] = arq; return desenharDocs(); }
    const st = box.querySelector(`[data-doc-st="${tipo}"]`); st.textContent = 'Enviando…';
    try { await enviarDoc(db, user.uid, id, tipo, arq, docs); toast(TIPOS_DOC[tipo] + ' salvo'); }
    catch (e) { st.textContent = 'Não enviou: ' + (e.code === 'permission-denied' ? 'o envio de documentos ainda está sendo ativado no banco.' : e.message || e.code); }
  });
  const achar = (x) => docs.find((d) => d.id === x);
  box.querySelectorAll('[data-doc-abrir]').forEach((b) => b.onclick = async () => { const w = window.open('', '_blank'); try { const u = await urlDoc(db, user.uid, achar(b.dataset.docAbrir)); if (w) w.location = u; else location.href = u; } catch (e) { w?.close(); toast('Não abriu: ' + (e.code || e.message)); } });
  box.querySelectorAll('[data-doc-baixar]').forEach((b) => b.onclick = async () => { const d = achar(b.dataset.docBaixar); try { const a = document.createElement('a'); a.href = await urlDoc(db, user.uid, d); a.download = nomeArquivo(d); document.body.appendChild(a); a.click(); a.remove(); } catch (e) { toast('Não baixou: ' + (e.code || e.message)); } });
  box.querySelectorAll('[data-doc-tirar]').forEach((b) => b.onclick = async () => { const d = achar(b.dataset.docTirar); if (!d || !confirm(`Tirar "${d.nome}" deste voo?`)) return; try { await apagarDoc(db, user.uid, d); toast('Documento tirado'); } catch (e) { toast('Não tirou: ' + (e.code || e.message)); } });
}
// Nome do arquivo para anexar no formulário do GOA: "DB 2026-11-10 PR-HMI.pdf", "Ficha 2026-11-10 PR-HMI.jpg"
function nomeArquivo(d) {
  const v = voos.find((x) => x.id === d.voo) || {}, ext = d.mime === 'application/pdf' ? 'pdf' : (d.mime || '').includes('png') ? 'png' : 'jpg';
  return `${d.tipo === 'db' ? 'DB' : 'Ficha'} ${v.data || ''} ${v.matricula || ''}`.trim() + '.' + ext;
}

// ---------- respostas para o formulário diário do GOA ----------
function respostasGoa(v) {
  const tot = (v.diurno || 0) + (v.noturno || 0), pous = (v.pousosD || 0) + (v.pousosN || 0);
  const confirme = ' (confirme)';
  return [
    ['1. Identificação', null],
    ['Militar', `Escolha o seu nome na lista (${perfil.nome})`],
    ['Data da atividade', dBR(v.data)],
    ['Houve atividade de instrução nesta data?', 'Sim'],
    ['2. Atividade', null],
    ['Tipo de atividade', 'Voo de instrução'],
    ['A atividade estava prevista no cronograma ou QTS?', 'Sim' + confirme],
    ['Horário efetivo de início', v.inicio || ''],
    ['Horário efetivo de término', v.fim || ''],
    ['O militar permaneceu integralmente na atividade programada?', 'Sim'],
    ['Houve atraso ou alteração relevante?', 'Não' + confirme],
    ['Fase atual da formação', FASES[v.fase] || ''],
    ['Número ou identificação da missão, aula ou ficha', [v.missao, `Aula ${voos.filter((x) => (x.data + (x.inicio || '')) <= (v.data + (v.inicio || ''))).length}`].filter(Boolean).join(' – ')],
    ['Objetivo principal / manobras', (v.exercicios || []).join(', ')],
    ['Esta atividade envolveu voo em aeronave?', 'Sim'],
    ['3. Dados do voo', null],
    ['Modelo da aeronave', v.modelo || ''],
    ['Matrícula / prefixo', v.matricula || ''],
    ['Nome do instrutor', v.instrutor || ''],
    ['CANAC do instrutor', v.canacInstrutor || ''],
    ['Aeródromo / local de saída', v.origem || ''],
    ['Aeródromo / local de destino ou retorno', v.destino || ''],
    ['Hora de decolagem', v.dec || ''],
    ['Hora de pouso', v.pouso || ''],
    ['Tempo de voo lançado na ficha', hm(tot) + ` (${dec(tot)} h)`],
    ['Natureza / marca de experiência', NATUREZA[v.funcao] || 'Duplo comando'],
    ['Quantidade de decolagens', v.decolagens != null ? String(v.decolagens) : ''],
    ['Quantidade de pousos completos', String(pous)],
    ['Rota do voo', v.origem === v.destino ? `${v.origem} – ${v.destino} (voo local)` : `${v.origem} – ${v.destino}`],
    ['4. Instrução e desempenho', null],
    ['Briefing antes da instrução?', 'Sim' + confirme],
    ['Debriefing após a instrução?', 'Sim' + confirme],
    ['O instrutor informou o desempenho e os pontos a melhorar?', 'Sim' + confirme],
    ['Resultado / conceito da missão', GRAUS[v.grau || ''] === '—' ? '' : GRAUS[v.grau]],
    ['Indicada necessidade de repetir a missão?', v.grau === 'reprovado' ? 'Sim' : v.grau === 'aprovado' ? 'Não' : 'Não informado'],
    ['Principais pontos trabalhados e observações', [v.parecer, v.obs].filter(Boolean).join(' | ')],
    ['5. Documentação', null],
    ['Upload da ficha de voo do aluno', docTipo(v.id, 'ficha') ? 'Baixe aqui em "Documentos do voo" e anexe' : '⚠ Falta enviar a ficha neste voo'],
    ['Upload do DB do voo do aluno', docTipo(v.id, 'db') ? 'Baixe aqui em "Documentos do voo" e anexe' : '⚠ Falta enviar o DB neste voo'],
    ['6. Execução contratual', null],
    ['Aeronave disponível e em condições?', 'Sim' + confirme],
    ['Instrutor disponível?', 'Sim' + confirme],
    ['Material didático e equipamentos disponíveis?', 'Sim' + confirme],
    ['A atividade ocorreu integralmente conforme programada?', 'Sim' + confirme],
    ['Alguma ocorrência a comunicar ao CBMERJ?', 'Não' + confirme],
    ['7. Declaração', 'Marque a confirmação do registro e envie'],
  ];
}
function painelGoa(v) {
  return `<section class="cartao goa"><div class="cab"><h3>📋 Formulário diário do GOA</h3><a class="btn pri" href="${FORM_GOA}" target="_blank" rel="noopener">Abrir o formulário</a></div>
    <p class="sub">Uma resposta por voo (dois voos no dia = duas respostas). Abaixo, as respostas deste voo na ordem do formulário: toque em <b>Copiar</b> e cole no campo. O que está marcado "(confirme)" é o padrão; mude se o dia foi diferente.</p>
    <div class="goa-lista">${respostasGoa(v).map(([k, val], i) => val === null ? `<div class="goa-sec">${esc(k)}</div>`
      : `<div class="goa-lin"><span class="goa-k">${esc(k)}</span><span class="goa-v ${val ? '' : 'vazio'}">${esc(val || '— preencha no voo')}</span>${val && !/^Escolha|^Baixe|^⚠|^Marque/.test(val) ? `<button type="button" class="mini" data-goa="${i}">Copiar</button>` : '<span></span>'}</div>`).join('')}</div>
    <div class="linha-acao"><button type="button" id="goaTudo">Copiar tudo (texto)</button></div></section>`;
}
function ligarGoa() {
  const v = vooAberto; if (!v?.id) return;
  const lista = respostasGoa(v), limpo = (t) => String(t).replace(/ \(confirme\)$/, '');
  const copiar = (t, msg) => navigator.clipboard.writeText(t).then(() => toast(msg), () => toast('Não deu para copiar'));
  el.querySelectorAll('[data-goa]').forEach((b) => b.onclick = () => copiar(limpo(lista[+b.dataset.goa][1]), 'Copiado'));
  $('#goaTudo')?.addEventListener('click', () => copiar(lista.map(([k, val]) => val === null ? `\n${k}` : `${k}: ${limpo(val)}`).join('\n').trim(), 'Respostas copiadas'));
}
