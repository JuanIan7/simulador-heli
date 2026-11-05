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
import { getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc, collection, onSnapshot, serverTimestamp, writeBatch, arrayUnion } from 'firebase/firestore';
import { FIREBASE_CONFIG, ADMINS } from '../firebase-config.js';
import { brl, partes, calcular, pixDe, caixaPix, ligarPix, digitandoPix } from './contas.js';

const app = initializeApp(FIREBASE_CONFIG), auth = getAuth(app), db = getFirestore(app);
auth.languageCode = 'pt';
const $ = (s, r = document) => r.querySelector(s);
const el = $('#app');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const dBR = (iso) => iso ? iso.split('-').reverse().join('/') : '';
const centavos = (s) => { const t = String(s).trim().replace(/[R$\s]/g, ''); const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t); return Number.isFinite(n) ? Math.round(n * 100) : NaN; };

const CATEGORIAS = { transporte: 'Transporte (Uber, táxi)', passagem: 'Passagem', hospedagem: 'Hospedagem', alimentacao: 'Alimentação', curso: 'Escola e curso', material: 'Material', outros: 'Outros' };
const PESSOAS_INICIAIS = ['Juan', 'Loureiro', 'Paulo Henrique', 'Meira'];
const NOME_GRUPO = 'Turma PPH · EACAR 2026';
const CHAVE_CODIGO = 'gastos-codigo';
// Lançados uma vez, quando o grupo é criado (o que a turma gastou antes da página existir).
const GASTOS_INICIAIS = [
  { id: '2026-11-02-uber1', data: '2026-11-02', descricao: 'Uber 1', categoria: 'transporte', valor: 8000, pagoPor: 'Loureiro', participantes: PESSOAS_INICIAIS, quitados: [], obs: '' },
  { id: '2026-11-02-uber2', data: '2026-11-02', descricao: 'Uber 2', categoria: 'transporte', valor: 8000, pagoPor: 'Meira', participantes: PESSOAS_INICIAIS, quitados: [], obs: '' },
  { id: '2026-11-03-cafe', data: '2026-11-03', descricao: 'Café da manhã', categoria: 'alimentacao', valor: 16000, pagoPor: '', participantes: PESSOAS_INICIAIS, quitados: [], obs: 'cerca de R$ 40 por pessoa' },
];

