// Gastos da turma (curso de PPH). Cada um entra com o próprio Google e todos do grupo veem e lançam os gastos.
// Banco (Firestore): gastosConvites/{codigo} = grupo (nome, pessoas[]); quem tem o código entra no grupo.
//                    gastosMembros/{uid} = quem entrou (nome no grupo, e-mail, código).
//                    gastos/{id} = um gasto: valor em centavos, quem pagou ('' = cada um pagou a sua parte),
//                    participantes[] (dividem em partes iguais) e quitados[] (já acertaram com quem pagou).
// Regras em firestore.rules: só membros leem e gravam.
import '../embutido.js';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { entrarGoogle, navegadorRuim, avisoNavegador, ligarAviso } from '../entrar-google.js';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc, collection, onSnapshot, serverTimestamp, writeBatch, arrayUnion, deleteField } from 'firebase/firestore';
import { FIREBASE_CONFIG, ADMINS } from '../firebase-config.js';
import { nomesOcupados, opcoesNomes, entrarComNome, erroNome } from './nomes.js';
import { brl, partes, calcular, caixaPix, ligarPix, digitandoPix, hojeIso as hojeContas } from './contas.js';
import { seletor, telaMeu, telaTurma, ehPessoal } from './telas.js';
import { suportaVoz, ouvir, interpretar } from './voz.js';
import { limpar, limparNome, formatarDinheiro, dataValida, hojeIso, celulaCsv, ligarMascaras } from '../entrada.js';

const app = initializeApp(FIREBASE_CONFIG), auth = getAuth(app), db = getFirestore(app);
auth.languageCode = 'pt';
const $ = (s, r = document) => r.querySelector(s);
const el = $('#app');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const dBR = (iso) => iso ? iso.split('-').reverse().join('/') : '';
const centavos = (s) => { const t = String(s).trim().replace(/[R$\s]/g, ''); const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t); return Number.isFinite(n) ? Math.round(n * 100) : NaN; };

const CATEGORIAS = { transporte: 'Transporte (Uber, táxi)', carro: 'Carro (aluguel, combustível)', passagem: 'Passagem', hospedagem: 'Hospedagem', alimentacao: 'Alimentação (restaurante, lanche)', mercado: 'Mercado (supermercado)', lazer: 'Lazer e diversão', casa: 'Casa (contas, limpeza)', curso: 'Escola e curso', material: 'Material', outros: 'Outros' };
const PESSOAS_INICIAIS = ['Juan', 'Loureiro', 'Paulo Henrique', 'Meira'];
const NOME_GRUPO = 'Turma PPH · EACAR 2026';
const CHAVE_CODIGO = 'gastos-codigo';
// Lançados uma vez, quando o grupo é criado (o que a turma gastou antes da página existir).
const GASTOS_INICIAIS = [
  { id: '2026-11-02-uber1', data: '2026-11-02', descricao: 'Uber 1', categoria: 'transporte', valor: 8000, pagoPor: 'Loureiro', participantes: PESSOAS_INICIAIS, quitados: [], obs: '' },
  { id: '2026-11-02-uber2', data: '2026-11-02', descricao: 'Uber 2', categoria: 'transporte', valor: 8000, pagoPor: 'Meira', participantes: PESSOAS_INICIAIS, quitados: [], obs: '' },
  { id: '2026-11-03-cafe', data: '2026-11-03', descricao: 'Café da manhã', categoria: 'alimentacao', valor: 16000, pagoPor: '', participantes: PESSOAS_INICIAIS, quitados: [], obs: 'cerca de R$ 40 por pessoa' },
];

let user = null, membro = null, grupo = null, gastos = [], membros = [], parar = [], editando = null, filtro = 'todos', filtroMeu = 'todos';
// 'meu' (o que é meu) ou 'turma' (o coletivo); a última escolha fica guardada neste aparelho
let visao = (() => { try { return localStorage.getItem('gastos-visao') === 'turma' ? 'turma' : 'meu'; } catch { return 'meu'; } })();
// gastos que esta pessoa pode ver: os da turma e os só dela (os só dos outros ficam de fora)
const visiveis = () => gastos.filter((g) => !ehPessoal(g) || g.pagoPor === membro?.nome);

function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
const pararTudo = () => { parar.forEach((f) => f()); parar = []; };
const ehAdmin = () => !!user?.email && ADMINS.includes(user.email);

