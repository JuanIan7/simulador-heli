// Diário de Voo (instrução de helicóptero). Cada pessoa entra com o próprio Google e só ela vê os seus voos.
// Banco (Firestore): diario/{uid} = perfil (nome, CANAC, escola, instrutor, aeronave padrão, meta)
//                    diario/{uid}/voos/{id} = um voo. Regras em firestore.rules (só o dono lê e grava).
// O login é o mesmo do Simulador Heli: quem já entrou no jogo já entra aqui.
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../firebase-config.js';
import { LOCAIS, dividirVoo, crepusculoCivil, paraMin, paraHHMM } from './crepusculo.js';

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
const EXERCICIOS = ['Pré-voo', 'Partida e cheques', 'Táxi pairado', 'Pairado', 'Giro 360° no pairado', 'Deslocamento lateral e à ré', 'Decolagem normal', 'Tráfego padrão', 'Aproximação normal', 'Pouso', 'Decolagem de máxima performance', 'Aproximação íngreme', 'Pouso corrido', 'Autorrotação', 'Autorrotação pairada', 'Pane de governador', 'Área restrita', 'Pouso em rampa', 'Navegação', 'Voo noturno', 'Emergências simuladas'];
const CIV = { nao: ['nao', 'Falta na CIV'], lancado: ['lan', 'Lançado na CIV'], conferido: ['ok', 'Conferido'] };

let user = null, perfil = null, voos = [], pararVoos = null, editando = null, filtro = 'todos';

function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

getRedirectResult(auth).catch(() => {});
onAuthStateChanged(auth, async (u) => {
  user = u; pararVoos?.(); pararVoos = null; voos = []; perfil = null;
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
});

function topo() {
  const t = $('#contaTopo');
  t.innerHTML = user ? `<span>${esc(perfil?.nome || user.displayName || user.email)}</span><button class="mini" id="btSair">Sair</button>` : '';
  $('#btSair')?.addEventListener('click', () => signOut(auth));
}

function telaLogin(erro) {
  el.innerHTML = `<section class="cartao login"><h2>Entre com a sua conta Google</h2>
    <p class="sub">Cada piloto tem o próprio diário: só você vê os seus voos. É o mesmo login do Simulador Heli.</p>
    <button class="pri" id="btEntrar">Entrar com Google</button>${erro ? `<p class="erro">${esc(erro)}</p>` : ''}
    <p class="sub">No iPhone, se a janela do Google não abrir, use o Safari (fora do atalho da tela de início).</p></section>
    <section class="cartao"><h3>Para que serve</h3><p>Anote cada voo na hora, com o horário, o tempo diurno e noturno, os pousos e o que foi treinado. Depois confira com a CIV Digital da ANAC se o voo foi lançado igual. Quando tudo bater, marque como "Conferido".</p></section>`;
  $('#btEntrar').onclick = async () => {
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, p); }
    catch (e) { if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return signInWithRedirect(auth, p); if (e.code !== 'auth/popup-closed-by-user') telaLogin('Não deu para entrar: ' + (e.code || e.message)); }
  };
}

