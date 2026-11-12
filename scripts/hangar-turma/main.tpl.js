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
import { telaProvas, ligarProvas, emProva, totalQuestoes } from './provas.js';
import { telaContrato } from './contrato.js';
import { telaTempo, ligarTempo, resumoInicio } from './tempo.js';
import { limpar, limparNome, linkSeguro, ligarMascaras } from '../entrada.js';

const app = initializeApp(FIREBASE_CONFIG), auth = getAuth(app), db = getFirestore(app);
auth.languageCode = 'pt';
const DADOS = { FONIA, ALFABETO, NUMEROS, PALAVRAS_PADRAO, TRANSPONDER, METAR };
const ARQ = Object.fromEntries(Object.entries(DRIVE).map(([k, id]) => [k, `https://drive.google.com/file/d/${id}/view`]));
const CHAVE_CODIGO = 'gastos-codigo';
const SIMULADOR = './';
function codigosDoExercicio(s){
  const out = new Set(), re = /([A-Z]{2,5})-?\s*(\d{1,2}(?:\s*\/\s*\d{1,2})*)/g;
  const txt = String(s || '').toUpperCase();
  let m; while ((m = re.exec(txt))) m[2].split('/').forEach((n) => out.add(m[1] + '-' + String(+n).padStart(2, '0')));
  if (/\bAVX\b/.test(txt)) out.add('AVX');
  return out;
}
const hmin = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
const FIP = /*@FIP@*/;
const NOVIDADES = /*@NOVIDADES@*/;
/*@NOVUI@*/
const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
const $ = (s, r = document) => r.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dBR = (iso) => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '';
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),2400); }
const pdf = (k, rot) => ARQ[k] ? `<a class="pdf" href="${esc(ARQ[k])}" target="_blank" rel="noopener">📄 ${esc(rot)}</a>` : `<span class="sub">📄 ${esc(rot)}</span>`;