let user = null, membro = null, grupo = null, gastos = [], membros = [], parar = [], editando = null, filtro = 'todos';

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
      <form id="fCod" class="form"><label class="largo">Código do grupo<input id="cCod" required autocomplete="off"></label><div class="largo linha-acao"><button class="pri" type="submit">Continuar</button></div></form>
      ${ehAdmin() ? '<div class="dica">Você é o administrador. Se o grupo ainda não existe, crie agora: o link de convite aparece na página depois.</div><div class="linha-acao"><button id="btCriar">Criar o grupo</button></div>' : ''}</section>`;
    $('#fCod').onsubmit = (e) => { e.preventDefault(); const c = $('#cCod').value.trim().replace(/.*[?&]c=/, ''); try { localStorage.setItem(CHAVE_CODIGO, c); } catch {} telaEntrar(c); };
    $('#btCriar')?.addEventListener('click', criarGrupo);
    return;
  }
  el.innerHTML = `<section class="cartao"><h2>${esc(convite.grupo)}</h2>
    <p class="sub">Quem é você no grupo? Esse nome aparece nos gastos e nos acertos.</p>
    <form id="fEntrar" class="form">
      <label class="largo">Seu nome<select id="eNome">${(convite.pessoas || []).map((p) => `<option>${esc(p)}</option>`).join('')}<option value="">Outro nome…</option></select></label>
      <label class="largo" id="eOutroL" hidden>Nome (como a turma te chama)<input id="eOutro" maxlength="24"></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Entrar no grupo</button></div>
    </form><p class="erro">${esc(erro || '')}</p></section>`;
  const sel = $('#eNome'); const prim = (user.displayName || '').split(' ')[0];
  const casa = [...sel.options].find((o) => o.value && prim && o.value.toLowerCase().startsWith(prim.toLowerCase()));
  if (casa) sel.value = casa.value;
  const outro = () => { $('#eOutroL').hidden = sel.value !== ''; }; sel.onchange = outro; outro();
  $('#fEntrar').onsubmit = async (e) => {
    e.preventDefault();
    const nome = (sel.value || $('#eOutro').value).trim();
    if (nome.length < 2) return telaEntrar(codigo, 'Escreva o seu nome.');
    try {
      await setDoc(doc(db, 'gastosMembros', user.uid), { nome, email: user.email, codigo, entrouEm: serverTimestamp() });
      if (!(convite.pessoas || []).includes(nome)) await updateDoc(doc(db, 'gastosConvites', codigo), { pessoas: arrayUnion(nome) });
      membro = { nome, email: user.email, codigo }; toast('Você entrou no grupo'); abrirGrupo();
    } catch (e2) { telaEntrar(codigo, 'Não deu para entrar: ' + (e2.code || e2.message)); }
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
  const eu = membro.nome, r = calcular(gastos), minha = r.pessoa[eu] || { parte: 0, deve: 0, receber: 0 };
  const pessoas = [...new Set([...(grupo.pessoas || []), ...Object.keys(r.pessoa)])];
  const lista = filtro === 'pendentes' ? gastos.filter((g) => partes(g).some((p) => !p.quitado)) : filtro === 'todos' ? gastos : gastos.filter((g) => g.categoria === filtro);
  const entrou = new Set(membros.map((m) => m.nome));
  const link = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}hangar.html?c=${membro.codigo}`;
  const pix = caixaPix(membro, trocandoPix);
  el.innerHTML = `${pix ? `<section class="cartao">${pix}</section>` : ''}
    <section class="cartao"><div class="cab"><div><h2>${esc(grupo.grupo)}</h2><div class="sub">${pessoas.length} pessoa(s) · ${gastos.length} gasto(s)</div></div>
      <button class="pri" id="btNovo">+ Novo gasto</button></div>
      <div class="totais">
        <div class="tot dest"><span>Total do curso</span><b>${brl(r.total)}</b><span>todos juntos</span></div>
        <div class="tot"><span>Por pessoa</span><b>${brl(pessoas.length ? r.total / pessoas.length : 0)}</b><span>média</span></div>
        <div class="tot"><span>Minha parte</span><b>${brl(minha.parte)}</b></div>
        <div class="tot"><span>Eu devo</span><b>${brl(minha.deve)}</b></div>
        <div class="tot"><span>A receber</span><b>${brl(minha.receber)}</b></div>
        <div class="tot"><span>Em aberto</span><b>${brl(r.pendente)}</b><span>na turma</span></div>
      </div>
    </section>
    <section class="cartao"><h3>Quem deve para quem</h3>
      ${r.acertos.length ? r.acertos.map((a) => `<div class="acerto"><span><b class="${a.de === eu ? 'eu' : ''}">${esc(a.de)}</b> deve <b class="v">${brl(a.valor)}</b> a <b class="${a.para === eu ? 'eu' : ''}">${esc(a.para)}</b></span><span class="linha-acao">${pixDe(membros, a.para) ? `<button class="mini" data-pix-copiar="${esc(pixDe(membros, a.para))}">Copiar Pix de ${esc(a.para)}</button>` : ''}<button class="mini" data-quitar="${esc(a.de)}|${esc(a.para)}">✓ Pago</button></span></div>`).join('')
        : '<div class="vazio">Ninguém deve nada a ninguém. Tudo acertado.</div>'}
      ${r.acertos.length ? `<div class="dica">Já compensa o que um deve ao outro. Pague pelo Pix (o botão copia a chave de quem recebe) e toque em "✓ Pago": quita todas as partes pendentes entre os dois. Para quitar só um gasto, toque no nome da pessoa no gasto.${membro.pix ? ` Sua chave Pix: <b>${esc(membro.pix)}</b> <button class="mini" data-pix-trocar>Trocar</button>` : ''}</div>` : ''}
    </section>
    <section class="cartao"><div class="cab"><h2>Gastos</h2></div>
      <div class="chips"><button class="chip" aria-pressed="${filtro === 'todos'}" data-f="todos">Todos</button><button class="chip" aria-pressed="${filtro === 'pendentes'}" data-f="pendentes">Com pendência</button>${Object.entries(CATEGORIAS).filter(([k]) => r.porCat[k]).map(([k, t]) => `<button class="chip" aria-pressed="${filtro === k}" data-f="${k}">${esc(t.split(' (')[0])}</button>`).join('')}</div>
      ${lista.length ? `<div>${lista.map((g) => cartaoGasto(g)).join('')}</div>` : `<div class="vazio">${gastos.length ? 'Nenhum gasto neste filtro.' : 'Nenhum gasto lançado ainda. Toque em <b>+ Novo gasto</b>.'}</div>`}
      ${gastos.length ? '<div class="linha-acao"><button id="btCsv">Baixar planilha (CSV)</button><button id="btCopiar">Copiar resumo</button></div>' : ''}
    </section>
    <section class="cartao"><h3>Por pessoa</h3>
      <div class="tabela"><table><thead><tr><th>Pessoa</th><th class="n">Parte nos gastos</th><th class="n">Já pagou</th><th class="n">Deve</th><th class="n">A receber</th></tr></thead><tbody>
        ${pessoas.map((n) => { const p = r.pessoa[n] || { parte: 0, desembolso: 0, deve: 0, receber: 0 }; return `<tr><td><b class="${n === eu ? 'eu' : ''}">${esc(n)}</b>${entrou.has(n) ? '' : ' <span class="sub">(não entrou)</span>'}</td><td class="n">${brl(p.parte)}</td><td class="n">${brl(p.desembolso)}</td><td class="n ${p.deve ? 'neg' : ''}">${brl(p.deve)}</td><td class="n ${p.receber ? 'pos' : ''}">${brl(p.receber)}</td></tr>`; }).join('')}
      </tbody></table></div>
      <h3>Por categoria</h3>
      <div class="tabela"><table><tbody>${Object.entries(CATEGORIAS).filter(([k]) => r.porCat[k]).map(([k, t]) => `<tr><td>${esc(t)}</td><td class="n">${brl(r.porCat[k])}</td></tr>`).join('') || '<tr><td class="sub">Sem gastos ainda.</td></tr>'}</tbody></table></div>
    </section>
    <section class="cartao"><h3>Convidar a turma</h3>
      <p class="sub">É o link do Hangar da Turma (estudo, materiais, gastos e diário num lugar só). Cada um entra com o próprio Google e escolhe o nome.</p>
      <div class="codigo">${esc(link)}</div>
      <div class="linha-acao"><button id="btLink">${navigator.share ? 'Compartilhar link' : 'Copiar link'}</button></div>
      <form id="fPessoa" class="form"><label>Acrescentar pessoa<input id="nPessoa" maxlength="24" placeholder="Nome"></label><div class="linha-acao" style="align-items:end"><button type="submit">Acrescentar</button></div></form>
    </section>`;
  ligarPix(el, { db, uid: user.uid, quem: eu, gastos: () => gastos, toast, depois: (v, trocar) => { if (v) membro.pix = v; telaPrincipal(!!trocar); } });
  $('#btNovo').onclick = () => telaGasto(null);
  el.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filtro = b.dataset.f; telaPrincipal(); });
  el.querySelectorAll('[data-ed]').forEach((b) => b.onclick = () => telaGasto(gastos.find((g) => g.id === b.dataset.ed)));
  el.querySelectorAll('[data-parte]').forEach((b) => b.onclick = () => alternarQuitado(b.dataset.parte, b.dataset.nome));
  $('#btCsv')?.addEventListener('click', baixarCsv); $('#btCopiar')?.addEventListener('click', () => copiar(resumo(r), 'Resumo copiado'));
  $('#btLink').onclick = () => navigator.share ? navigator.share({ title: 'Gastos da turma', text: 'Controle de gastos do curso de PPH. Entre com o seu Google:', url: link }).catch(() => {}) : copiar(link, 'Link copiado');
  $('#fPessoa').onsubmit = async (e) => { e.preventDefault(); const n = $('#nPessoa').value.trim(); if (n.length < 2) return; try { await updateDoc(doc(db, 'gastosConvites', membro.codigo), { pessoas: arrayUnion(n) }); toast(n + ' acrescentado'); } catch (e2) { toast('Não salvou: ' + (e2.code || e2.message)); } };
}

