// Hangar da Turma (curso de PPH na EACAR): um link só para a turma. Cada um entra com o próprio Google;
// quem tem o código do grupo (o mesmo dos Gastos) vê estudo, revisão, treino, materiais, gastos e o próprio diário de voo.
// Banco: gastosConvites/{codigo} (grupo e pessoas) e gastosMembros/{uid} (nome, e-mail, chave `pix` e o progresso do estudo em `estudo`).
// O Início mostra o que cada um deve e a quem (com a chave Pix para copiar), lido de gastos/{id} (contas em src/gastos/contas.js).
// Os PDFs ficam numa pasta do Google Drive do Juan compartilhada com a turma; aqui só vão os links.
// Revisão, treino e acessos vêm do Hangar CCOA (repo hangar-ccoa) por scripts/hangar-turma/gerar.py, sem os dados pessoais.
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { entrarGoogle, navegadorRuim, avisoNavegador, ligarAviso } from '../entrar-google.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, onSnapshot, serverTimestamp, arrayUnion, deleteField } from 'firebase/firestore';
import { FIREBASE_CONFIG, ADMINS } from '../firebase-config.js';
import { FONIA, ALFABETO, NUMEROS, PALAVRAS_PADRAO, TRANSPONDER } from '../data/fonia.js';
import { METAR } from '../data/quiz-teoria.js';
import { DRIVE_PASTA, DRIVE } from './materiais.js';
import { nomesOcupados, opcoesNomes, entrarComNome, erroNome } from '../gastos/nomes.js';
import { calcular, caixaPix, alertaAcertos, ligarPix, digitandoPix } from '../gastos/contas.js';
import { telaCompras, ligarCompras, digitandoCompras } from './compras.js';
import { telaAnotacoes, ligarAnotacoes, digitandoAnotacoes } from './anotacoes.js';
import { telaTempo, ligarTempo, resumoInicio } from './tempo.js';
import { limpar, limparNome, linkSeguro, ligarMascaras } from '../entrada.js';

const app = initializeApp(FIREBASE_CONFIG), auth = getAuth(app), db = getFirestore(app);
auth.languageCode = 'pt';
const DADOS = { FONIA, ALFABETO, NUMEROS, PALAVRAS_PADRAO, TRANSPONDER, METAR };
const ARQ = Object.fromEntries(Object.entries(DRIVE).map(([k, id]) => [k, `https://drive.google.com/file/d/${id}/view`]));
const CHAVE_CODIGO = 'gastos-codigo';
const SIMULADOR = './';
const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),2400); }
const pdf = (k, rot) => ARQ[k] ? `<a class="pdf" href="${esc(ARQ[k])}" target="_blank" rel="noopener">📄 ${esc(rot)}</a>` : `<span class="sub">📄 ${esc(rot)}</span>`;

const ABAS = [['inicio','Início'],['tempo','Tempo'],['checklists','Checklists'],['estudo','Estudo'],['revisao','Revisão R22'],['treino','Treino'],['materiais','Materiais'],['gastos','Gastos'],['compras','Compras'],['anotacoes','Anotações'],['diario','Diário de voo'],['acessos','Acessos e rotas']];
let aba = (location.hash || '').slice(1); if (!ABAS.some(a => a[0] === aba)) aba = 'inicio';
let user = null, membro = null, grupo = null, membros = [], mats = [], gastos = [], compras = [], errCompras = '', anotacoes = [], errAnotacoes = '', parar = [], trocandoPix = false;