const ABAS = [['inicio','Início'],['tempo','Tempo'],['checklists','Checklists'],['estudo','Estudo'],['provas','Provas'],['revisao','Revisão R22'],['treino','Treino'],['materiais','Materiais'],['contrato','Contrato'],['gastos','Gastos'],['compras','Compras'],['anotacoes','Anotações'],['fip','FIP'],['diario','Diário de voo'],['acessos','Acessos e rotas']];
let aba = (location.hash || '').slice(1); if (!ABAS.some(a => a[0] === aba)) aba = 'inicio';
let user = null, membro = null, grupo = null, membros = [], mats = [], gastos = [], compras = [], errCompras = '', anotacoes = [], errAnotacoes = '', notasProvas = [], meusDocs = [], meusVoos = [], meusDias = [], diaOutro = '', parar = [], trocandoPix = false;

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
  // documentos dos voos do próprio piloto (aba DB e Ficha): para avisar no Início o que falta enviar
  parar.push(onSnapshot(collection(db, 'diario', user.uid, 'docs'), (s) => { meusDocs = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (aba === 'inicio' && !digitandoPix()) render(); }, () => {}));
  parar.push(onSnapshot(collection(db, 'diario', user.uid, 'dias'), (s) => { meusDias = s.docs.map((d) => ({ iso: d.id, ...d.data() })); if (aba === 'inicio' && !digitandoPix() && !document.activeElement?.matches?.('#diaOutroTxt')) render(); }, () => {}));
  parar.push(onSnapshot(collection(db, 'diario', user.uid, 'voos'), (s) => { meusVoos = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (aba === 'inicio' && !digitandoPix()) render(); }, () => {}));
  parar.push(onSnapshot(collection(db, 'provas'), (s) => {
    notasProvas = s.docs.map((d) => ({ uid: d.id, ...d.data() }));
    if (aba === 'provas' && !emProva()) render();
  }, () => {}));
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
  const nNovas = novNovas().length;
  $('#abas').innerHTML = ABAS.map(([k,t]) => `<button class="aba" role="tab" aria-selected="${k===aba}" data-aba="${k}">${t}${k === 'inicio' && nNovas ? '<span class="novo-ponto" aria-label="material novo"></span>' : ''}</button>`).join('');
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
// Formulário diário do GOA (Acompanhamento PPH/2026, Contrato 089/2026): um por atividade, todo dia, inclusive sem voo.
const FORM_GOA = 'https://forms.gle/vFepv8CD5RDd7Ret7';
// Voos do Diário (registros de horas ou só documentos), na ordem, com o que falta: DB e/ou ficha
function pendenciasDocs() {
  const g = new Map();
  for (const v of meusVoos) g.set(v.id, { id: v.id, data: v.data, ini: v.inicio || '' });
  for (const d of meusDocs) if (!g.has(d.voo)) g.set(d.voo, { id: d.voo, data: d.data || d.voo.slice(0, 10), ini: d.voo.slice(11) });
  const lista = [...g.values()].sort((a, b) => (a.data + a.ini).localeCompare(b.data + b.ini));
  lista.forEach((x, i) => { x.aula = i + 1; x.falta = [['db', 'o DB'], ['ficha', 'a ficha']].filter(([t]) => !meusDocs.some((d) => d.voo === x.id && d.tipo === t)).map(([, n]) => n); });
  // dia marcado "voou" e sem nenhum documento daquela data: esqueceu os dois
  const semNada = meusDias.filter((d) => d.voou && !lista.some((x) => x.data === d.iso)).map((d) => ({ id: d.iso, data: d.iso, aula: null, falta: ['o DB', 'a ficha'] }));
  return { total: lista.length, pend: [...lista.filter((x) => x.falta.length), ...semNada].sort((a, b) => b.data.localeCompare(a.data)) };
}
// "Voou hoje?" (só para o próprio piloto): diario/{uid}/dias/{AAAA-MM-DD} = { voou, motivo, outro }.
// O motivo já diz o que marcar no "Registro de dia sem atividade" do formulário do GOA.
const MOTIVOS = { chuva: ['🌧️ Mau tempo / chuva', 'Condições meteorológicas'], vento: ['💨 Vento', 'Condições meteorológicas'], fds: ['📅 Fim de semana / sem voo programado', 'Folga / intervalo previsto no cronograma'], outro: ['Outro', 'Outro motivo'] };
const isoMenos = (n) => { const d = new Date(Date.parse(hoje() + 'T12:00:00')); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
function perguntaDia(iso, rotulo) {
  const r = meusDias.find((d) => d.iso === iso), temDoc = meusDocs.some((d) => (d.data || d.voo.slice(0, 10)) === iso);
  if (r?.voou === false) { const m = MOTIVOS[r.motivo] || MOTIVOS.outro;
    return `<div class="dia-res">Sem voo ${rotulo}: <b>${esc(r.motivo === 'outro' && r.outro ? r.outro : m[0])}</b> <span class="sub">· no formulário do GOA: "Não" › motivo "${esc(m[1])}"</span> <button class="mini fantasma" data-dia-mudar="${iso}">mudar</button></div>`; }
  if (r?.voou || temDoc) return temDoc ? '' : `<div class="dia-res">Voou ${rotulo}: guarde o DB e a ficha (está na lista acima). <button class="mini fantasma" data-dia-mudar="${iso}">mudar</button></div>`;
  const aberto = diaOutro === iso;
  return `<div class="dia-perg"><b>Voou ${rotulo}?</b>
    <div class="linha-acao"><button class="mini pri" data-dia="${iso}" data-voou="1">🚁 Sim</button>${Object.entries(MOTIVOS).map(([k, [t]]) => `<button class="mini" data-dia="${iso}" data-motivo="${k}">${k === 'outro' ? 'Não: outro motivo' : 'Não: ' + t}</button>`).join('')}</div>
    ${aberto ? `<div class="linha-acao"><input id="diaOutroTxt" maxlength="60" placeholder="Qual? (ex.: aeronave em manutenção)"><button class="mini pri" data-dia-outro="${iso}">Salvar</button></div>` : ''}</div>`;
}
function perguntaOntem() {
  const iso = isoMenos(1);
  return meusDias.some((d) => d.iso === iso) || meusDocs.some((d) => (d.data || d.voo.slice(0, 10)) === iso) ? '' : perguntaDia(iso, `ontem (${iso.split('-').reverse().join('/').slice(0, 5)})`);
}
async function marcarDia(iso, dados) {
  try { await setDoc(doc(db, 'diario', user.uid, 'dias', iso), { ...dados, em: serverTimestamp() }); diaOutro = ''; if (dados.voou) toast('Marcado: voou.'); }
  catch (e) { toast('Não salvou: ' + (e.code === 'permission-denied' ? 'o "voou hoje?" ainda está sendo ativado no banco.' : e.code || e.message)); }
}
const cartaoGoa = () => `<div class="caixa goa-cartao">
  <div class="goa-topo"><span class="goa-ico">📋</span><div><div class="rotulo">Todo dia · exigência do GOA</div><h3>Acompanhamento diário do curso</h3>
    <p class="sub">Uma resposta para cada atividade (dois voos = duas respostas). Dia sem voo também: marque "Não" e informe o motivo.</p></div></div>
  <div class="linha-acao"><a class="btn pri goa-bt" href="${FORM_GOA}" target="_blank" rel="noopener">Preencher o formulário de hoje</a><button data-ir="contrato">📜 O que diz o contrato</button></div>
  <div class="goa-docs ok">${perguntaDia(hoje(), 'hoje')}${perguntaOntem()}</div>
  <details class="goa-como"><summary>Como preencher (8 páginas)</summary><ol>
    <li><b>Identificação:</b> seu nome na lista, a data e se houve instrução. Se não houve, o formulário pula para "Dia sem atividade" (motivo, se a escola avisou e a nova data).</li>
    <li><b>Atividade:</b> tipo (voo de instrução, ground school, simulador...), se estava no cronograma, horários efetivos de início e fim, a fase (Fase 1 – Adaptação, por enquanto) e a missão como está na ficha (ex.: INCT-02).</li>
    <li><b>Dados do voo:</b> modelo e matrícula (R22, PR-HMI), instrutor e CANAC, saída e destino (SISY), horas de decolagem e pouso, tempo de voo lançado na ficha, natureza (duplo comando), decolagens, pousos e rota.</li>
    <li><b>Instrução:</b> briefing, debriefing, se o instrutor passou os pontos a melhorar, o grau da ficha, se precisa repetir e o parecer.</li>
    <li><b>Documentação:</b> a escola passou a enviar a Ficha de Avaliação e o Diário de Bordo automaticamente — não é mais preciso anexar foto nem PDF.</li>
    <li><b>Execução do contrato:</b> aeronave, instrutor e material disponíveis, se a atividade foi integral e se houve ocorrência.</li>
    <li><b>Declaração</b> e enviar.</li></ol></details>
</div>`;
const ctxProvas = { db, user: () => user, membro: () => membro, notas: () => notasProvas, arq: ARQ, toast, render: () => { if (aba === 'provas') render(); } };
const quadro = (pag, titulo) => `<iframe class="quadro" src="${pag}?embed=1" title="${titulo}" loading="lazy" allow="microphone"></iframe>`;

const TELAS = {
inicio(){
  const avisoNovo = cartaoNovidades();
  const f = feitos(membro), link = `${location.origin}${location.pathname}?c=${membro.codigo}`;
  const turma = membros.slice().sort((a,b) => (a.nome||'').localeCompare(b.nome||''));
  const faltam = (grupo?.pessoas || []).filter((p) => !membros.some((m) => m.nome === p));
  const pix = caixaPix(membro, trocandoPix);
  return `${avisoNovo}${cartaoGoa()}${pix ? `<div class="caixa destaque">${pix}</div>` : ''}
  <div class="caixa"><div class="cab"><div class="rotulo">Seus acertos da turma</div><button class="mini" data-ir="gastos">Ver os gastos</button></div>
    ${alertaAcertos(calcular(gastos), membro.nome, membros)}
    ${membro.pix && !trocandoPix ? `<p class="sub">Sua chave Pix: <b>${esc(membro.pix)}</b> <button class="mini" data-pix-trocar>Trocar</button></p>` : ''}</div>
  <div class="caixa"><div class="cab"><div class="rotulo">Tempo agora</div><button class="mini" data-ir="tempo">METAR, TAF e previsão</button></div><div id="tpInicio" class="sub">buscando o METAR…</div></div>
  ${ckCartao()}<div class="grade">
    <div class="caixa destaque"><div class="rotulo">Olá, ${esc(membro.nome)}</div><h3>Seu estudo: ${f} de ${IDS.length} itens</h3><div class="barra"><i style="width:${f/IDS.length*100}%"></i></div>
      <p class="sub">Comandos, aerodinâmica, limites e emergências do R22, tráfego e fonia; depois, o Esquilo. Marque cada item ao terminar.</p>
      <div class="linha-acao"><button class="pri" data-ir="estudo">Abrir o cronograma</button><button data-ir="revisao">Revisão R22</button></div></div>
    <div class="caixa"><div class="rotulo">Atalhos</div><div class="linha-acao">
      <button class="pri" data-ir="diario">📒 Lançar voo</button><button data-ir="fip">🎯 FIP do curso</button><button data-ir="tempo">🌤️ Tempo</button><button data-ir="gastos">💸 Lançar gasto</button><button data-ir="compras">🛒 Lista de compras${compras.filter((x) => !x.feito).length ? ` (${compras.filter((x) => !x.feito).length})` : ''}</button><button data-ir="provas">✍️ Provas (${totalQuestoes()} questões)</button><button data-ir="anotacoes">📝 Anotações${anotacoes.filter((x) => !x.feito).length ? ` (${anotacoes.filter((x) => !x.feito).length})` : ''}</button><button data-ir="treino">🎧 Fonia e METAR</button><button data-ir="materiais">📄 Materiais</button><a class="btn" href="${SIMULADOR}" target="_blank" rel="noopener">🚁 Simulador</a></div></div>
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
contrato(){ return telaContrato(ARQ); },
provas(){ return telaProvas(ctxProvas); },
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
  const eacar = [['eacarpre','Checklist pré-voo externo R22'],['eacaracio','Checklist de acionamento e corte R22'],['eacaremerg','Procedimentos de emergência R22'],['eacarproc','Manual de Procedimentos Operacionais (manobras, para alunos)'],['eacarman','Manual de Manobras R22 (Otavio Rosa e Rudi Barlem)'],['eacarpoh','POH R22: tradução para alunos (EACAR, 2026)'],['eacarfonia','Roteiro de fonia do circuito SISY']];
  const extras = (s) => mats.filter((m) => m.secao === s).map((m) => `<span class="mat-turma"><a href="${esc(linkSeguro(m.link) || '#')}" target="_blank" rel="noopener noreferrer">📎 ${esc(m.titulo)}</a>${m.autor === user.uid ? `<button class="mini fantasma" data-matdel="${esc(m.id)}" aria-label="Tirar ${esc(m.titulo)}">×</button>` : ''}<span class="sub">${esc(m.nome || '')}</span></span>`).join('');
  return `<h2>Materiais</h2><p class="intro">Os PDFs ficam numa pasta do Google Drive compartilhada com a turma. Se o Drive pedir acesso, toque em "Solicitar acesso" com a mesma conta Google que você usa aqui. O que alguém da turma acrescentar aparece direto na seção escolhida.</p>
  <div class="caixa destaque"><h3>Documentos do curso</h3><div class="links">${pdf('contrato','Contrato 089/2026 (CBMERJ x EACAR), assinado')}${pdf('edital','Edital 34 da SENASP e anexos: Termo de Referência, ETP e IMR')}</div>
    <p class="sub">O resumo do que a escola deve fazer, o que é nosso e os prazos está na aba <a href="#contrato" data-ir="contrato">Contrato</a>.</p></div>
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
diario(){ return `<p class="sub">Só você vê os seus voos. <a href="fichas.html" target="_blank" rel="noopener">Arquivos antigos de DB e ficha</a> continuam guardados aí, caso você já tenha subido algum.</p>` + quadro('diario.html', 'Diário de voo'); },
fip(){
  // o que cada um já cumpriu sai dos próprios voos: o código da missão vem nas observações
  const feitas = new Set();
  meusVoos.forEach((v) => codigosDoExercicio((v.obs || '') + ' ' + (v.exercicios || []).join(' ')).forEach((c) => feitas.add(c)));
  const todas = FIP.fases.flatMap((f) => f.missoes), nFeitas = todas.filter((m) => feitas.has(m.cod)).length;
  const prox = todas.find((m) => !feitas.has(m.cod));
  const prevMin = todas.reduce((s, m) => s + m.min, 0), feitoMin = todas.filter((m) => feitas.has(m.cod)).reduce((s, m) => s + m.min, 0);
  const prep = (m) => { const p = m.preparo; if (!p) return '';
    return `<div class="tp-int"><b>Preparo para esta missão</b>
      <p>${esc(p.objetivo)}</p>${p.pre ? `<p class="sub">Pré-requisito: ${esc(p.pre)}</p>` : ''}
      ${p.exercicios ? `<b>O que vai ser avaliado</b><ul>${p.exercicios.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${p.tolerancias ? `<b>Tolerâncias</b><ul>${p.tolerancias.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${p.bizus ? `<b>Bizu</b><ul>${p.bizus.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${p.video ? `<div class="links"><a href="${yt(p.video)}" target="_blank" rel="noopener">▶ Vídeos sobre a missão</a></div>` : ''}</div>`; };
  const fase = (f) => { const ok = f.missoes.filter((m) => feitas.has(m.cod)).length;
    return `<details class="mat-grupo" ${f.missoes.some((m) => m.preparo && !feitas.has(m.cod)) ? 'open' : ''}><summary>Fase ${f.n} · ${esc(f.nome)} <span class="selo ${ok === f.missoes.length ? 'ok' : ok ? 'al' : 'la'}">${ok}/${f.missoes.length}</span></summary>
      ${f.missoes.map((m) => { const d = feitas.has(m.cod);
        return `<div class="tp-est"><div class="cab"><b>${d ? '✓ ' : ''}${esc(m.cod)}</b><span class="sub">${m.tipo === 'SOLO' ? 'solo' : 'duplo comando'} · ${hmin(m.min)}${m.pousos ? ' · ' + m.pousos + ' pousos' : ''}${m.endosso ? ' · endosso' : ''}${m.obs ? ' · ' + esc(m.obs) : ''}</span></div>${prep(m)}</div>`; }).join('')}</details>`; };
  return `<div class="cab"><h2>FIP · o curso inteiro</h2><span class="selo ${nFeitas ? 'al' : 'la'}">${nFeitas} de ${todas.length} missões</span></div>
  <p class="intro">O Programa de Instrução do PPH: tudo o que a turma tem pela frente até o fim do curso, fase por fase. As missões que você já cumpriu são marcadas pelos seus próprios voos do Diário, pelo código da missão nas observações (ex.: INCT-01, TMS-01/02).</p>
  <div class="caixa destaque"><div class="barra"><i style="width:${Math.round(feitoMin / prevMin * 100)}%"></i></div>
    <p class="sub">${prox ? `Sua próxima missão: <b>${esc(prox.cod)}</b> · ${prox.tipo === 'SOLO' ? 'solo' : 'duplo comando'} · ${hmin(prox.min)}${prox.endosso ? ' · voo de endosso' : ''}` : 'Todas as missões cumpridas.'}
      <br>Previsto na FIP: <b>${hmin(prevMin)}</b> · você cumpriu: <b>${hmin(feitoMin)}</b>.</p></div>
  ${FIP.fases.map(fase).join('')}
  <div class="caixa"><h3>A FIP em papel</h3>
    <p class="sub">Resumo em PDF para imprimir ou levar: o programa de instrução, uma ficha de avaliação de exemplo (frente e verso) e a Declaração de Realização de Voo Solo. As fichas das outras missões cada um recebe da escola.</p>
    <div class="links"><a class="pdf" href="fip-pph-resumo.pdf" target="_blank" rel="noopener">📄 FIP: programa, ficha modelo e declaração</a></div></div>
  <p class="sub">${esc(FIP.rodape || '')}</p>`;
},
/*@ACESSOS@*/
};

/*@METAR@*/

// ---------- ligações ----------
const LIGAR = {
  inicio(c){
    c.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); irPara(b.dataset.ir); })); ckAbrir(c);
    $('#novOk')?.addEventListener('click', () => { novMarcar(); render(); });
    ligarPix(c, { db, uid: user.uid, quem: membro.nome, gastos: () => gastos, toast, depois: (v, trocar) => { if (v) membro.pix = v; trocandoPix = !!trocar; render(); } });
    resumoInicio($('#tpInicio'));
    LIGAR.linkTurma();
    c.querySelectorAll('[data-dia]').forEach((b) => b.onclick = () => {
      const iso = b.dataset.dia;
      if (b.dataset.voou) return marcarDia(iso, { voou: true, motivo: '', outro: '' });
      if (b.dataset.motivo === 'outro') { diaOutro = iso; render(); return $('#diaOutroTxt')?.focus(); }
      marcarDia(iso, { voou: false, motivo: b.dataset.motivo, outro: '' });
    });
    c.querySelectorAll('[data-dia-outro]').forEach((b) => b.onclick = () => marcarDia(b.dataset.diaOutro, { voou: false, motivo: 'outro', outro: limpar($('#diaOutroTxt').value, 60) }));
    c.querySelectorAll('[data-dia-mudar]').forEach((b) => b.onclick = async () => { try { await deleteDoc(doc(db, 'diario', user.uid, 'dias', b.dataset.diaMudar)); } catch (e) { toast('Não deu: ' + (e.code || e.message)); } });
  },
  compras(c){ ligarCompras(c, { db, user: () => user, membro: () => membro, compras: () => compras, toast, render: () => { if (aba === 'compras') render(); } }); },
  provas(c){ ligarProvas(c, ctxProvas); },
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