function cartaoGasto(g) {
  const ps = partes(g);
  return `<div class="gasto"><div class="linha1"><span class="desc">${esc(g.descricao)}</span><span class="valor">${brl(g.valor)}</span></div>
    <div class="sub">${dBR(g.data)} · ${esc(CATEGORIAS[g.categoria] || 'Outros')} · ${g.pagoPor ? 'pago por <b>' + esc(g.pagoPor) + '</b>' : 'cada um pagou a sua parte'} · ${ps.length} pessoa(s)${ps.length ? ', ' + brl(ps[0].valor) + ' cada' : ''}${g.obs ? ' · ' + esc(g.obs) : ''}</div>
    <div class="chips">${ps.map((p) => p.pagador ? `<span class="parte pagador">${esc(p.nome)} pagou</span>`
      : g.pagoPor ? `<button class="parte ${p.quitado ? 'pago' : 'deve'}" data-parte="${g.id}" data-nome="${esc(p.nome)}" title="Toque para ${p.quitado ? 'voltar para pendente' : 'marcar como pago'}">${p.quitado ? '✓ ' : ''}${esc(p.nome)} ${brl(p.valor)}${p.quitado ? '' : ' · deve'}</button>`
      : `<span class="parte pago">✓ ${esc(p.nome)} ${brl(p.valor)}</span>`).join('')}
      <button class="mini" data-ed="${g.id}">✏️ Editar</button></div></div>`;
}