const daUrl = new URLSearchParams(location.search).get('c');
if (daUrl) { try { localStorage.setItem(CHAVE_CODIGO, daUrl); } catch {} history.replaceState(null, '', location.pathname); }
const codigoGuardado = () => { try { return localStorage.getItem(CHAVE_CODIGO); } catch { return null; } };

onAuthStateChanged(auth, async (u) => {
  user = u; pararTudo(); membro = null; grupo = null; gastos = []; membros = [];
  topo();
  if (!u) return telaLogin();
  try { const s = await getDoc(doc(db, 'gastosMembros', u.uid)); membro = s.exists() ? s.data() : null; }
  catch (e) { return erroGeral('Não foi possível abrir o grupo', e); }
  if (!membro) return telaEntrar(daUrl || codigoGuardado());
  abrirGrupo();
});

function erroGeral(t, e) { el.innerHTML = `<div class="cartao"><p class="erro">${esc(t)} (${esc(e.code || e.message)}). Recarregue a página.</p></div>`; }

function abrirGrupo() {
  topo();
  parar.push(onSnapshot(doc(db, 'gastosConvites', membro.codigo), (s) => { grupo = s.data() || { grupo: NOME_GRUPO, pessoas: [] }; if (!editando && !digitandoPix()) telaPrincipal(); }, (e) => erroGeral('Erro ao ler o grupo', e)));
  parar.push(onSnapshot(collection(db, 'gastosMembros'), (s) => { membros = s.docs.map((d) => d.data()); if (!editando && grupo && !digitandoPix()) telaPrincipal(); }, () => {}));
  parar.push(onSnapshot(collection(db, 'gastos'), (s) => {
    gastos = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.data + (b.criadoMs || 0)).localeCompare(a.data + (a.criadoMs || 0)));
    if (!editando && grupo && !digitandoPix()) telaPrincipal();
  }, (e) => erroGeral('Erro ao ler os gastos', e)));
}

function topo() {
  const t = $('#contaTopo');
  t.innerHTML = user ? `<span>${esc(membro?.nome || user.displayName || user.email)}</span><button class="mini" id="btSair">Sair</button>` : '';
  $('#btSair')?.addEventListener('click', () => signOut(auth));
}

function telaLogin(erro) {
  el.innerHTML = `<section class="cartao login"><h2>Entre com a sua conta Google</h2>
    <p class="sub">É o mesmo login do Simulador Heli e do Diário de voo.</p>
    <button class="pri" id="btEntrar">Entrar com Google</button>${erro && erro !== 'navegador' ? `<p class="erro">${esc(erro)}</p>` : ''}${avisoNavegador(erro === 'navegador' || navegadorRuim())}</section>
    <section class="cartao"><h3>Para que serve</h3><p>Cada um lança o que gastou no curso (Uber, comida, hospedagem…), com quem dividiu. A página mostra quem ainda deve para quem, deixa marcar quando a pessoa pagou e soma o total gasto no curso.</p></section>`;
  ligarAviso();
  $('#btEntrar').onclick = async () => { const r = await entrarGoogle(auth); if (r) telaLogin(r); };
}