// ---------- conteúdo ----------
const CRONO = [
  { dia: 'base', nome: '1. Antes dos primeiros voos', meta: '≈ 3 h · comandos e aerodinâmica', itens: [
    { id: 'c1', t: 'Os quatro comandos do R22', d: 'Cíclico em "T", coletivo com correlador, manete com governador e pedais. Leia a aba Revisão R22 e o POH seção 7 (pág. 7-4 a 7-9).', l: [['pdf','r22poh','POH R22'], ['yt','helicopter controls explained cyclic collective pedals','Vídeos: comandos']] },
    { id: 'c2', t: 'Aerodinâmica que aparece no 1º voo', d: 'Torque e rotor de cauda, efeito solo (IGE/OGE), sustentação translacional (ETL), deriva de translação e dissimetria de sustentação.', l: [['pdf','delanir','Delanir PPH'], ['yt','helicopter translational lift ground effect explained','Vídeos: ETL e efeito solo']] },
    { id: 'c3', t: 'Ver o pairado antes de fazer', d: 'Assista a aulas de pairado no R22 prestando atenção aos pequenos movimentos: o cíclico "pressiona", não "empurra".', l: [['yt','R22 hovering lesson first lesson','Vídeos: pairado no R22']] },
  ]},
  { dia: 'limites', nome: '2. Limites, emergências, tráfego e fonia', meta: '≈ 3 h', itens: [
    { id: 'c4', t: 'Limitações do R22 (POH seção 2)', d: 'RPM verde 101–104%, buzina abaixo de 97%, Vne 102 KIAS, solo só no assento direito, sem baixo G.', l: [['pdf','r22poh','POH R22'], ['pdf','r22br','Suplemento Brasileiro']] },
    { id: 'c5', t: 'Reflexos de emergência', d: 'Pane de motor e autorrotação, baixa RPM, gelo no carburador, rolamento dinâmico, anel de vórtice, baixo G. Leia as Safety Notices 10, 11, 22, 24, 25, 38 e 42.', l: [['pdf','sn11','SN-11 baixo G'], ['pdf','sn10','SN-10 baixa RPM'], ['pdf','sn38','SN-38 autorrotação'], ['yt','Robinson R22 low G mast bumping safety','Vídeos: baixo G']] },
    { id: 'c6', t: 'Circuito de helicópteros e fonia básica', d: 'ICA 100-4 (regras para helicópteros) e MCA 100-16 (fraseologia). Depois, faça 3 cenários na aba Treino › Fonia.', l: [['pdf','ica1004','ICA 100-4'], ['pdf','mca10016','MCA 100-16']] },
    { id: 'c7', t: 'METAR de Curitiba', d: 'Decodifique os METAR de SBCT e SBBI do dia (aba Treino) e decida GO ou NO-GO para VFR.', l: [['pdf','codmet','Códigos meteorológicos']] },
  ]},
  { dia: 'prevoo', nome: '3. Pré-voo', meta: '≈ 1 h 30', itens: [
    { id: 'c9', t: 'Pré-voo do R22 (POH 4-1 a 4-6)', d: 'A volta na aeronave em 13 estações, antes da partida e o cheque de motor.', l: [['pdf','r22poh','POH R22'], ['yt','Robinson R22 preflight inspection','Vídeos: pré-voo']] },
  ]},
  { dia: 'curso', nome: 'Durante o curso', meta: 'depois de cada voo, 20 min', itens: [
    { id: 'c11', t: 'Lançar cada voo no Diário de voo no mesmo dia', d: 'Horário de início e fim, pousos e o que foi treinado (aba Diário de voo).', l: [] },
    { id: 'c12', t: 'Anotar o que o instrutor corrigiu', d: 'Rever antes do próximo voo e trocar ideia com a turma.', l: [] },
    { id: 'c13', t: 'Perguntar à EACAR', d: 'Prefixo e S/N do R22 de instrução, áreas de treino, se o programa cobre os 5 temas da SFAR 73 e quanto duplo comando antes do solo.', l: [] },
  ]},
/*@ESQUILO@*/
];
/*@SN@*/
/*@CKDADOS@*/
const IDS = CRONO.flatMap(d => d.itens.map(i => i.id));
const feitos = (m) => IDS.filter(id => m?.estudo?.[id]).length;

// ---------- entrada ----------
const daUrl = new URLSearchParams(location.search).get('c');
if (daUrl) { try { localStorage.setItem(CHAVE_CODIGO, daUrl); } catch {} history.replaceState(null, '', location.pathname + location.hash); }
const codigoGuardado = () => { try { return localStorage.getItem(CHAVE_CODIGO); } catch { return null; } };

onAuthStateChanged(auth, async (u) => {
  user = u; parar.forEach((f) => f()); parar = []; membro = null; grupo = null; membros = []; gastos = [];
  conta();
  if (!u) return telaLogin();
  try { const s = await getDoc(doc(db, 'gastosMembros', u.uid)); membro = s.exists() ? s.data() : null; }
  catch (e) { return aviso('Não foi possível abrir o Hangar (' + (e.code || e.message) + '). Recarregue a página.'); }
  if (!membro) return telaEntrar(daUrl || codigoGuardado());
  abrir();
});

