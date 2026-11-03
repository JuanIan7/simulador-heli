// Hangar da Turma (curso de PPH na EACAR): um link só para a turma. Cada um entra com o próprio Google;
// quem tem o código do grupo (o mesmo dos Gastos) vê estudo, revisão, treino, materiais, gastos e o próprio diário de voo.
// Banco: gastosConvites/{codigo} (grupo e pessoas) e gastosMembros/{uid} (nome, e-mail e o progresso do estudo em `estudo`).
// Os PDFs ficam numa pasta do Google Drive do Juan compartilhada com a turma; aqui só vão os links.
// Revisão, treino e acessos vêm do Hangar CCOA (repo hangar-ccoa) por scripts/hangar-turma/gerar.py, sem os dados pessoais.
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot, serverTimestamp, arrayUnion, deleteField } from 'firebase/firestore';
import { FIREBASE_CONFIG, ADMINS } from '../firebase-config.js';
import { FONIA, ALFABETO, NUMEROS, PALAVRAS_PADRAO, TRANSPONDER } from '../data/fonia.js';
import { METAR } from '../data/quiz-teoria.js';
import { DRIVE_PASTA, DRIVE } from './materiais.js';

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

const ABAS = [['inicio','Início'],['estudo','Estudo'],['revisao','Revisão R22'],['treino','Treino'],['materiais','Materiais'],['gastos','Gastos'],['diario','Diário de voo'],['acessos','Acessos e rotas']];
let aba = (location.hash || '').slice(1); if (!ABAS.some(a => a[0] === aba)) aba = 'inicio';
let user = null, membro = null, grupo = null, membros = [], parar = [];

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
  { dia: 'esquilo', nome: '2º momento: Esquilo (depois do PPH)', meta: 'sem pressa · livro Domínio da Máquina (Cmte Deccache, 2024)', itens: [
    { id: 'e1', t: 'Cap. 1 e 2: prática e procedimentos normais', d: 'Por que treinar emergência de verdade; táxi até 5 ft, decolagem com PMC sem entrar na curva do homem-morto e aproximação sem ficar "pendurado". Livro pág. 18 a 42.', l: [['pdf','dominio','Domínio da Máquina']] },
    { id: 'e2', t: 'Cap. 3.1: falha do sistema hidráulico', d: 'Voe a máquina primeiro, 40 a 60 kt, corte SEMPRE pelo interruptor do coletivo (nunca pelo HYDR TEST no B2/B3) e pouso sem pairar. Livro pág. 48 a 66.', l: [['pdf','dominio','Domínio da Máquina']] },
    { id: 'e3', t: 'Cap. 3.2: falhas do governador (B/B2)', d: 'Baixa e alta vazão de combustível: como manter a NR na faixa verde com manete e coletivo. Livro pág. 67 a 80.', l: [['pdf','dominio','Domínio da Máquina']] },
    { id: 'e4', t: 'Cap. 3.3: falhas do rotor de cauda', d: 'Acionamento x comando de passo, teste com HYDR TEST para diferenciar, pouso sem pedais e arremetida. Livro pág. 81 a 106.', l: [['pdf','dominio','Domínio da Máquina']] },
    { id: 'e5', t: 'Cap. 3.4: falha de motor e autorrotação', d: 'Entrada, descida controlada, flare e pouso; cruzeiro, pairados, táxi e decolagem por faixa de velocidade. Livro pág. 107 a 153.', l: [['pdf','dominio','Domínio da Máquina'], ['yt','HAI Autorotations Reality Exposed','Vídeo: Autorotations Reality Exposed']] },
    { id: 'e6', t: 'Cap. 3.5: transparência de servocomandos', d: 'Alta velocidade + peso + G: rolamento à direita e nariz para cima. Reação: baixar o coletivo e aliviar a arfagem. Livro pág. 155 a 163.', l: [['pdf','dominio','Domínio da Máquina']] },
    { id: 'e7', t: 'Cap. 4: estudos de caso PT-HMS e PT-HYW', d: 'Dois acidentes de Esquilo ligados ao sistema hidráulico, com as lições para treino e procedimento. Livro pág. 165 a 186.', l: [['pdf','dominio','Domínio da Máquina']] },
    { id: 'e8', t: 'Decorar as emergências críticas do Esquilo do CBMERJ', d: 'Conferir cada pane com o manual de voo do B2 e do B3/H125 da corporação (o livro avisa que as versões de manual variam).', l: [] },
  ]},
];
const SN = [['sn10','SN-10','Baixa RPM: estol do rotor'],['sn11','SN-11','Baixo G: extremamente perigoso'],['sn22','SN-22','Anel de vórtice'],['sn24','SN-24','Estol de rotor por baixa RPM'],['sn25','SN-25','Gelo no carburador'],['sn29','SN-29','Piloto de avião em helicóptero'],['sn32','SN-32','Vento forte e turbulência'],['sn38','SN-38','Autorrotação de treino'],['sn41','SN-41','Distrações do piloto'],['sn42','SN-42','Guinada inesperada']];
const IDS = CRONO.flatMap(d => d.itens.map(i => i.id));
const feitos = (m) => IDS.filter(id => m?.estudo?.[id]).length;

