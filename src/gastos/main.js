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
import { brl, partes, calcular, pixDe, caixaPix, ligarPix, digitandoPix, informarPar } from './contas.js';
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
      <form id="fCod" class="form"><label class="largo">Código do grupo<input id="cCod" required data-m="codigo" maxlength="300"></label><div class="largo linha-acao"><button class="pri" type="submit">Continuar</button></div></form>
      ${ehAdmin() ? '<div class="dica">Você é o administrador. Se o grupo ainda não existe, crie agora: o link de convite aparece na página depois.</div><div class="linha-acao"><button id="btCriar">Criar o grupo</button></div>' : ''}</section>`;
    ligarMascaras(el);
    $('#fCod').onsubmit = (e) => { e.preventDefault(); const c = $('#cCod').value.trim().replace(/.*[?&]c=/, '').replace(/[&#].*$/, '').replace(/[^\w-]/g, '').slice(0, 64); if (!c) return; try { localStorage.setItem(CHAVE_CODIGO, c); } catch {} telaEntrar(c); };
    $('#btCriar')?.addEventListener('click', criarGrupo);
    return;
  }
  el.innerHTML = `<section class="cartao"><h2>${esc(convite.grupo)}</h2>
    <p class="sub">Quem é você no grupo? Esse nome aparece nos gastos e nos acertos.</p>
    <form id="fEntrar" class="form">
      <label class="largo">Seu nome<select id="eNome">${(convite.pessoas || []).map((p) => `<option>${esc(p)}</option>`).join('')}<option value="">Outro nome…</option></select></label>
      <label class="largo" id="eOutroL" hidden>Nome (como a turma te chama)<input id="eOutro" data-m="nome" maxlength="24"></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Entrar no grupo</button></div>
    </form><p class="erro">${esc(erro || '')}</p></section>`;
  const sel = $('#eNome'); const prim = (user.displayName || '').split(' ')[0];
  const casa = [...sel.options].find((o) => o.value && prim && o.value.toLowerCase().startsWith(prim.toLowerCase()));
  if (casa) sel.value = casa.value;
  const outro = () => { $('#eOutroL').hidden = sel.value !== ''; }; sel.onchange = outro; outro();
  ligarMascaras(el);
  $('#fEntrar').onsubmit = async (e) => {
    e.preventDefault();
    const nome = limparNome(sel.value || $('#eOutro').value, 24);
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
    ${gastos.length ? graficos(r) : ''}
    <section class="cartao"><h3>Quem deve para quem</h3>
      ${r.acertos.length ? r.acertos.map((a) => { const par = `${esc(a.de)}|${esc(a.para)}`, pix = pixDe(membros, a.para);
        const acao = a.de === eu ? (a.inf ? `<span class="selo nao">⏳ você avisou que pagou</span><button class="mini" data-desinformar="${par}">Desfazer</button>` : `${pix ? `<button class="mini" data-pix-copiar="${esc(pix)}">Copiar Pix</button>` : ''}<button class="mini" data-informar="${par}">✓ Já paguei</button>`)
          : a.para === eu ? (a.inf ? `<span class="selo nao">💰 avisou que pagou</span><button class="mini pri" data-quitar="${par}">✓ Recebi, confirmar</button>` : `<button class="mini" data-quitar="${par}">✓ Já recebi</button>`)
          : `${a.inf ? '<span class="selo nao">⏳ aguardando confirmação</span>' : ''}${ehAdmin() ? `<button class="mini" data-quitar="${par}">✓ Pago</button>` : ''}`;
        return `<div class="acerto"><span><b class="${a.de === eu ? 'eu' : ''}">${esc(a.de)}</b> deve <b class="v">${brl(a.valor)}</b> a <b class="${a.para === eu ? 'eu' : ''}">${esc(a.para)}</b></span><span class="linha-acao">${acao}</span></div>`; }).join('')
        : '<div class="vazio">Ninguém deve nada a ninguém. Tudo acertado.</div>'}
      ${r.acertos.length ? `<div class="dica">Já compensa o que um deve ao outro. Quem deve paga pelo Pix (o botão copia a chave) e toca em "✓ Já paguei"; o acerto só sai da lista quando quem recebe toca em "✓ Recebi". Para um gasto só, toque no seu nome dentro do gasto.${membro.pix ? ` Sua chave Pix: <b>${esc(membro.pix)}</b> <button class="mini" data-pix-trocar>Trocar</button>` : ''}</div>` : ''}
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
      <form id="fPessoa" class="form"><label>Acrescentar pessoa<input id="nPessoa" data-m="nome" maxlength="24" placeholder="Nome"></label><div class="linha-acao" style="align-items:end"><button type="submit">Acrescentar</button></div></form>
    </section>`;
  ligarPix(el, { db, uid: user.uid, quem: eu, gastos: () => gastos, toast, depois: (v, trocar) => { if (v) membro.pix = v; telaPrincipal(!!trocar); } });
  $('#btNovo').onclick = () => telaGasto(null);
  el.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filtro = b.dataset.f; telaPrincipal(); });
  el.querySelectorAll('[data-ed]').forEach((b) => b.onclick = () => telaGasto(gastos.find((g) => g.id === b.dataset.ed)));
  el.querySelectorAll('[data-parte]').forEach((b) => b.onclick = () => alternarQuitado(b.dataset.parte, b.dataset.nome));
  el.querySelectorAll('[data-aviso]').forEach((b) => b.onclick = () => alternarInformado(b.dataset.aviso, b.dataset.nome));
  $('#btCsv')?.addEventListener('click', baixarCsv); $('#btCopiar')?.addEventListener('click', () => copiar(resumo(r), 'Resumo copiado'));
  $('#btLink').onclick = () => navigator.share ? navigator.share({ title: 'Gastos da turma', text: 'Controle de gastos do curso de PPH. Entre com o seu Google:', url: link }).catch(() => {}) : copiar(link, 'Link copiado');
  ligarMascaras(el);
  $('#fPessoa').onsubmit = async (e) => { e.preventDefault(); const n = limparNome($('#nPessoa').value, 24); if (n.length < 2) { toast('Escreva um nome com pelo menos 2 letras.'); return; } try { await updateDoc(doc(db, 'gastosConvites', membro.codigo), { pessoas: arrayUnion(n) }); toast(n + ' acrescentado'); } catch (e2) { toast('Não salvou: ' + (e2.code || e2.message)); } };
}