function aviso(t) { $('#abas').innerHTML = ''; $('#conteudo').innerHTML = `<div class="caixa"><p>${esc(t)}</p></div>`; }
function conta() { $('#conta').innerHTML = user ? `<span>${esc(membro?.nome || user.displayName || '')}</span> <button class="mini" id="btSair">Sair</button>` : ''; $('#btSair')?.addEventListener('click', () => signOut(auth)); }

function telaLogin(erro) {
  $('#abas').innerHTML = '';
  $('#conteudo').innerHTML = `<div class="caixa destaque" style="align-items:center;text-align:center"><h2>Hangar da Turma</h2>
    <p class="intro">Estudo, revisão do R22, treino de METAR e fonia, materiais, gastos da turma e o seu diário de voo, num lugar só. Entre com a sua conta Google.</p>
    <button class="pri" id="btEntrar">Entrar com Google</button>${erro && erro !== 'navegador' ? `<p class="sub" style="color:var(--perigo)">${esc(erro)}</p>` : ''}${avisoNavegador(erro === 'navegador' || navegadorRuim(), location.origin + location.pathname + (codigoGuardado() ? '?c=' + codigoGuardado() : ''))}</div>`;
  ligarAviso();
  $('#btEntrar').onclick = async () => { const r = await entrarGoogle(auth); if (r) telaLogin(r); };
}

async function telaEntrar(codigo, erro) {
  $('#abas').innerHTML = '';
  let convite = null;
  if (codigo) { try { const s = await getDoc(doc(db, 'gastosConvites', codigo)); convite = s.exists() ? s.data() : null; } catch {} }
  if (!convite) {
    $('#conteudo').innerHTML = `<div class="caixa"><h2>Entrar na turma</h2>
      <p class="sub">${codigo ? 'Este código não é de nenhuma turma. Confira o link.' : 'Abra o link que o Juan mandou no grupo, ou cole aqui o código.'}</p>
      <form id="fCod" class="form"><label class="largo">Código ou link da turma<input id="cCod" required data-m="codigo" maxlength="300"></label><div class="largo linha-acao"><button class="pri" type="submit">Continuar</button></div></form></div>`;
    ligarMascaras($('#conteudo'));
    $('#fCod').onsubmit = (e) => { e.preventDefault(); const c = $('#cCod').value.trim().replace(/.*[?&]c=/, '').replace(/[&#].*$/, '').replace(/[^\w-]/g, '').slice(0, 64); if (!c) return; try { localStorage.setItem(CHAVE_CODIGO, c); } catch {} telaEntrar(c); };
    return;
  }
  const ocup = await nomesOcupados(db, codigo, convite.pessoas, user.uid);
  $('#conteudo').innerHTML = `<div class="caixa"><h2>${esc(convite.grupo)}</h2><p class="sub">Quem é você na turma?</p>
    <form id="fEntrar" class="form"><label class="largo">Seu nome<select id="eNome">${opcoesNomes(convite.pessoas, ocup)}</select></label>
      <label class="largo" id="eOutroL" hidden>Nome (como a turma te chama)<input id="eOutro" data-m="nome" maxlength="24"></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Entrar</button></div></form><p class="sub" style="color:var(--perigo)">${esc(erro || '')}</p></div>`;
  const sel = $('#eNome');
  const outro = () => { $('#eOutroL').hidden = sel.value !== ''; }; sel.onchange = outro; outro(); ligarMascaras($('#conteudo'));
  $('#fEntrar').onsubmit = async (e) => {
    e.preventDefault();
    if (sel.value === '?' || !sel.value && !$('#eOutro').value.trim()) return telaEntrar(codigo, 'Escolha o seu nome na lista.');
    const nome = limparNome(sel.value || $('#eOutro').value, 24);
    if (nome.length < 2) return telaEntrar(codigo, 'Escreva o seu nome.');
    try {
      await entrarComNome(db, user, codigo, nome, convite.pessoas);
      membro = { nome, email: user.email, codigo }; abrir();
    } catch (e2) { telaEntrar(codigo, erroNome(e2)); }
  };
}

function abrir() {
  conta(); render();
  parar.push(onSnapshot(doc(db, 'gastosConvites', membro.codigo), (s) => { grupo = s.data() || null; if (aba === 'inicio' && !digitandoPix()) render(); }, () => {}));
  parar.push(onSnapshot(collection(db, 'gastosMembros'), (s) => {
    membros = s.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const eu = membros.find((m) => m.uid === user.uid); if (eu) membro = eu;
    if ((aba === 'inicio' && !digitandoPix()) || aba === 'estudo') render();
  }, () => {}));
  parar.push(onSnapshot(collection(db, 'gastos'), (s) => {
    gastos = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (aba === 'inicio' && !digitandoPix()) render();
  }, () => {}));
  parar.push(onSnapshot(collection(db, 'compras'), (s) => {
    compras = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.em?.seconds || 9e9) - (a.em?.seconds || 9e9)); errCompras = '';
    if (aba === 'compras' && !digitandoCompras()) render();
  }, (e) => { errCompras = e.code === 'permission-denied' ? 'A lista de compras ainda está sendo ativada no banco. Tente daqui a pouco.' : 'Não deu para ler a lista (' + (e.code || e.message) + ').'; if (aba === 'compras') render(); }));
  parar.push(onSnapshot(collection(db, 'anotacoes'), (s) => {
    anotacoes = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.em?.seconds || 9e9) - (a.em?.seconds || 9e9)); errAnotacoes = '';
    if (aba === 'anotacoes' && !digitandoAnotacoes()) render();
  }, (e) => { errAnotacoes = e.code === 'permission-denied' ? 'As anotações ainda estão sendo ativadas no banco. Tente daqui a pouco.' : 'Não deu para ler as anotações (' + (e.code || e.message) + ').'; if (aba === 'anotacoes') render(); }));
  parar.push(onSnapshot(collection(db, 'materiais'), (s) => {
    mats = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
    if (aba === 'materiais') render();
  }, () => {}));
}