function telaPerfil(primeira) {
  const p = perfil || { nome: user.displayName || '', escola: 'EACAR – Escola de Aviação Civil Asas Rotativas', curso: 'PPH – curso prático', modelo: 'R22 Beta II', origem: 'SISY', local: 'piraquara', meta: 40 };
  el.innerHTML = `<section class="cartao"><div class="cab"><h2>${primeira ? 'Seus dados de piloto' : 'Editar meus dados'}</h2></div>
    <p class="sub">${primeira ? 'Preencha uma vez. Os dados da aeronave e do instrutor viram o padrão de cada voo novo.' : ''}</p>
    <form id="fPerfil" class="form">
      <label class="largo">Nome completo<input id="pNome" required value="${esc(p.nome)}"></label>
      <label>CANAC<input id="pCanac" inputmode="numeric" value="${esc(p.canac)}" placeholder="6 dígitos"></label>
      <label>Escola<input id="pEscola" value="${esc(p.escola)}"></label>
      <label>Curso<input id="pCurso" value="${esc(p.curso)}"></label>
      <label>Instrutor (padrão)<input id="pInstrutor" value="${esc(p.instrutor)}"></label>
      <label>CANAC do instrutor<input id="pCanacInstr" inputmode="numeric" value="${esc(p.canacInstrutor)}"></label>
      <label>Aeronave (modelo)<input id="pModelo" value="${esc(p.modelo)}"></label>
      <label>Matrícula padrão<input id="pMatricula" value="${esc(p.matricula)}" placeholder="PR-XXX"></label>
      <label>Aeródromo de origem padrão<input id="pOrigem" value="${esc(p.origem)}" placeholder="SISY"></label>
      <label>Local do cálculo diurno/noturno<select id="pLocal">${Object.entries(LOCAIS).map(([k, v]) => `<option value="${k}" ${k === p.local ? 'selected' : ''}>${v.nome}</option>`).join('')}</select></label>
      <label>Meta de horas do curso<input id="pMeta" type="number" min="0" step="0.5" value="${esc(p.meta)}"></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Salvar</button>${primeira ? '' : '<button type="button" id="pVoltar">Voltar</button>'}</div>
    </form><p class="erro" id="pErro"></p></section>`;
  $('#pVoltar')?.addEventListener('click', telaPrincipal);
  $('#fPerfil').onsubmit = async (e) => {
    e.preventDefault();
    const d = { nome: $('#pNome').value.trim(), canac: $('#pCanac').value.trim(), escola: $('#pEscola').value.trim(), curso: $('#pCurso').value.trim(), instrutor: $('#pInstrutor').value.trim(), canacInstrutor: $('#pCanacInstr').value.trim(), modelo: $('#pModelo').value.trim(), matricula: $('#pMatricula').value.trim().toUpperCase(), origem: $('#pOrigem').value.trim().toUpperCase(), local: $('#pLocal').value, meta: Number($('#pMeta').value) || 0, email: user.email, atualizadoEm: serverTimestamp() };
    if (d.nome.length < 3) { $('#pErro').textContent = 'Escreva o nome completo.'; return; }
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
      ${pend ? `<div class="dica"><b>${pend} voo(s) ainda não conferido(s) com a CIV Digital.</b> Abra a CIV (ANAC › SACI ou app ANAC) e compare data, aeronave, tempos e pousos.</div>` : voos.length ? '<div class="dica">Todos os voos conferidos com a CIV.</div>' : ''}
    </section>
    <section class="cartao"><div class="cab"><h2>Voos</h2><div class="chips"><button class="chip" aria-pressed="${filtro === 'todos'}" data-f="todos">Todos</button><button class="chip" aria-pressed="${filtro === 'pendentes'}" data-f="pendentes">Falta conferir</button></div></div>
      ${lista.length ? `<div class="tabela"><table><thead><tr><th>Data</th><th>Aeronave</th><th>Trecho</th><th>Horário</th><th class="n">Diurno</th><th class="n">Noturno</th><th class="n">Pousos</th><th>Função</th><th>CIV</th><th></th></tr></thead><tbody>
        ${lista.map((v) => { const c = CIV[v.civ || 'nao']; return `<tr><td>${dBR(v.data)}</td><td>${esc(v.modelo)}<br><span class="sub">${esc(v.matricula)}</span></td><td>${esc(v.origem)}${v.destino && v.destino !== v.origem ? '→' + esc(v.destino) : ''}</td><td>${esc(v.inicio || '')}–${esc(v.fim || '')}</td><td class="n">${hm(v.diurno)}</td><td class="n">${hm(v.noturno)}</td><td class="n">${(v.pousosD || 0) + (v.pousosN || 0)}</td><td>${esc((FUNCOES[v.funcao] || '').split(' (')[0])}</td><td><span class="selo ${c[0]}">${c[1]}</span></td><td><button class="mini" data-ed="${v.id}">Abrir</button></td></tr>`; }).join('')}
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
  v = v || { data: hoje(), modelo: p.modelo, matricula: p.matricula, origem: p.origem, destino: p.origem, funcao: 'instrucao', instrutor: p.instrutor, canacInstrutor: p.canacInstrutor, pousosD: 1, pousosN: 0, capota: 0, navegacao: 0, exercicios: [], civ: 'nao' };
  const ex = new Set(v.exercicios || []);
  let tocado = { diurno: v.id != null, noturno: v.id != null };
  el.innerHTML = `<section class="cartao"><div class="cab"><h2>${v.id ? 'Voo de ' + dBR(v.data) : 'Novo voo'}</h2><button type="button" id="vVoltar">Voltar</button></div>
    <form id="fVoo" class="form">
      <label>Data<input id="vData" type="date" required value="${esc(v.data)}"></label>
      <label>Aeronave (modelo)<input id="vModelo" value="${esc(v.modelo)}"></label>
      <label>Matrícula<input id="vMatricula" value="${esc(v.matricula)}" placeholder="PR-XXX"></label>
      <label>Origem (ICAO)<input id="vOrigem" value="${esc(v.origem)}"></label>
      <label>Destino (ICAO)<input id="vDestino" value="${esc(v.destino)}"></label>
      <label>Início (hora local)<input id="vInicio" type="time" value="${esc(v.inicio)}"></label>
      <label>Fim (hora local)<input id="vFim" type="time" value="${esc(v.fim)}"></label>
      <div class="largo dica" id="vCalc">Informe início e fim: o diário sugere o tempo diurno e o noturno.</div>
      <label>Tempo diurno (h:min)<input id="vDiurno" value="${hm(v.diurno)}" inputmode="numeric" placeholder="00:00"></label>
      <label>Tempo noturno (h:min)<input id="vNoturno" value="${hm(v.noturno)}" inputmode="numeric" placeholder="00:00"></label>
      <label>Função a bordo<select id="vFuncao">${Object.entries(FUNCOES).map(([k, t]) => `<option value="${k}" ${k === v.funcao ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Pousos diurnos<input id="vPousosD" type="number" min="0" value="${v.pousosD || 0}"></label>
      <label>Pousos noturnos<input id="vPousosN" type="number" min="0" value="${v.pousosN || 0}"></label>
      <label>Navegação (h:min)<input id="vNav" value="${hm(v.navegacao)}" inputmode="numeric"></label>
      <label>Capota / IFR (h:min)<input id="vCapota" value="${hm(v.capota)}" inputmode="numeric"></label>
      <label>Instrutor<input id="vInstrutor" value="${esc(v.instrutor)}"></label>
      <label>CANAC do instrutor<input id="vCanacInstr" inputmode="numeric" value="${esc(v.canacInstrutor)}"></label>
      <div class="largo"><h3 style="margin-bottom:6px">O que foi treinado</h3><div class="chips" id="vEx">${EXERCICIOS.map((x) => `<button type="button" class="chip" aria-pressed="${ex.has(x)}" data-x="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
      <label class="largo">Observações (o que aprendi, o que errei, o que o instrutor pediu)<textarea id="vObs">${esc(v.obs)}</textarea></label>
      <label>Situação na CIV Digital<select id="vCiv">${Object.entries(CIV).map(([k, c]) => `<option value="${k}" ${k === (v.civ || 'nao') ? 'selected' : ''}>${c[1]}</option>`).join('')}</select></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Salvar voo</button>${v.id ? '<button type="button" class="perigo" id="vApagar">Apagar</button>' : ''}</div>
    </form><p class="erro" id="vErro"></p></section>`;
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
  $('#vApagar')?.addEventListener('click', async () => { if (!confirm('Apagar este voo do seu diário?')) return; await deleteDoc(doc(db, 'diario', user.uid, 'voos', v.id)); toast('Voo apagado'); telaPrincipal(); });
  $('#fVoo').onsubmit = async (e) => {
    e.preventDefault();
    const minDe = (s) => { const m = paraMin($(s).value.trim()); return m == null ? (/^\d+$/.test($(s).value.trim()) ? +$(s).value.trim() : 0) : m; };
    const d = {
      data: $('#vData').value, modelo: $('#vModelo').value.trim(), matricula: $('#vMatricula').value.trim().toUpperCase(), origem: $('#vOrigem').value.trim().toUpperCase(), destino: $('#vDestino').value.trim().toUpperCase(),
      inicio: $('#vInicio').value, fim: $('#vFim').value, diurno: minDe('#vDiurno'), noturno: minDe('#vNoturno'), funcao: $('#vFuncao').value,
      pousosD: +$('#vPousosD').value || 0, pousosN: +$('#vPousosN').value || 0, navegacao: minDe('#vNav'), capota: minDe('#vCapota'),
      instrutor: $('#vInstrutor').value.trim(), canacInstrutor: $('#vCanacInstr').value.trim(),
      exercicios: [...el.querySelectorAll('#vEx [aria-pressed="true"]')].map((b) => b.dataset.x), obs: $('#vObs').value.trim(), civ: $('#vCiv').value, atualizadoEm: serverTimestamp(),
    };
    if (!d.data) { $('#vErro').textContent = 'Informe a data.'; return; }
    if (d.diurno + d.noturno <= 0) { $('#vErro').textContent = 'Informe o tempo de voo (início e fim, ou diurno/noturno).'; return; }
    const id = v.id || (d.data + '-' + (d.inicio || '').replace(':', '') + '-' + Math.random().toString(36).slice(2, 6));
    try { await setDoc(doc(db, 'diario', user.uid, 'voos', id), v.id ? d : { ...d, criadoEm: serverTimestamp() }, { merge: true }); toast('Voo salvo'); telaPrincipal(); }
    catch (e2) { $('#vErro').textContent = 'Não salvou: ' + (e2.code || e2.message); }
  };
}

function linhasCsv() {
  const cab = ['Data', 'Modelo', 'Matrícula', 'Origem', 'Destino', 'Início', 'Fim', 'Diurno', 'Noturno', 'Total', 'Função', 'Pousos diurnos', 'Pousos noturnos', 'Navegação', 'Capota', 'Instrutor', 'CANAC instrutor', 'Treinado', 'Observações', 'CIV'];
  const q = (x) => '"' + String(x ?? '').replace(/"/g, '""') + '"';
  return [cab.map(q).join(';'), ...[...voos].reverse().map((v) => [dBR(v.data), v.modelo, v.matricula, v.origem, v.destino, v.inicio, v.fim, hm(v.diurno), hm(v.noturno), hm((v.diurno || 0) + (v.noturno || 0)), FUNCOES[v.funcao], v.pousosD, v.pousosN, hm(v.navegacao), hm(v.capota), v.instrutor, v.canacInstrutor, (v.exercicios || []).join(', '), v.obs, CIV[v.civ || 'nao'][1]].map(q).join(';'))].join('\r\n');
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