// ---------- entrada ----------
const daUrl = new URLSearchParams(location.search).get('c');
if (daUrl) { try { localStorage.setItem(CHAVE_CODIGO, daUrl); } catch {} history.replaceState(null, '', location.pathname + location.hash); }
const codigoGuardado = () => { try { return localStorage.getItem(CHAVE_CODIGO); } catch { return null; } };

getRedirectResult(auth).catch(() => {});
onAuthStateChanged(auth, async (u) => {
  user = u; parar.forEach((f) => f()); parar = []; membro = null; grupo = null; membros = [];
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
    <button class="pri" id="btEntrar">Entrar com Google</button>${erro ? `<p class="sub" style="color:var(--perigo)">${esc(erro)}</p>` : ''}
    <p class="sub">No iPhone, se a janela do Google não abrir, use o Safari (fora do atalho da tela de início).</p></div>`;
  $('#btEntrar').onclick = async () => {
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, p); }
    catch (e) { if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return signInWithRedirect(auth, p); if (e.code !== 'auth/popup-closed-by-user') telaLogin('Não deu para entrar: ' + (e.code || e.message)); }
  };
}

async function telaEntrar(codigo, erro) {
  $('#abas').innerHTML = '';
  let convite = null;
  if (codigo) { try { const s = await getDoc(doc(db, 'gastosConvites', codigo)); convite = s.exists() ? s.data() : null; } catch {} }
  if (!convite) {
    $('#conteudo').innerHTML = `<div class="caixa"><h2>Entrar na turma</h2>
      <p class="sub">${codigo ? 'Este código não é de nenhuma turma. Confira o link.' : 'Abra o link que o Juan mandou no grupo, ou cole aqui o código.'}</p>
      <form id="fCod" class="form"><label class="largo">Código ou link da turma<input id="cCod" required autocomplete="off"></label><div class="largo linha-acao"><button class="pri" type="submit">Continuar</button></div></form></div>`;
    $('#fCod').onsubmit = (e) => { e.preventDefault(); const c = $('#cCod').value.trim().replace(/.*[?&]c=/, ''); try { localStorage.setItem(CHAVE_CODIGO, c); } catch {} telaEntrar(c); };
    return;
  }
  $('#conteudo').innerHTML = `<div class="caixa"><h2>${esc(convite.grupo)}</h2><p class="sub">Quem é você na turma?</p>
    <form id="fEntrar" class="form"><label class="largo">Seu nome<select id="eNome">${(convite.pessoas || []).map((p) => `<option>${esc(p)}</option>`).join('')}<option value="">Outro nome…</option></select></label>
      <label class="largo" id="eOutroL" hidden>Nome (como a turma te chama)<input id="eOutro" maxlength="24"></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Entrar</button></div></form><p class="sub" style="color:var(--perigo)">${esc(erro || '')}</p></div>`;
  const sel = $('#eNome'), prim = (user.displayName || '').split(' ')[0].toLowerCase();
  const casa = [...sel.options].find((o) => o.value && prim && o.value.toLowerCase().startsWith(prim)); if (casa) sel.value = casa.value;
  const outro = () => { $('#eOutroL').hidden = sel.value !== ''; }; sel.onchange = outro; outro();
  $('#fEntrar').onsubmit = async (e) => {
    e.preventDefault(); const nome = (sel.value || $('#eOutro').value).trim();
    if (nome.length < 2) return telaEntrar(codigo, 'Escreva o seu nome.');
    try {
      await setDoc(doc(db, 'gastosMembros', user.uid), { nome, email: user.email, codigo, entrouEm: serverTimestamp() });
      if (!(convite.pessoas || []).includes(nome)) await updateDoc(doc(db, 'gastosConvites', codigo), { pessoas: arrayUnion(nome) });
      membro = { nome, email: user.email, codigo }; abrir();
    } catch (e2) { telaEntrar(codigo, 'Não deu para entrar: ' + (e2.code || e2.message)); }
  };
}

function abrir() {
  conta(); render();
  parar.push(onSnapshot(doc(db, 'gastosConvites', membro.codigo), (s) => { grupo = s.data() || null; if (aba === 'inicio') render(); }, () => {}));
  parar.push(onSnapshot(collection(db, 'gastosMembros'), (s) => {
    membros = s.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const eu = membros.find((m) => m.uid === user.uid); if (eu) membro = eu;
    if (aba === 'inicio' || aba === 'estudo') render();
  }, () => {}));
}

// ---------- telas ----------
function render() {
  $('#abas').innerHTML = ABAS.map(([k,t]) => `<button class="aba" role="tab" aria-selected="${k===aba}" data-aba="${k}">${t}</button>`).join('');
  const c = $('#conteudo'), y = window.scrollY;
  c.innerHTML = `<section data-painel="${aba}">${(TELAS[aba]||TELAS.inicio)()}</section>`;
  (LIGAR[aba]||(()=>{}))(c);
  contagem(); window.scrollTo(0, y);
}
function contagem() {
  const dia = Math.floor((Date.parse(hoje()) - Date.parse('2026-11-03')) / 864e5) + 1;
  $('#contagem').innerHTML = dia < 1 ? `<b>${1 - dia}</b><span>dia(s) para o curso</span>` : dia <= 59 ? `<b>${dia}º</b><span>dia de curso</span>` : '';
}
function irPara(k) { aba = k; try { history.replaceState(null, '', '#' + k); } catch {} render(); window.scrollTo(0, 0); }
const quadro = (pag, titulo) => `<iframe class="quadro" src="${pag}?embed=1" title="${titulo}" loading="lazy"></iframe>`;

const TELAS = {
inicio(){
  const f = feitos(membro), link = `${location.origin}${location.pathname}?c=${membro.codigo}`;
  const turma = membros.slice().sort((a,b) => (a.nome||'').localeCompare(b.nome||''));
  const faltam = (grupo?.pessoas || []).filter((p) => !membros.some((m) => m.nome === p));
  return `<div class="grade">
    <div class="caixa destaque"><div class="rotulo">Olá, ${esc(membro.nome)}</div><h3>Seu estudo: ${f} de ${IDS.length} itens</h3><div class="barra"><i style="width:${f/IDS.length*100}%"></i></div>
      <p class="sub">Comandos, aerodinâmica, limites e emergências do R22, tráfego e fonia; depois, o Esquilo. Marque cada item ao terminar.</p>
      <div class="linha-acao"><button class="pri" data-ir="estudo">Abrir o cronograma</button><button data-ir="revisao">Revisão R22</button></div></div>
    <div class="caixa"><div class="rotulo">Atalhos</div><div class="linha-acao">
      <button class="pri" data-ir="diario">📒 Lançar voo</button><button data-ir="gastos">💸 Lançar gasto</button><button data-ir="treino">🎧 Fonia e METAR</button><button data-ir="materiais">📄 Materiais</button><a class="btn" href="${SIMULADOR}" target="_blank" rel="noopener">🚁 Simulador</a></div></div>
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
estudo(){
  const f = feitos(membro);
  return `<div class="cab"><h2>Cronograma de estudo</h2><span class="selo la">${f}/${IDS.length} feitos</span></div>
  <p class="intro">Cada um marca o próprio progresso (a turma vê quantos itens cada um fez, na aba Início). Os PDFs abrem no Google Drive; os vídeos abrem a busca no YouTube.</p>
  <div class="grade">${CRONO.map(d => `<div class="caixa"><div class="dia-cab"><b>${esc(d.nome)}</b><span class="sub">${esc(d.meta)}</span></div>
    <ul class="lista-check">${d.itens.map(i => { const ok = !!membro?.estudo?.[i.id]; return `<li class="${ok?'feito':''}"><button class="check" aria-pressed="${ok}" aria-label="Marcar ${esc(i.t)}" data-prog="${i.id}">✓</button><div class="txt"><div class="titulo">${esc(i.t)}</div><div class="sub">${esc(i.d)}</div><div class="links">${i.l.map(([tp,a,b]) => tp==='pdf' ? pdf(a,b) : `<a href="${yt(a)}" target="_blank" rel="noopener">▶ ${esc(b)}</a>`).join('')}</div></div></li>`; }).join('')}</ul></div>`).join('')}</div>`;
},
revisao(){
  return `<h2>Revisão rápida do R22</h2><p class="intro">Resumo do POH (rev. 22/02/2024) e das Safety Notices, tirado da nota de estudo do cofre. Vale o POH da aeronave da escola.</p>
  <div class="caixa"><h3>Os comandos</h3><div class="tabela"><table><thead><tr><th>Comando</th><th>O que faz</th><th>Atenção no R22</th></tr></thead><tbody>
    <tr><td class="titulo">Cíclico em "T"</td><td>Inclina o disco do rotor: atitude e direção do deslocamento (à frente, ré, lados).</td><td>Barra única pivotando no poste central. Movimentos pequenos: pressão, não deslocamento. Trim lateral "RT TRIM"; passe a mão pela esquerda do poste para não puxar a mistura (SN-1).</td></tr>
    <tr><td class="titulo">Coletivo</td><td>Muda o passo de todas as pás juntas: sobe ou desce.</td><td>O correlador abre a manete ao subir o coletivo. Mais coletivo pede mais pedal esquerdo (torque).</td></tr>
    <tr><td class="titulo">Manete + governador</td><td>Mantém a RPM do motor/rotor.</td><td>Governador atua acima de 80% e segura 101–104%. Na pane: segurar a manete, governador OFF e voo manual.</td></tr>
    <tr><td class="titulo">Pedais</td><td>Passo do rotor de cauda: proa no pairado e coordenação em voo.</td><td>Rotor principal anti-horário: pane de motor guina a proa para a ESQUERDA; pane de rotor de cauda guina para a DIREITA.</td></tr>
    <tr><td class="titulo">Aquecimento do carburador</td><td>Evita gelo no carburador.</td><td>Abaixo de 18 inHg de MAP: calor total. O governador mascara o gelo (SN-31).</td></tr>
  </tbody></table></div></div>
  <div class="grade">
    <div class="caixa"><h3>Números que não podem faltar</h3><div class="tabela"><table><tbody>
      <tr><td>RPM com motor (arco verde)</td><td class="n mono">101–104%</td></tr><tr><td>Buzina e luz LOW RPM</td><td class="n mono">&lt; 97%</td></tr>
      <tr><td>RPM em autorrotação</td><td class="n mono">90–110%</td></tr><tr><td>Vne até 3000 ft DA</td><td class="n mono">102 KIAS</td></tr>
      <tr><td>Decolagem e subida / aproximação</td><td class="n mono">60 KIAS</td></tr><tr><td>Vy (melhor razão)</td><td class="n mono">53 KIAS</td></tr>
      <tr><td>Autorrotação</td><td class="n mono">60–70 KIAS</td></tr><tr><td>Planeio máximo</td><td class="n mono">≈ 75 KIAS · 90%</td></tr>
      <tr><td>Peso máximo de decolagem</td><td class="n mono">1370 lb (622 kg)</td></tr><tr><td>Máximo por assento</td><td class="n mono">240 lb (109 kg)</td></tr>
      <tr><td>Combustível utilizável (principal + aux.)</td><td class="n mono">16,9 + 9,4 gal</td></tr><tr><td>Consumo médio</td><td class="n mono">≈ 8 gal/h</td></tr>
      <tr><td>Altitude-densidade máxima</td><td class="n mono">14 000 ft</td></tr>
    </tbody></table></div><p class="sub">Solo só no assento DIREITO. Sem acrobacia e sem baixo G. Headset funcionando para cada piloto.</p></div>
    <div class="caixa"><h3>Reflexos de emergência</h3>
      <div class="reflexo">Buzina de baixa RPM: BAIXAR o coletivo + DAR manete; em voo à frente, cíclico para trás.</div>
      <div class="reflexo">Pane de motor: baixar o coletivo IMEDIATAMENTE, ~65 KIAS, RRPM 97–110%, flare a ~40 ft, nivelar a ~8 ft e amortecer com o coletivo.</div>
      <div class="reflexo">Baixo G: cíclico PARA TRÁS suave para recarregar o rotor; SÓ DEPOIS corrigir o rolamento.</div>
      <div class="reflexo">Rolamento dinâmico: coletivo para baixo, rápido. Cíclico contrário não basta.</div>
      <div class="reflexo">Anel de vórtice: sair da própria esteira (à frente ou lateral). Subir o coletivo piora.</div>
      <div class="reflexo">Perda do rotor de cauda em voo: autorrotação, ≥ 70 KIAS. No pairado: manete na mola de sobrecurso.</div>
      <p class="sub">Gelo no carburador é provável entre −4 e 30 °C com OAT − orvalho &lt; 15 °C: Rio e Curitiba se encaixam bem.</p></div>
  </div>
  <div class="caixa"><h3>Safety Notices que mais pesam</h3><div class="links">${SN.map(([k,c,t]) => ARQ[k] ? `<a class="pdf" href="${esc(ARQ[k])}" target="_blank" rel="noopener">${c} · ${esc(t)}</a>` : `<span class="sub">${c} · ${esc(t)}</span>`).join('')}</div>
    <p class="sub">Use a SFAR 73 dos EUA como padrão de segurança: gestão de energia, mast bumping, baixa RPM (estol de pá), baixo G e decaimento de RPM.</p></div>`;
},
treino(){
  const ex = DADOS.METAR;
  return `<h2>Treino</h2>
  <div class="grade">
    <div class="caixa"><h3>Decodificador de METAR</h3><p class="sub">Cole um METAR (do REDEMET ou do AISWEB) para ler por partes. Exemplos de Bacacheri abaixo.</p>
      <textarea id="mtIn" class="mono" aria-label="METAR">${esc(ex[0].codigo)}</textarea><div class="linha-acao"><button class="pri" id="mtBtn">Decodificar</button><a class="btn" href="https://aviationweather.gov/data/metar/?ids=SBBI,SBCT,SBJR,SBRJ,SBGL&hours=0" target="_blank" rel="noopener">METAR de agora (SBBI, SBCT, SBJR, SBRJ, SBGL)</a></div>
      <div id="mtOut"></div></div>
    <div class="caixa"><h3>GO ou NO-GO?</h3><p class="sub">${ex.length} METAR de estudo. Leia e decida se dá para o voo VFR de instrução.</p><div id="mqBox"></div></div>
  </div>
  <div class="caixa"><div class="cab"><h3>Fonia (MCA 100-16)</h3><select id="fnSel" style="max-width:340px" aria-label="Cenário">${DADOS.FONIA.map((f,i)=>`<option value="${i}">${i+1}. ${esc(f.titulo)}</option>`).join('')}</select></div>
    <p class="sub">Cenário-modelo em Bacacheri (SBBI) com matrícula fictícia. No voo real, use frequências e pontos da carta do AISWEB.</p><div id="fnBox"></div></div>
  <div class="grade">
    <div class="caixa"><h3>Alfabeto e números</h3><div class="tabela"><table><tbody>${DADOS.ALFABETO.map(([l,p])=>`<tr><td class="mono titulo">${l}</td><td>${esc(p)}</td></tr>`).join('')}</tbody></table></div><p class="sub">${DADOS.NUMEROS.map(([n,p])=>`<b>${n}</b> ${esc(p)}`).join(' · ')}</p></div>
    <div class="caixa"><h3>Palavras padrão</h3><div class="tabela"><table><thead><tr><th>Português</th><th>Inglês</th><th>Significa</th></tr></thead><tbody>${DADOS.PALAVRAS_PADRAO.map(([a,b,c])=>`<tr><td class="titulo">${esc(a)}</td><td>${esc(b)}</td><td class="sub">${esc(c)}</td></tr>`).join('')}</tbody></table></div>
      <h3 style="margin-top:8px">Transponder</h3>${DADOS.TRANSPONDER.map(t=>`<div><span class="mono titulo">${esc(t.codigo)}</span> ${esc(t.significado)} <span class="sub">(${esc(t.dica)})</span></div>`).join('')}</div>
  </div>`;
},
materiais(){
  const ess = [['r22poh','POH R22 (Robinson, fev/2024)'],['r22br','R22: Suplemento Brasileiro do POH'],['delanir','Delanir: apostila PPH/PCH (aluno)'],['resumao','Resumão Piloto Privado'],['ica1004','ICA 100-4: regras para helicópteros (DECEA)'],['ica10012','ICA 100-12: regras do ar (DECEA)'],['mca10016','MCA 100-16: fraseologia (DECEA, 2025)'],['codmet','Códigos meteorológicos (METAR, TAF)'],['planovoo','Plano de voo'],['rbac67','RBAC 67: certificado médico (CMA)'],['faa6','FAA Helicopter Flying Handbook, cap. 6: peso e balanceamento'],['faa7','FAA Helicopter Flying Handbook, cap. 7: desempenho'],['is141','IS 141-007: programas de instrução (ANAC)']];
  return `<h2>Materiais</h2><p class="intro">Os PDFs ficam numa pasta do Google Drive compartilhada com a turma. Se o Drive pedir acesso, toque em "Solicitar acesso" com a mesma conta Google que você usa aqui.</p>
  <div class="caixa destaque"><h3>Essenciais do PPH</h3><div class="links">${ess.map(([k,t])=>pdf(k,t)).join('')}</div></div>
  <div class="caixa"><h3>Safety Notices do R22</h3><div class="links">${SN.map(([k,c,t]) => pdf(k, c + ' · ' + t)).join('')}</div></div>
  <div class="caixa"><h3>Esquilo (2º momento)</h3><div class="links">${pdf('dominio','Livro Domínio da Máquina: emergências do Esquilo AS350/H125 (Cmte Deccache, 2024)')}</div>
    <p class="sub">Livro comprado pela turma: uso só entre nós.</p></div>
  <div class="caixa"><h3>Pasta completa</h3><div class="links">${DRIVE_PASTA ? `<a class="pdf" href="https://drive.google.com/drive/folders/${DRIVE_PASTA}" target="_blank" rel="noopener">📁 Abrir a pasta no Google Drive</a>` : ''}<a href="${SIMULADOR}" target="_blank" rel="noopener">Simulador Heli (21 fases)</a></div></div>`;
},
gastos(){ return quadro('gastos.html', 'Gastos da turma'); },
diario(){ return `<p class="sub">Só você vê os seus voos.</p>` + quadro('diario.html', 'Diário de voo'); },
acessos(){
  const ad = (c,n,s) => `<a href="https://aisweb.decea.mil.br/?i=aerodromos&codigo=${c}" target="_blank" rel="noopener"><b class="mono">${c}</b> ${n}</a>${s?`<span class="sub" style="align-self:center">${s}</span>`:''}`;
  return `<h2>Acessos e rotas</h2>
  <div class="grade">
    <div class="caixa"><h3>ANAC</h3><div class="links"><a href="https://sistemas.anac.gov.br/SACI/" target="_blank" rel="noopener">SACI · CIV Digital</a><a href="https://sistemas.anac.gov.br/SACI/CadAeronauta/Identificacao.asp" target="_blank" rel="noopener">SACI · cadastro do aeronauta</a><a href="https://www.gov.br/anac/pt-br/assuntos/regulados/profissionais-da-aviacao-civil" target="_blank" rel="noopener">Profissionais da aviação (gov.br)</a><a href="https://www.gov.br/anac/pt-br/assuntos/regulados/profissionais-da-aviacao-civil/arquivos/ManualdoSuperApp.pdf" target="_blank" rel="noopener">App ANAC (manual)</a></div></div>
    <div class="caixa"><h3>Meteorologia e informações</h3><div class="links"><a href="https://redemet.decea.mil.br/" target="_blank" rel="noopener">REDEMET (METAR, TAF, satélite, radar)</a><a href="https://aviationweather.gov/data/metar/?ids=SBBI,SBCT,SBJR,SBRJ,SBGL&hours=0" target="_blank" rel="noopener">METAR agora (5 aeródromos)</a><a href="https://aisweb.decea.mil.br/?i=notam" target="_blank" rel="noopener">NOTAM (AISWEB)</a><a href="https://aisweb.decea.mil.br/?i=cartas" target="_blank" rel="noopener">Cartas (AISWEB)</a><a href="https://www.windy.com/-25.47/-49.16" target="_blank" rel="noopener">Windy · Piraquara</a></div></div>
  </div>
  <div class="grade">
    <div class="caixa destaque"><h3>Curitiba (curso)</h3><div class="links">${ad('SISY','Piraquara','base da EACAR, privado')}${ad('SBBI','Bacacheri','aviação geral')}${ad('SBCT','Afonso Pena','comercial, TMA')}</div>
      <p class="sub">Bacacheri (ROTAER de 27/10/2026): Torre 118.900 · Solo 121.800 · ATIS 132.325 · pista 18/36. Confira sempre no AISWEB no dia do voo.</p>
      <p class="sub">Áreas de instrução e rotas de saída de Piraquara: não há publicação aberta; pergunte ao instrutor no 1º dia e anote em Anotações.</p></div>
    <div class="caixa"><h3>Rio de Janeiro</h3><div class="links">${ad('SBJR','Jacarepaguá','helicópteros, GOA')}${ad('SBRJ','Santos Dumont','')}${ad('SBGL','Galeão','')}</div>
      <p class="sub">Helicópteros voam em REH (Rotas Especiais de Helicópteros) visuais do DECEA. Segundo a imprensa (05/10/2026), a partir de novembro/2026 as REH <b>Boa Vista</b> e <b>Cristo (até Caiçara)</b> serão canceladas e a <b>REH Praia</b> será afastada da costa. Confirmar na carta vigente do AISWEB.</p></div>
  </div>
  `;
},
};

function decodificarMetar(txt){
  const t = txt.toUpperCase().replace(/=\s*$/,'').trim().split(/\s+/), r = [];
  let i = 0; if (/^(METAR|SPECI)$/.test(t[i])) r.push(['Tipo', t[i++]==='SPECI'?'SPECI (especial)':'METAR (rotina)']);
  if (/^[A-Z]{4}$/.test(t[i]||'')) r.push(['Aeródromo', t[i++]]);
  if (/^\d{6}Z$/.test(t[i]||'')) { const d=t[i++]; r.push(['Hora', `dia ${d.slice(0,2)}, ${d.slice(2,4)}:${d.slice(4,6)} UTC (${String((+d.slice(2,4)+21)%24).padStart(2,'0')}:${d.slice(4,6)} em Brasília)`]); }
  if (t[i]==='AUTO'||t[i]==='COR') r.push(['Obs.', t[i++]==='AUTO'?'automático':'corrigido']);
  let teto = null, vis = null, fen = [], nuvens = [];
  for (; i < t.length; i++) { const g = t[i]; let m;
    if ((m = /^(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT$/.exec(g))) r.push(['Vento', m[1]==='000'&&m[2]==='00' ? 'calmo' : `${m[1]==='VRB'?'variável':m[1]+'°'} ${+m[2]} kt${m[4]?`, rajadas de ${+m[4]} kt`:''}`]);
    else if ((m = /^(\d{3})V(\d{3})$/.exec(g))) r.push(['Variação', `direção entre ${m[1]}° e ${m[2]}°`]);
    else if (g==='CAVOK') { vis = 10000; r.push(['CAVOK','visibilidade ≥ 10 km, sem nuvem abaixo de 5000 ft ou da altitude mínima de setor, sem CB/TCU e sem tempo significativo']); }
    else if (/^\d{4}$/.test(g)) { vis = +g; r.push(['Visibilidade', g==='9999'?'10 km ou mais':`${+g} m`]); }
    else if ((m = /^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/.exec(g))) { const nome={FEW:'poucas (1–2/8)',SCT:'esparsas (3–4/8)',BKN:'nublado (5–7/8)',OVC:'encoberto (8/8)'}[m[1]], alt=+m[2]*100; nuvens.push(`${nome} a ${alt} ft${m[3]?' '+m[3]:''}`); if ((m[1]==='BKN'||m[1]==='OVC') && teto==null) teto = alt; }
    else if ((m = /^VV(\d{3})$/.exec(g))) { teto = teto ?? +m[1]*100; nuvens.push(`céu obscurecido, visibilidade vertical ${+m[1]*100} ft`); }
    else if (g==='NSC'||g==='SKC') nuvens.push('sem nuvens significativas');
    else if ((m = /^(M?\d{2})\/(M?\d{2})$/.exec(g))) { const c=(s)=>+s.replace('M','-'); r.push(['Temperatura', `${c(m[1])} °C, ponto de orvalho ${c(m[2])} °C (diferença ${c(m[1])-c(m[2])} °C)`]); }
    else if ((m = /^Q(\d{4})$/.exec(g))) r.push(['QNH', `${+m[1]} hPa`]);
    else if (/^(\+|-|VC)?(MI|BC|PR|DR|BL|SH|TS|FZ)?(DZ|RA|SN|SG|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PO|SQ|FC|SS|DS)+$/.test(g) || /^(\+|-)?(TS|SH)$/.test(g)) fen.push(g);
    else if (g==='RMK') break; }
  if (nuvens.length) r.push(['Nuvens', nuvens.join('; ')]); if (fen.length) r.push(['Tempo presente', fen.join(' ') + ' (BR névoa úmida, FG nevoeiro, RA chuva, DZ chuvisco, TS trovoada, SH pancada, HZ névoa seca)']);
  const ok = (vis==null||vis>=5000) && (teto==null||teto>=1500);
  return { r, vfr: ok, teto, vis };
}
function mostrarMetar(){
  const d = decodificarMetar($('#mtIn').value);
  $('#mtOut').innerHTML = `<dl class="decod">${d.r.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
    <div class="selo ${d.vfr?'ok':'pe'}" style="margin-top:6px">${d.vfr?'Acima dos mínimos VFR gerais (teto ≥ 1500 ft e visibilidade ≥ 5 km)':'Abaixo dos mínimos VFR gerais: teto < 1500 ft ou visibilidade < 5 km'}</div>
    <p class="sub">Mínimos de referência do VFR em aeródromo controlado; helicóptero tem regras próprias na ICA 100-4. A decisão é do instrutor.</p>`;
}
let mqI = 0;
function metarQuiz(){
  const m = DADOS.METAR[mqI % DADOS.METAR.length];
  $('#mqBox').innerHTML = `<div class="metar">${esc(m.codigo)}</div><div class="sub">${esc(m.aerodromo)}</div><div class="linha-acao"><button data-mq="GO">GO</button><button data-mq="NO-GO">NO-GO</button><button class="mini fantasma" data-mqprox="1">Próximo</button></div><div id="mqRes"></div>`;
}
let fnI = 0, fnP = 0;
function fonia(){
  const f = DADOS.FONIA[fnI], passos = f.passos || [];
  let h = `<div class="sub"><b>${esc(f.orgao||'')}</b> · ${esc(f.contexto||'')}</div>`;
  for (let k = 0; k <= Math.min(fnP, passos.length-1); k++) { const p = passos[k];
    if (p.quem === 'ATC') h += `<div class="fala atc"><span class="rotulo">ATC</span><div>${esc(p.t)}</div>${p.en?`<div class="en">${esc(p.en)}</div>`:''}</div>`;
    else { const resp = k < fnP; h += `<div class="fala pil"><span class="rotulo">Você${p.pergunta?' · '+esc(p.pergunta):''}</span>${(p.opcoes||[]).map((o,j)=>`<button class="opcao ${resp&&o.ok?'certa':''}" data-fn="${k}|${j}" ${resp?'disabled':''}>${esc(o.t)}</button>`).join('')}<div class="sub" data-fnexp="${k}"></div></div>`; } }
  if (fnP >= passos.length-1 && passos[passos.length-1]?.quem==='ATC' || fnP >= passos.length) h += `<div class="selo ok">Cenário concluído</div>`;
  $('#fnBox').innerHTML = h;
  const p = passos[fnP]; if (p && p.quem === 'ATC' && fnP < passos.length-1) { fnP++; fonia(); }
}


// ---------- ligações ----------
const LIGAR = {
  inicio(c){
    c.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); irPara(b.dataset.ir); }));
    $('#btLink').onclick = () => { const link = $('#lkTurma').value;
      if (navigator.share) navigator.share({ title: 'Hangar da Turma', text: 'Hangar da Turma do PPH: estudo, materiais, gastos e diário de voo. Entre com o seu Google:', url: link }).catch(() => {});
      else navigator.clipboard.writeText(link).then(() => toast('Link copiado'), () => toast(link)); };
  },
  estudo(c){ c.querySelectorAll('[data-prog]').forEach(b => b.onclick = () => {
    const id = b.dataset.prog, ok = !membro?.estudo?.[id];
    membro.estudo = { ...(membro.estudo || {}), [id]: ok ? hoje() : undefined }; render();
    updateDoc(doc(db, 'gastosMembros', user.uid), { ['estudo.' + id]: ok ? hoje() : deleteField() }).catch(() => toast('Não salvou. Tente de novo.'));
  }); },
  treino(){ $('#mtBtn').onclick = mostrarMetar; mostrarMetar(); metarQuiz(); fnI = 0; fnP = 0; fonia();
    $('#mqBox').onclick = (e) => { const b = e.target.closest('[data-mq],[data-mqprox]'); if (!b) return; if (b.dataset.mqprox) { mqI++; return metarQuiz(); } const m = DADOS.METAR[mqI % DADOS.METAR.length], ok = b.dataset.mq === m.decisao; $('#mqRes').innerHTML = `<div class="selo ${ok?'ok':'pe'}">${ok?'Certo':'Errado'}: ${esc(m.decisao)}</div><p class="sub">${esc(m.motivo)}</p><dl class="decod">${Object.entries(m.decod||{}).map(([a,b])=>`<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>`; };
    $('#fnSel').onchange = (e) => { fnI = +e.target.value; fnP = 0; fonia(); };
    $('#fnBox').onclick = (e) => { const b = e.target.closest('[data-fn]'); if (!b) return; const [k,j] = b.dataset.fn.split('|').map(Number), o = DADOS.FONIA[fnI].passos[k].opcoes[j];
      if (o.ok) { fnP = k + 1; fonia(); } else { b.classList.add('errada'); const ex = $(`[data-fnexp="${k}"]`); if (ex) ex.textContent = o.erro || 'Não é a frase padrão.'; } }; },
};

document.getElementById('abas').addEventListener('click', (e) => { const b = e.target.closest('[data-aba]'); if (b && membro) irPara(b.dataset.aba); });
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (membro && ABAS.some(a=>a[0]===h) && h !== aba) { aba = h; render(); } });
// As páginas de gastos e diário, abertas aqui dentro, avisam a altura para o quadro crescer junto.
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.data?.tipo !== 'altura') return;
  document.querySelectorAll('iframe.quadro').forEach((f) => { if (f.contentWindow === e.source) f.style.height = Math.max(400, e.data.h + 20) + 'px'; });
});