async function alternarQuitado(id, nome) {
  const g = gastos.find((x) => x.id === id); if (!g) return;
  const q = new Set(g.quitados || []); const pago = !q.has(nome); pago ? q.add(nome) : q.delete(nome);
  try { await updateDoc(doc(db, 'gastos', id), { quitados: [...q], atualizadoPor: membro.nome, atualizadoEm: serverTimestamp() }); toast(pago ? `${nome}: pago` : `${nome}: voltou para pendente`); }
  catch (e) { toast('Não salvou: ' + (e.code || e.message)); }
}

function telaGasto(g) {
  editando = g ? g.id : 'novo';
  const pessoas = [...new Set([...(grupo.pessoas || []), ...(g?.participantes || [])])];
  g = g || { data: hoje(), categoria: 'alimentacao', pagoPor: membro.nome, participantes: pessoas, quitados: [] };
  const part = new Set(g.participantes || []);
  el.innerHTML = `<section class="cartao"><div class="cab"><h2>${g.id ? 'Editar gasto' : 'Novo gasto'}</h2><button type="button" id="gVoltar">Voltar</button></div>
    <form id="fGasto" class="form">
      <label class="largo">Com o que foi o gasto<input id="gDesc" required maxlength="80" value="${esc(g.descricao)}" placeholder="Ex.: Uber aeroporto → hotel"></label>
      <label>Data<input id="gData" type="date" required value="${esc(g.data)}"></label>
      <label>Valor total (R$)<input id="gValor" required inputmode="decimal" value="${g.valor != null ? esc(((g.valor || 0) / 100).toFixed(2).replace('.', ',')) : ''}" placeholder="0,00"></label>
      <label>Categoria<select id="gCat">${Object.entries(CATEGORIAS).map(([k, t]) => `<option value="${k}" ${k === g.categoria ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label>Quem pagou<select id="gPagou">${pessoas.map((p) => `<option ${p === g.pagoPor ? 'selected' : ''}>${esc(p)}</option>`).join('')}<option value="" ${g.pagoPor === '' ? 'selected' : ''}>Cada um pagou a sua parte</option></select></label>
      <div class="largo"><h3 style="margin-bottom:6px">Dividido entre (partes iguais)</h3><div class="chips" id="gPart">${pessoas.map((p) => `<button type="button" class="chip" aria-pressed="${part.has(p)}" data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div></div>
      <div class="largo dica" id="gCalc"></div>
      <label class="largo">Observação<input id="gObs" maxlength="120" value="${esc(g.obs)}"></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Salvar gasto</button>${g.id ? '<button type="button" class="perigo" id="gApagar">Apagar</button>' : ''}</div>
    </form><p class="erro" id="gErro"></p></section>`;
  const escolhidos = () => [...el.querySelectorAll('#gPart [aria-pressed="true"]')].map((b) => b.dataset.p);
  const calc = () => { const v = centavos($('#gValor').value), n = escolhidos().length; $('#gCalc').textContent = Number.isFinite(v) && v > 0 && n ? `${n} pessoa(s): ${brl(Math.floor(v / n))} para cada.` : 'Escolha quem dividiu o gasto.'; };
  $('#gPart').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); calc(); } };
  $('#gValor').oninput = calc; calc();
  $('#gVoltar').onclick = telaPrincipal;
  $('#gApagar')?.addEventListener('click', async () => { if (!confirm('Apagar este gasto para todo mundo?')) return; await deleteDoc(doc(db, 'gastos', g.id)); toast('Gasto apagado'); telaPrincipal(); });
  $('#fGasto').onsubmit = async (e) => {
    e.preventDefault();
    const participantes = escolhidos(), pagoPor = $('#gPagou').value, valor = centavos($('#gValor').value);
    const d = { descricao: $('#gDesc').value.trim(), data: $('#gData').value, valor, categoria: $('#gCat').value, pagoPor, participantes,
      quitados: (g.quitados || []).filter((p) => participantes.includes(p) && p !== pagoPor), obs: $('#gObs').value.trim(), atualizadoPor: membro.nome, atualizadoEm: serverTimestamp() };
    if (!d.descricao) { $('#gErro').textContent = 'Diga com o que foi o gasto.'; return; }
    if (!Number.isFinite(valor) || valor <= 0) { $('#gErro').textContent = 'Valor inválido. Use, por exemplo, 80,00.'; return; }
    if (!participantes.length) { $('#gErro').textContent = 'Escolha quem dividiu o gasto.'; return; }
    const id = g.id || (d.data + '-' + Math.random().toString(36).slice(2, 8));
    try { await setDoc(doc(db, 'gastos', id), g.id ? d : { ...d, criadoPor: membro.nome, criadoMs: Date.now(), criadoEm: serverTimestamp() }, { merge: true }); toast('Gasto salvo'); telaPrincipal(); }
    catch (e2) { $('#gErro').textContent = 'Não salvou: ' + (e2.code || e2.message); }
  };
}