// ---------- gráficos ----------
const dDia = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const brlCurto = (c) => { const v = c / 100; return v >= 1000 ? 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
// Por dia (barras, com o total de cada semana embaixo) e por categoria (barras deitadas). Só SVG, sem biblioteca.
function graficos(r) {
  const porDia = {}; gastos.forEach((g) => { porDia[g.data] = (porDia[g.data] || 0) + (g.valor || 0); });
  const dias = Object.keys(porDia).sort(); if (!dias.length) return '';
  const fim = hoje() > dias[dias.length - 1] ? hoje() : dias[dias.length - 1];
  const todos = []; for (let d = dias[0]; d <= fim && todos.length < 120; d = addDias(d, 1)) todos.push(d);
  const max = Math.max(...Object.values(porDia)), topo = dias.reduce((a, b) => porDia[a] >= porDia[b] ? a : b);
  // semanas de segunda a domingo
  const semana = (iso) => { const d = new Date(iso + 'T12:00:00'); return addDias(iso, -((d.getDay() + 6) % 7)); };
  const semanas = {}; todos.forEach((d) => { const k = semana(d); (semanas[k] ||= { de: k, ate: addDias(k, 6), total: 0, n: 0 }); if (porDia[d]) { semanas[k].total += porDia[d]; semanas[k].n++; } });
  const sem = Object.values(semanas), semTopo = sem.reduce((a, b) => a.total >= b.total ? a : b);
  const W = 640, H = 190, ml = 8, mr = 8, mt = 22, mb = 34, lw = (W - ml - mr) / todos.length, bw = Math.max(3, Math.min(26, lw * 0.64)), ph = H - mt - mb;
  const y = (v) => mt + ph - (max ? v / max * ph : 0);
  const barras = todos.map((d, i) => { const v = porDia[d] || 0, x = ml + i * lw + (lw - bw) / 2, h = v ? Math.max(3, ph - (y(v) - mt)) : 0;
    return `<g><title>${dBR(d)}: ${brl(v)}</title><rect x="${x.toFixed(1)}" y="${(mt + ph - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, bw / 2)}" fill="${d === topo ? 'var(--lar-esc)' : 'var(--lar)'}" opacity="${v ? 1 : 0}"/>
      ${d === topo ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(mt + ph - h - 6).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--pre)">${esc(brlCurto(v))}</text>` : ''}
      ${(todos.length <= 14 || i % 7 === 0 || d === todos[todos.length - 1]) ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H - mb + 16}" text-anchor="middle" font-size="11" fill="var(--cin)">${dDia(d)}</text>` : ''}</g>`; }).join('');
  const divisores = todos.map((d, i) => i && semana(d) === d ? `<line x1="${(ml + i * lw).toFixed(1)}" x2="${(ml + i * lw).toFixed(1)}" y1="${mt - 4}" y2="${mt + ph}" stroke="var(--cin2)" stroke-dasharray="3 3"/>` : '').join('');
  const cats = Object.entries(r.porCat).sort((a, b) => b[1] - a[1]), maxCat = cats[0]?.[1] || 1;
  return `<section class="cartao"><div class="cab"><h3>Gastos por dia</h3><span class="sub">${todos.length} dia(s) · maior: <b>${dBR(topo)}</b>, ${brl(porDia[topo])}</span></div>
    <div class="grafico"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gastos por dia">${divisores}<line x1="${ml}" x2="${W - mr}" y1="${mt + ph}" y2="${mt + ph}" stroke="var(--cin2)"/>${barras}</svg></div>
    <div class="semanas">${sem.map((s) => `<div class="semana ${s === semTopo ? 'dest' : ''}"><span>Semana ${dDia(s.de)} a ${dDia(s.ate)}</span><b>${brl(s.total)}</b><span class="sub">${s.n ? s.n + ' dia(s) com gasto' : 'sem gasto'}${s === semTopo && sem.length > 1 ? ' · a mais cara' : ''}</span></div>`).join('')}</div>
    <h3 style="margin-top:6px">Por categoria</h3>
    <div class="cats">${cats.map(([k, v]) => `<div class="cat"><div class="cab"><span>${esc((CATEGORIAS[k] || 'Outros').split(' (')[0])}</span><b>${brl(v)} <span class="sub">${Math.round(v / r.total * 100)}%</span></b></div><div class="barra"><i style="width:${(v / maxCat * 100).toFixed(1)}%"></i></div></div>`).join('')}</div>
    <p class="sub">Soma do que a turma gastou junto, sem descontar quem pagou. A média por pessoa está acima; cada gasto tem sua categoria, que dá para trocar em "✏️ Editar".</p></section>`;
}

function cartaoGasto(g) {
  const ps = partes(g);
  return `<div class="gasto"><div class="linha1"><span class="desc">${esc(g.descricao)}</span><span class="valor">${brl(g.valor)}</span></div>
    <div class="sub">${dBR(g.data)} · ${esc(CATEGORIAS[g.categoria] || 'Outros')} · ${g.pagoPor ? 'pago por <b>' + esc(g.pagoPor) + '</b>' : 'cada um pagou a sua parte'} · ${ps.length} pessoa(s)${ps.length ? ', ' + brl(ps[0].valor) + ' cada' : ''}${g.obs ? ' · ' + esc(g.obs) : ''}</div>
    <div class="chips">${ps.map((p) => { const eu = membro.nome, rot = `${esc(p.nome)} ${brl(p.valor)}`; if (p.pagador) return `<span class="parte pagador">${esc(p.nome)} pagou</span>`;
      if (!g.pagoPor) return `<span class="parte pago">✓ ${rot}</span>`;
      if (p.quitado) return g.pagoPor === eu || ehAdmin() ? `<button class="parte pago" data-parte="${g.id}" data-nome="${esc(p.nome)}" title="Toque para voltar para pendente">✓ ${rot}</button>` : `<span class="parte pago">✓ ${rot}</span>`;
      if (g.pagoPor === eu || ehAdmin()) return `<button class="parte ${p.informado ? 'aviso' : 'deve'}" data-parte="${g.id}" data-nome="${esc(p.nome)}" title="Toque para confirmar que recebeu">${rot}${p.informado ? ' · avisou que pagou' : ' · deve'}</button>`;
      if (p.nome === eu) return `<button class="parte ${p.informado ? 'aviso' : 'deve'}" data-aviso="${g.id}" data-nome="${esc(p.nome)}" title="${p.informado ? 'Toque para desfazer o aviso' : 'Toque para avisar que pagou'}">${rot}${p.informado ? ' · ⏳ avisei que paguei' : ' · devo'}</button>`;
      return `<span class="parte ${p.informado ? 'aviso' : 'deve'}">${rot}${p.informado ? ' · avisou que pagou' : ' · deve'}</span>`; }).join('')}
      <button class="mini" data-ed="${g.id}">✏️ Editar</button></div></div>`;
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
  try { await updateDoc(doc(db, 'gastos', id), { quitados: [...q], atualizadoPor: membro.nome, atualizadoEm: serverTimestamp() }); toast(pago ? `${nome}: recebido, quitado` : `${nome}: voltou para pendente`); }
  catch (e) { toast('Não salvou: ' + (e.code || e.message)); }
}

function telaGasto(g) {
  editando = g ? g.id : 'novo';
  const pessoas = [...new Set([...(grupo.pessoas || []), ...(g?.participantes || [])])];
  g = g || { data: hoje(), categoria: 'alimentacao', pagoPor: membro.nome, participantes: pessoas, quitados: [] };
  const part = new Set(g.participantes || []);
  el.innerHTML = `<section class="cartao"><div class="cab"><h2>${g.id ? 'Editar gasto' : 'Novo gasto'}</h2><button type="button" id="gVoltar">Voltar</button></div>
    <form id="fGasto" class="form">
      <label class="largo">Com o que foi o gasto<input id="gDesc" required data-m="texto" maxlength="80" value="${esc(g.descricao)}" placeholder="Ex.: Uber aeroporto → hotel"></label>
      <label>Data<input id="gData" type="date" required min="2020-01-01" max="${hojeIso(365)}" value="${esc(g.data)}"></label>
      <label>Valor total (R$)<input id="gValor" required data-m="dinheiro" value="${g.valor != null ? esc(((g.valor || 0) / 100).toFixed(2).replace('.', ',')) : ''}" placeholder="0,00"></label>
      <label>Categoria<select id="gCat">${Object.entries(CATEGORIAS).map(([k, t]) => `<option value="${k}" ${k === g.categoria ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label>Quem pagou<select id="gPagou">${pessoas.map((p) => `<option ${p === g.pagoPor ? 'selected' : ''}>${esc(p)}</option>`).join('')}<option value="" ${g.pagoPor === '' ? 'selected' : ''}>Cada um pagou a sua parte</option></select></label>
      <div class="largo"><h3 style="margin-bottom:6px">Dividido entre (partes iguais)</h3><div class="chips" id="gPart">${pessoas.map((p) => `<button type="button" class="chip" aria-pressed="${part.has(p)}" data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div></div>
      <div class="largo dica" id="gCalc"></div>
      <label class="largo">Observação<input id="gObs" data-m="texto" maxlength="120" value="${esc(g.obs)}"></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Salvar gasto</button>${g.id ? '<button type="button" class="perigo" id="gApagar">Apagar</button>' : ''}</div>
    </form><p class="erro" id="gErro"></p></section>`;
  const escolhidos = () => [...el.querySelectorAll('#gPart [aria-pressed="true"]')].map((b) => b.dataset.p);
  const calc = () => { const v = centavos($('#gValor').value), n = escolhidos().length; $('#gCalc').textContent = Number.isFinite(v) && v > 0 && n ? `${n} pessoa(s): ${brl(Math.floor(v / n))} para cada.` : 'Escolha quem dividiu o gasto.'; };
  $('#gPart').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); calc(); } };
  ligarMascaras(el);
  $('#gValor').addEventListener('input', calc); calc();
  $('#gVoltar').onclick = telaPrincipal;
  $('#gApagar')?.addEventListener('click', async () => { if (!confirm('Apagar este gasto para todo mundo?')) return; await deleteDoc(doc(db, 'gastos', g.id)); toast('Gasto apagado'); telaPrincipal(); });
  $('#fGasto').onsubmit = async (e) => {
    e.preventDefault();
    const participantes = escolhidos().filter((p) => pessoas.includes(p)), pagoPor = pessoas.includes($('#gPagou').value) ? $('#gPagou').value : '', valor = centavos(formatarDinheiro($('#gValor').value));
    const d = { descricao: limpar($('#gDesc').value, 80), data: $('#gData').value, valor, categoria: CATEGORIAS[$('#gCat').value] ? $('#gCat').value : 'outros', pagoPor, participantes,
      quitados: (g.quitados || []).filter((p) => participantes.includes(p) && p !== pagoPor), obs: limpar($('#gObs').value, 120), atualizadoPor: membro.nome, atualizadoEm: serverTimestamp() };
    if (!d.descricao) { $('#gErro').textContent = 'Diga com o que foi o gasto.'; return; }
    if (!dataValida(d.data, '2020-01-01', hojeIso(365))) { $('#gErro').textContent = 'Informe uma data válida.'; return; }
    if (!Number.isFinite(valor) || valor <= 0) { $('#gErro').textContent = 'Valor inválido. Use, por exemplo, 80,00.'; return; }
    if (valor > 10000000) { $('#gErro').textContent = 'Valor alto demais (máximo R$ 100.000,00). Confira a vírgula.'; return; }
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
  const q = celulaCsv;
  const linhas = [['Data', 'Descrição', 'Categoria', 'Valor', 'Pago por', 'Dividido entre', 'Valor por pessoa', 'Pendentes', 'Observação'].map(q).join(';'),
    ...[...gastos].reverse().map((g) => { const ps = partes(g); return [dBR(g.data), g.descricao, CATEGORIAS[g.categoria], ((g.valor || 0) / 100).toFixed(2).replace('.', ','), g.pagoPor || 'Cada um o seu', (g.participantes || []).join(', '), ps.length ? (ps[0].valor / 100).toFixed(2).replace('.', ',') : '', ps.filter((p) => !p.quitado).map((p) => p.nome).join(', '), g.obs].map(q).join(';'); })];
  const b = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = `gastos-turma-pph-${hoje()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function copiar(t, msg) { navigator.clipboard.writeText(t).then(() => toast(msg), () => toast('Não deu para copiar')); }