// ---------- telas ----------
function render() {
  $('#abas').innerHTML = ABAS.map(([k,t]) => `<button class="aba" role="tab" aria-selected="${k===aba}" data-aba="${k}">${t}</button>`).join('');
  const c = $('#conteudo'), y = window.scrollY;
  c.innerHTML = `<section data-painel="${aba}">${(TELAS[aba]||TELAS.inicio)()}</section>`;
  ligarMascaras(c); (LIGAR[aba]||(()=>{}))(c);
  contagem(); window.scrollTo(0, y);
}
function contagem() {
  const dia = Math.floor((Date.parse(hoje()) - Date.parse('2026-11-03')) / 864e5) + 1;
  $('#contagem').innerHTML = dia < 1 ? `<b>${1 - dia}</b><span>dia(s) para o curso</span>` : dia <= 59 ? `<b>${dia}º</b><span>dia de curso</span>` : '';
}
function irPara(k) { aba = k; try { history.replaceState(null, '', '#' + k); } catch {} render(); window.scrollTo(0, 0); }
// allow="microphone": a página de gastos deixa falar o gasto (reconhecimento de voz do navegador)
const quadro = (pag, titulo) => `<iframe class="quadro" src="${pag}?embed=1" title="${titulo}" loading="lazy" allow="microphone"></iframe>`;