// ---------- exportar ----------
function resumo(r) {
  return `${grupo.grupo}: total ${brl(r.total)} em ${gastos.length} gasto(s).\n` +
    (r.acertos.length ? 'Acertos pendentes:\n' + r.acertos.map((a) => `• ${a.de} deve ${brl(a.valor)} a ${a.para}`).join('\n') : 'Tudo acertado.') +
    `\n\nGastos:\n` + [...gastos].reverse().map((g) => `${dBR(g.data)} ${g.descricao}: ${brl(g.valor)} (${g.pagoPor ? 'pago por ' + g.pagoPor : 'cada um pagou o seu'})`).join('\n');
}
function baixarCsv() {
  const q = (x) => '"' + String(x ?? '').replace(/"/g, '""') + '"';
  const linhas = [['Data', 'Descrição', 'Categoria', 'Valor', 'Pago por', 'Dividido entre', 'Valor por pessoa', 'Pendentes', 'Observação'].map(q).join(';'),
    ...[...gastos].reverse().map((g) => { const ps = partes(g); return [dBR(g.data), g.descricao, CATEGORIAS[g.categoria], ((g.valor || 0) / 100).toFixed(2).replace('.', ','), g.pagoPor || 'Cada um o seu', (g.participantes || []).join(', '), ps.length ? (ps[0].valor / 100).toFixed(2).replace('.', ',') : '', ps.filter((p) => !p.quitado).map((p) => p.nome).join(', '), g.obs].map(q).join(';'); })];
  const b = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = `gastos-turma-pph-${hoje()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function copiar(t, msg) { navigator.clipboard.writeText(t).then(() => toast(msg), () => toast('Não deu para copiar')); }