async function telaEntrar(codigo, erro) {
  let convite = null;
  if (codigo) { try { const s = await getDoc(doc(db, 'gastosConvites', codigo)); convite = s.exists() ? s.data() : null; } catch {} }
  if (!convite) {
    el.innerHTML = `<section class="cartao"><h2>Entrar no grupo de gastos</h2>
      ${codigo ? '<p class="erro">Este código não é de nenhum grupo. Confira o link.</p>' : '<p class="sub">Abra o link do grupo que o Juan mandou, ou cole aqui o código.</p>'}
      <form id="fCod" class="form"><label class="largo">Código do grupo<input id="cCod" required data-m="codigo" maxlength="300"></label><div class="largo linha-acao"><button class="pri" type="submit">Continuar</button></div></form>
      ${ehAdmin() ? '<div class="dica">Você é o administrador. Se o grupo ainda não existe, crie agora: o link de convite aparece na página depois.</div><div class="linha-acao"><button id="btCriar">Criar o grupo</button></div>' : ''}</section>`;
    ligarMascaras(el);
    $('#fCod').onsubmit = (e) => { e.preventDefault(); const c = $('#cCod').value.trim().replace(/.*[?&]c=/, '').replace(/[&#].*$/, '').replace(/[^\w-]/g, '').slice(0, 64); if (!c) return; try { localStorage.setItem(CHAVE_CODIGO, c); } catch {} telaEntrar(c); };
    $('#btCriar')?.addEventListener('click', criarGrupo);
    return;
  }
  const ocup = await nomesOcupados(db, codigo, convite.pessoas, user.uid);
  el.innerHTML = `<section class="cartao"><h2>${esc(convite.grupo)}</h2>
    <p class="sub">Quem é você no grupo? Esse nome aparece nos gastos e nos acertos.</p>
    <form id="fEntrar" class="form">
      <label class="largo">Seu nome<select id="eNome">${opcoesNomes(convite.pessoas, ocup)}</select></label>
      <label class="largo" id="eOutroL" hidden>Nome (como a turma te chama)<input id="eOutro" data-m="nome" maxlength="24"></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Entrar no grupo</button></div>
    </form><p class="erro">${esc(erro || '')}</p></section>`;
  const sel = $('#eNome');
  const outro = () => { $('#eOutroL').hidden = sel.value !== ''; }; sel.onchange = outro; outro();
  ligarMascaras(el);
  $('#fEntrar').onsubmit = async (e) => {
    e.preventDefault();
    if (sel.value === '?' || !sel.value && !$('#eOutro').value.trim()) return telaEntrar(codigo, 'Escolha o seu nome na lista.');
    const nome = limparNome(sel.value || $('#eOutro').value, 24);
    if (nome.length < 2) return telaEntrar(codigo, 'Escreva o seu nome.');
    try {
      await entrarComNome(db, user, codigo, nome, convite.pessoas);
      membro = { nome, email: user.email, codigo }; toast('Você entrou no grupo'); abrirGrupo();
    } catch (e2) { telaEntrar(codigo, erroNome(e2)); }
  };
}

async function criarGrupo() {
  const b = new Uint8Array(9); crypto.getRandomValues(b);
  const codigo = Array.from(b, (x) => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('').replace(/(.{4})(?=.)/g, '$1-');
  try {
    await setDoc(doc(db, 'gastosConvites', codigo), { grupo: NOME_GRUPO, pessoas: PESSOAS_INICIAIS, criadoEm: serverTimestamp() });
    const lote = writeBatch(db);
    GASTOS_INICIAIS.forEach(({ id, ...g }, i) => lote.set(doc(db, 'gastos', id), { ...g, criadoPor: 'Juan', criadoMs: Date.now() + i, criadoEm: serverTimestamp() }, { merge: true }));
    await lote.commit();
    try { localStorage.setItem(CHAVE_CODIGO, codigo); } catch {}
    telaEntrar(codigo);
  } catch (e) { toast('Não criou: ' + (e.code || e.message)); }
}

// ---------- telas ----------
function telaPrincipal(trocandoPix = false) {
  editando = null;
  const eu = membro.nome;
  const link = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}hangar.html?c=${membro.codigo}`;
  const pix = caixaPix(membro, trocandoPix);
  const ctx = { eu, gastos, membros, grupo, CATEGORIAS, admin: ehAdmin(), filtro, filtroMeu, hoje: hoje() };
  el.innerHTML = `${pix ? `<section class="cartao">${pix}</section>` : ''}<section class="cartao seg-cartao">${seletor(visao)}</section>
    ${visao === 'meu' ? telaMeu(ctx) : telaTurma(ctx) + `<section class="cartao"><h3>Convidar a turma</h3>
      <p class="sub">É o link do Hangar da Turma (estudo, materiais, gastos e diário num lugar só). Cada um entra com o próprio Google e escolhe o nome.</p>
      <div class="codigo">${esc(link)}</div>
      <div class="linha-acao"><button id="btLink">${navigator.share ? 'Compartilhar link' : 'Copiar link'}</button></div>
      <form id="fPessoa" class="form"><label>Acrescentar pessoa<input id="nPessoa" data-m="nome" maxlength="24" placeholder="Nome"></label><div class="linha-acao" style="align-items:end"><button type="submit">Acrescentar</button></div></form>
    </section>`}`;
  ligarPix(el, { db, uid: user.uid, quem: eu, gastos: () => gastos, toast, depois: (v, trocar) => { if (v) membro.pix = v; telaPrincipal(!!trocar); } });
  el.querySelectorAll('[data-visao]').forEach((b) => b.onclick = () => { visao = b.dataset.visao; try { localStorage.setItem('gastos-visao', visao); } catch {} telaPrincipal(); });
  el.querySelectorAll('[data-fm]').forEach((b) => b.onclick = () => { filtroMeu = b.dataset.fm; telaPrincipal(); });
  el.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filtro = b.dataset.f; telaPrincipal(); });
  $('#btNovo').onclick = () => telaGasto(null);
  $('#btNovoMeu')?.addEventListener('click', () => telaGasto(null, true));
  $('#btFalar')?.addEventListener('click', () => telaGasto(null, true, true));
  el.querySelectorAll('[data-ed]').forEach((b) => b.onclick = () => telaGasto(gastos.find((g) => g.id === b.dataset.ed)));
  el.querySelectorAll('[data-parte]').forEach((b) => b.onclick = () => alternarQuitado(b.dataset.parte, b.dataset.nome));
  el.querySelectorAll('[data-aviso]').forEach((b) => b.onclick = () => alternarInformado(b.dataset.aviso, b.dataset.nome));
  $('#btCsv')?.addEventListener('click', baixarCsv); $('#btCopiar')?.addEventListener('click', () => copiar(resumo(), 'Resumo copiado'));
  $('#btLink')?.addEventListener('click', () => navigator.share ? navigator.share({ title: 'Gastos da turma', text: 'Controle de gastos do curso de PPH. Entre com o seu Google:', url: link }).catch(() => {}) : copiar(link, 'Link copiado'));
  ligarMascaras(el);
  $('#fPessoa')?.addEventListener('submit', async (e) => { e.preventDefault(); const n = limparNome($('#nPessoa').value, 24); if (n.length < 2) { toast('Escreva um nome com pelo menos 2 letras.'); return; } try { await updateDoc(doc(db, 'gastosConvites', membro.codigo), { pessoas: arrayUnion(n) }); toast(n + ' acrescentado'); } catch (e2) { toast('Não salvou: ' + (e2.code || e2.message)); } });
}

async function alternarInformado(id, nome) {
  const g = gastos.find((x) => x.id === id); if (!g) return;
  const q = new Set(g.informados || []); const avisa = !q.has(nome); avisa ? q.add(nome) : q.delete(nome);
  try { await updateDoc(doc(db, 'gastos', id), { informados: [...q], atualizadoPor: membro.nome, atualizadoEm: serverTimestamp() }); toast(avisa ? `${g.pagoPor} vai confirmar quando receber` : 'Aviso desfeito'); }
  catch (e) { toast('Não salvou: ' + (e.code || e.message)); }
}

async function alternarQuitado(id, nome) {
  const g = gastos.find((x) => x.id === id); if (!g) return;
  const q = new Set(g.quitados || []); const pago = !q.has(nome); pago ? q.add(nome) : q.delete(nome);
  try { await setDoc(doc(db, 'gastos', id), { quitados: [...q], quitadosEm: { [nome]: pago ? hojeContas() : deleteField() }, atualizadoPor: membro.nome, atualizadoEm: serverTimestamp() }, { merge: true }); toast(pago ? `${nome}: recebido, quitado` : `${nome}: voltou para pendente`); }
  catch (e) { toast('Não salvou: ' + (e.code || e.message)); }
}

function telaGasto(g, soMeu = false, falar = false) {
  editando = g ? g.id : 'novo';
  const pessoas = [...new Set([...(grupo.pessoas || []), ...(g?.participantes || [])])];
  soMeu = g ? ehPessoal(g) : soMeu;
  g = g || { data: hoje(), categoria: 'alimentacao', pagoPor: membro.nome, participantes: soMeu ? [membro.nome] : pessoas, quitados: [] };
  const part = new Set(g.participantes || []);
  el.innerHTML = `<section class="cartao"><div class="cab"><h2>${g.id ? 'Editar gasto' : 'Novo gasto'}</h2><button type="button" id="gVoltar">Voltar</button></div>
    <div class="voz"><button type="button" id="gFalar">🎤 Falar o gasto</button><span class="sub" id="gOuvido">Fale assim: "almoço 42 e 50", "uber 38 reais", "mercado 120 ontem". Depois confira e salve.</span></div>
    <form id="fGasto" class="form">
      <label class="largo">Com o que foi o gasto<input id="gDesc" required data-m="texto" maxlength="80" value="${esc(g.descricao)}" placeholder="Ex.: Uber aeroporto → hotel"></label>
      <label>Data<input id="gData" type="date" required min="2020-01-01" max="${hojeIso(365)}" value="${esc(g.data)}"></label>
      <label>Valor total (R$)<input id="gValor" required data-m="dinheiro" value="${g.valor != null ? esc(((g.valor || 0) / 100).toFixed(2).replace('.', ',')) : ''}" placeholder="0,00"></label>
      <label>Categoria<select id="gCat">${Object.entries(CATEGORIAS).map(([k, t]) => `<option value="${k}" ${k === g.categoria ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="largo so-meu"><span class="chk"><input type="checkbox" id="gSoMeu" ${soMeu ? 'checked' : ''}> <b>Só meu</b> <span class="sub">(gasto pessoal: não divide com a turma e só você vê)</span></span></label>
      <label class="divide">Quem pagou<select id="gPagou">${pessoas.map((p) => `<option ${p === g.pagoPor ? 'selected' : ''}>${esc(p)}</option>`).join('')}<option value="" ${g.pagoPor === '' ? 'selected' : ''}>Cada um pagou a sua parte</option></select></label>
      <div class="largo divide"><h3 style="margin-bottom:6px">Dividido entre (partes iguais)</h3><div class="chips" id="gPart">${pessoas.map((p) => `<button type="button" class="chip" aria-pressed="${part.has(p)}" data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div></div>
      <div class="largo dica divide" id="gCalc"></div>
      <label class="largo">Observação<input id="gObs" data-m="texto" maxlength="120" value="${esc(g.obs)}"></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Salvar gasto</button>${g.id ? '<button type="button" class="perigo" id="gApagar">Apagar</button>' : ''}</div>
    </form><p class="erro" id="gErro"></p></section>`;
  const escolhidos = () => $('#gSoMeu').checked ? [membro.nome] : [...el.querySelectorAll('#gPart [aria-pressed="true"]')].map((b) => b.dataset.p);
  const modo = () => { const sm = $('#gSoMeu').checked; el.querySelectorAll('.divide').forEach((x) => { x.hidden = sm; }); if (sm) $('#gPagou').value = membro.nome; };
  $('#gSoMeu').onchange = modo; modo();
  const calc = () => { const v = centavos($('#gValor').value), n = escolhidos().length; $('#gCalc').textContent = Number.isFinite(v) && v > 0 && n ? `${n} pessoa(s): ${brl(Math.floor(v / n))} para cada.` : 'Escolha quem dividiu o gasto.'; };
  $('#gPart').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); calc(); } };
  ligarMascaras(el);
  $('#gValor').addEventListener('input', calc); calc();
  // ---- falar o gasto ----
  let pararVoz = null;
  const falarAgora = () => {
    const bt = $('#gFalar'), msg = $('#gOuvido'); if (!bt || !msg) return;
    if (pararVoz) { pararVoz(); return; }
    if (!suportaVoz()) { msg.textContent = 'Este navegador não tem reconhecimento de voz. No celular, use o Chrome (Android) ou o Safari (iPhone).'; return; }
    bt.classList.add('ouvindo'); bt.textContent = '⏹ Ouvindo… toque para parar'; msg.textContent = 'Pode falar.';
    const fim = () => { pararVoz = null; bt.classList.remove('ouvindo'); bt.textContent = '🎤 Falar de novo'; };
    pararVoz = ouvir({
      onParcial: (t) => { msg.textContent = '“' + t + '”'; },
      onErro: (e) => { fim(); msg.textContent = e; },
      onFim: (t) => {
        fim(); if (!t) { msg.textContent = 'Não ouvi nada. Toque no microfone e fale logo em seguida.'; return; }
        const r = interpretar(t, CATEGORIAS);
        if (r.descricao) $('#gDesc').value = r.descricao;
        if (Number.isFinite(r.valor) && r.valor > 0) $('#gValor').value = (r.valor / 100).toFixed(2).replace('.', ',');
        $('#gCat').value = r.categoria;
        if (typeof r.data === 'number') $('#gData').value = hojeIso(r.data);
        if (r.soMeu) { $('#gSoMeu').checked = true; modo(); }
        calc();
        msg.innerHTML = `Entendi: “${esc(t)}” → <b>${esc($('#gDesc').value || '?')}</b>, <b>${$('#gValor').value ? 'R$ ' + esc($('#gValor').value) : 'valor?'}</b>, ${esc(CATEGORIAS[r.categoria].split(' (')[0])}, ${dBR($('#gData').value)}${$('#gSoMeu').checked ? ', só meu' : ''}. ${r.confianca === 'alta' ? 'Confira e toque em <b>Salvar</b>.' : 'Complete o que faltou e salve.'}`;
        ($('#gValor').value ? $('#gDesc') : $('#gValor')).focus();
      },
    });
  };
  $('#gFalar').onclick = falarAgora;
  if (falar) falarAgora();
  $('#gVoltar').onclick = telaPrincipal;
  $('#gApagar')?.addEventListener('click', async () => { if (!confirm('Apagar este gasto para todo mundo?')) return; await deleteDoc(doc(db, 'gastos', g.id)); toast('Gasto apagado'); telaPrincipal(); });
  $('#fGasto').onsubmit = async (e) => {
    e.preventDefault();
    const soMeuAgora = $('#gSoMeu').checked, participantes = soMeuAgora ? [membro.nome] : escolhidos().filter((p) => pessoas.includes(p)), pagoPor = soMeuAgora ? membro.nome : pessoas.includes($('#gPagou').value) ? $('#gPagou').value : '', valor = centavos(formatarDinheiro($('#gValor').value));
    const d = { descricao: limpar($('#gDesc').value, 80), data: $('#gData').value, valor, categoria: CATEGORIAS[$('#gCat').value] ? $('#gCat').value : 'outros', pagoPor, participantes,
      quitados: (g.quitados || []).filter((p) => participantes.includes(p) && p !== pagoPor), obs: limpar($('#gObs').value, 120), atualizadoPor: membro.nome, atualizadoEm: serverTimestamp() };
    if (!d.descricao) { $('#gErro').textContent = 'Diga com o que foi o gasto.'; return; }
    if (!dataValida(d.data, '2020-01-01', hojeIso(365))) { $('#gErro').textContent = 'Informe uma data válida.'; return; }
    if (!Number.isFinite(valor) || valor <= 0) { $('#gErro').textContent = 'Valor inválido. Use, por exemplo, 80,00.'; return; }
    if (valor > 10000000) { $('#gErro').textContent = 'Valor alto demais (máximo R$ 100.000,00). Confira a vírgula.'; return; }
    if (!participantes.length) { $('#gErro').textContent = 'Escolha quem dividiu o gasto.'; return; }
    const id = g.id || (d.data + '-' + Math.random().toString(36).slice(2, 8));
    try { await setDoc(doc(db, 'gastos', id), g.id ? d : { ...d, criadoPor: membro.nome, criadoMs: Date.now(), criadoEm: serverTimestamp() }, { merge: true }); toast(soMeuAgora ? 'Gasto só seu salvo' : 'Gasto salvo'); telaPrincipal(); }
    catch (e2) { $('#gErro').textContent = 'Não salvou: ' + (e2.code || e2.message); }
  };
}

// ---------- exportar ----------
function resumo() {
  const lista = visiveis().filter((g) => !ehPessoal(g)), r = calcular(lista);
  return `${grupo.grupo}: total ${brl(r.total)} em ${lista.length} gasto(s) em comum.\n` +
    (r.acertos.length ? 'Acertos pendentes:\n' + r.acertos.map((a) => `• ${a.de} deve ${brl(a.valor)} a ${a.para}`).join('\n') : 'Tudo acertado.') +
    `\n\nGastos:\n` + [...lista].reverse().map((g) => `${dBR(g.data)} ${g.descricao}: ${brl(g.valor)} (${g.pagoPor ? 'pago por ' + g.pagoPor : 'cada um pagou o seu'})`).join('\n');
}
function baixarCsv() {
  const q = celulaCsv;
  const linhas = [['Data', 'Descrição', 'Categoria', 'Valor', 'Pago por', 'Dividido entre', 'Valor por pessoa', 'Pendentes', 'Observação'].map(q).join(';'),
    ...[...visiveis()].reverse().map((g) => { const ps = partes(g); return [dBR(g.data), g.descricao, CATEGORIAS[g.categoria], ((g.valor || 0) / 100).toFixed(2).replace('.', ','), g.pagoPor || 'Cada um o seu', (g.participantes || []).join(', '), ps.length ? (ps[0].valor / 100).toFixed(2).replace('.', ',') : '', ps.filter((p) => !p.quitado).map((p) => p.nome).join(', '), g.obs].map(q).join(';'); })];
  const b = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = `gastos-turma-pph-${hoje()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function copiar(t, msg) { navigator.clipboard.writeText(t).then(() => toast(msg), () => toast('Não deu para copiar')); }