const TELAS = {
inicio(){
  const f = feitos(membro), link = `${location.origin}${location.pathname}?c=${membro.codigo}`;
  const turma = membros.slice().sort((a,b) => (a.nome||'').localeCompare(b.nome||''));
  const faltam = (grupo?.pessoas || []).filter((p) => !membros.some((m) => m.nome === p));
  const pix = caixaPix(membro, trocandoPix);
  return `${pix ? `<div class="caixa destaque">${pix}</div>` : ''}
  <div class="caixa"><div class="cab"><div class="rotulo">Seus acertos da turma</div><button class="mini" data-ir="gastos">Ver os gastos</button></div>
    ${alertaAcertos(calcular(gastos), membro.nome, membros)}
    ${membro.pix && !trocandoPix ? `<p class="sub">Sua chave Pix: <b>${esc(membro.pix)}</b> <button class="mini" data-pix-trocar>Trocar</button></p>` : ''}</div>
  <div class="caixa"><div class="cab"><div class="rotulo">Tempo agora</div><button class="mini" data-ir="tempo">METAR, TAF e previsão</button></div><div id="tpInicio" class="sub">buscando o METAR…</div></div>
  ${ckCartao()}<div class="grade">
    <div class="caixa destaque"><div class="rotulo">Olá, ${esc(membro.nome)}</div><h3>Seu estudo: ${f} de ${IDS.length} itens</h3><div class="barra"><i style="width:${f/IDS.length*100}%"></i></div>
      <p class="sub">Comandos, aerodinâmica, limites e emergências do R22, tráfego e fonia; depois, o Esquilo. Marque cada item ao terminar.</p>
      <div class="linha-acao"><button class="pri" data-ir="estudo">Abrir o cronograma</button><button data-ir="revisao">Revisão R22</button></div></div>
    <div class="caixa"><div class="rotulo">Atalhos</div><div class="linha-acao">
      <button class="pri" data-ir="diario">📒 Lançar voo</button><button data-ir="tempo">🌤️ Tempo</button><button data-ir="gastos">💸 Lançar gasto</button><button data-ir="compras">🛒 Lista de compras${compras.filter((x) => !x.feito).length ? ` (${compras.filter((x) => !x.feito).length})` : ''}</button><button data-ir="anotacoes">📝 Anotações${anotacoes.filter((x) => !x.feito).length ? ` (${anotacoes.filter((x) => !x.feito).length})` : ''}</button><button data-ir="treino">🎧 Fonia e METAR</button><button data-ir="materiais">📄 Materiais</button><a class="btn" href="${SIMULADOR}" target="_blank" rel="noopener">🚁 Simulador</a></div></div>
  </div>
  <div class="grade">
    <div class="caixa"><div class="rotulo">A turma</div>
      ${turma.map((m) => `<div class="membro"><span class="titulo">${esc(m.nome)}</span><span class="sub">${feitos(m)}/${IDS.length} do estudo</span></div>`).join('')}
      ${faltam.length ? `<p class="sub">Ainda não entraram: ${faltam.map(esc).join(', ')}.</p>` : ''}
      <div class="linha-acao"><button id="btLink">${navigator.share ? 'Compartilhar o link da turma' : 'Copiar o link da turma'}</button></div>
      <p class="sub">É um link só para tudo. Cada um entra com o próprio Google.</p><input type="hidden" id="lkTurma" value="${esc(link)}"></div>
    <div class="caixa"><div class="rotulo">O curso</div>
      <div class="titulo">Escola</div><div class="sub">EACAR – Escola de Aviação Civil Asas Rotativas · Aeródromo de Piraquara (SISY), R. Gerhard Von Scheidt, 29 · (41) 3669-3001</div>
      <div class="titulo">Aeronave</div><div class="sub">Robinson R22 Beta II (Lycoming O-360-J2A). O PPH no R22 sai com a classe HMNC.</div>
      <div class="titulo">Período</div><div class="sub">Formação prática de 03/11 a 31/12/2026.</div></div>
  </div>`;
},
tempo(){ return telaTempo(); },
compras(){ return telaCompras(compras, errCompras); },
anotacoes(){ return telaAnotacoes(anotacoes, errAnotacoes); },
estudo(){
  const f = feitos(membro);
  return `<div class="cab"><h2>Cronograma de estudo</h2><span class="selo la">${f}/${IDS.length} feitos</span></div>
  <p class="intro">Cada um marca o próprio progresso (a turma vê quantos itens cada um fez, na aba Início). Os PDFs abrem no Google Drive; os vídeos abrem a busca no YouTube.</p>
  <div class="grade">${CRONO.map(d => `<div class="caixa"><div class="dia-cab"><b>${esc(d.nome)}</b><span class="sub">${esc(d.meta)}</span></div>
    <ul class="lista-check">${d.itens.map(i => { const ok = !!membro?.estudo?.[i.id]; return `<li class="${ok?'feito':''}"><button class="check" aria-pressed="${ok}" aria-label="Marcar ${esc(i.t)}" data-prog="${i.id}">✓</button><div class="txt"><div class="titulo">${esc(i.t)}</div><div class="sub">${esc(i.d)}</div><div class="links">${i.l.map(([tp,a,b]) => tp==='pdf' ? pdf(a,b) : `<a href="${yt(a)}" target="_blank" rel="noopener">▶ ${esc(b)}</a>`).join('')}</div></div></li>`; }).join('')}</ul></div>`).join('')}</div>`;
},
/*@CHECKLISTS@*/
/*@REVISAO@*/
/*@TREINO@*/
materiais(){
  const ess = [['r22poh','POH R22 (Robinson, fev/2024)'],['r22br','R22: Suplemento Brasileiro do POH'],['delanir','Delanir: apostila PPH/PCH (aluno)'],['resumao','Resumão Piloto Privado'],['ica1004','ICA 100-4: regras para helicópteros (DECEA)'],['ica10012','ICA 100-12: regras do ar (DECEA)'],['mca10016','MCA 100-16: fraseologia (DECEA, 2025)'],['codmet','Códigos meteorológicos (METAR, TAF)'],['planovoo','Plano de voo'],['rbac67','RBAC 67: certificado médico (CMA)'],['faa6','FAA Helicopter Flying Handbook, cap. 6: peso e balanceamento'],['faa7','FAA Helicopter Flying Handbook, cap. 7: desempenho'],['is141','IS 141-007: programas de instrução (ANAC)']];
  const eacar = [['eacarpre','Checklist pré-voo externo R22'],['eacaracio','Checklist de acionamento e corte R22'],['eacaremerg','Procedimentos de emergência R22'],['eacarman','Manual de Manobras R22 (Otavio Rosa e Rudi Barlem)'],['eacarpoh','POH R22: tradução para alunos (EACAR, 2026)'],['eacarfonia','Roteiro de fonia do circuito SISY']];
  const extras = (s) => mats.filter((m) => m.secao === s).map((m) => `<span class="mat-turma"><a href="${esc(linkSeguro(m.link) || '#')}" target="_blank" rel="noopener noreferrer">📎 ${esc(m.titulo)}</a>${m.autor === user.uid ? `<button class="mini fantasma" data-matdel="${esc(m.id)}" aria-label="Tirar ${esc(m.titulo)}">×</button>` : ''}<span class="sub">${esc(m.nome || '')}</span></span>`).join('');
  return `<h2>Materiais</h2><p class="intro">Os PDFs ficam numa pasta do Google Drive compartilhada com a turma. Se o Drive pedir acesso, toque em "Solicitar acesso" com a mesma conta Google que você usa aqui. O que alguém da turma acrescentar aparece direto na seção escolhida.</p>
  <div class="caixa destaque"><h3>Material da EACAR</h3><div class="links">${eacar.map(([k,t])=>pdf(k,t)).join('')}${extras('eacar')}</div>
    <p class="sub">Os três cartões também estão na aba <a href="#checklists" data-ir="checklists">Checklists</a>, para marcar item a item.</p></div>
  <div class="caixa"><h3>Essenciais do PPH</h3><div class="links">${ess.map(([k,t])=>pdf(k,t)).join('')}${extras('essenciais')}</div></div>
  <div class="caixa"><h3>Safety Notices do R22</h3><div class="links">${SN.map(([k,c,t]) => pdf(k, c + ' · ' + t)).join('')}${extras('sn')}</div></div>
  <div class="caixa"><h3>Esquilo (2º momento)</h3><div class="links">${pdf('dominio','Livro Domínio da Máquina: emergências do Esquilo AS350/H125 (Cmte Deccache, 2024)')}${extras('esquilo')}</div>
    <p class="sub">Livro comprado pela turma: uso só entre nós.</p></div>
  ${mats.some((m) => m.secao === 'outros') ? `<div class="caixa"><h3>Outros</h3><div class="links">${extras('outros')}</div></div>` : ''}
  <div class="caixa"><h3>Acrescentar material</h3><p class="sub">Coloque o arquivo no seu Google Drive (ou em outro site), copie o link de compartilhamento e cole aqui. Ele aparece na hora para a turma. No Drive, deixe o arquivo como "Qualquer pessoa com o link".</p>
    <form id="fMat" class="form"><label class="largo">Título<input id="mTit" required data-m="texto" maxlength="120" placeholder="Ex.: Resumo de autorrotação do Meira"></label>
      <label>Seção<select id="mSec"><option value="eacar">Material da EACAR</option><option value="essenciais">Essenciais do PPH</option><option value="sn">Safety Notices</option><option value="esquilo">Esquilo</option><option value="outros">Outros</option></select></label>
      <label>Link<input id="mLink" required type="url" maxlength="1000" autocomplete="off" spellcheck="false" placeholder="https://drive.google.com/..."></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Acrescentar</button><span class="sub" id="mMsg"></span></div></form></div>
  <div class="caixa"><h3>Pasta completa</h3><div class="links">${DRIVE_PASTA ? `<a class="pdf" href="https://drive.google.com/drive/folders/${DRIVE_PASTA}" target="_blank" rel="noopener">📁 Abrir a pasta no Google Drive</a>` : ''}<a href="${SIMULADOR}" target="_blank" rel="noopener">Simulador Heli (21 fases)</a></div></div>`;
},
gastos(){ return quadro('gastos.html', 'Gastos da turma'); },
diario(){ return `<p class="sub">Só você vê os seus voos.</p>` + quadro('diario.html', 'Diário de voo'); },
/*@ACESSOS@*/
};

/*@METAR@*/

// ---------- ligações ----------
const LIGAR = {
  inicio(c){
    c.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); irPara(b.dataset.ir); })); ckAbrir(c);
    ligarPix(c, { db, uid: user.uid, quem: membro.nome, gastos: () => gastos, toast, depois: (v, trocar) => { if (v) membro.pix = v; trocandoPix = !!trocar; render(); } });
    resumoInicio($('#tpInicio'));
    LIGAR.linkTurma();
  },
  compras(c){ ligarCompras(c, { db, user: () => user, membro: () => membro, compras: () => compras, toast, render: () => { if (aba === 'compras') render(); } }); },
  anotacoes(c){ ligarAnotacoes(c, { db, user: () => user, membro: () => membro, anotacoes: () => anotacoes, toast, render: () => { if (aba === 'anotacoes') render(); } }); },
  tempo(c){ ligarTempo(c, { decodificarMetar, toast, render: () => { if (aba === 'tempo') render(); } }); },
  // botão do link da turma (fica no Início; vale para qualquer tela que o tenha)
  linkTurma(){ const bt = $('#btLink'); if (!bt) return; bt.onclick = () => { const link = $('#lkTurma').value;
      if (navigator.share) navigator.share({ title: 'Hangar da Turma', text: 'Hangar da Turma do PPH: estudo, materiais, gastos e diário de voo. Entre com o seu Google:', url: link }).catch(() => {});
      else navigator.clipboard.writeText(link).then(() => toast('Link copiado'), () => toast(link)); };
  },
  estudo(c){ c.querySelectorAll('[data-prog]').forEach(b => b.onclick = () => {
    const id = b.dataset.prog, ok = !membro?.estudo?.[id];
    membro.estudo = { ...(membro.estudo || {}), [id]: ok ? hoje() : undefined }; render();
    updateDoc(doc(db, 'gastosMembros', user.uid), { ['estudo.' + id]: ok ? hoje() : deleteField() }).catch(() => toast('Não salvou. Tente de novo.'));
  }); },
/*@LIGAR_TREINO@*/
/*@LIGAR_CK@*/
  materiais(c){
    c.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); irPara(b.dataset.ir); }));
    c.querySelectorAll('[data-matdel]').forEach(b => b.onclick = () => { if (confirm('Tirar este material da lista?')) deleteDoc(doc(db, 'materiais', b.dataset.matdel)).catch(() => toast('Não deu para tirar.')); });
    $('#fMat').onsubmit = async (e) => {
      e.preventDefault(); const titulo = limpar($('#mTit').value, 120), link = linkSeguro($('#mLink').value);
      if (titulo.length < 2) { $('#mMsg').textContent = 'Escreva um título.'; return; }
      if (!link) { $('#mMsg').textContent = 'O link precisa começar com https://'; return; }
      try { await addDoc(collection(db, 'materiais'), { titulo, link, secao: $('#mSec').value, autor: user.uid, nome: membro.nome, em: serverTimestamp() }); toast('Material acrescentado'); }
      catch (e2) { $('#mMsg').textContent = 'Não salvou (' + (e2.code || e2.message) + ').'; }
    };
  },
};

document.getElementById('abas').addEventListener('click', (e) => { const b = e.target.closest('[data-aba]'); if (b && membro) irPara(b.dataset.aba); });
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (membro && ABAS.some(a=>a[0]===h) && h !== aba) { aba = h; render(); } });
// As páginas de gastos e diário, abertas aqui dentro, avisam a altura para o quadro crescer junto.
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.data?.tipo !== 'altura') return;
  document.querySelectorAll('iframe.quadro').forEach((f) => { if (f.contentWindow === e.source) f.style.height = Math.max(400, e.data.h + 20) + 'px'; });
});
