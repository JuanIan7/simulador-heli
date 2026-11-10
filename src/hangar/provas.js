// Provas da turma (aba Provas do Hangar): uma prova por matéria, no estilo da prova teórica da ANAC.
// As questões ficam em src/hangar/provas/<id>.json (geradas a partir dos PDFs da pasta do Drive; cada resposta cita a página
// e o trecho do manual que a comprova). O índice com títulos e contagens fica em provas/indice.json.
// Banco: provas/{uid} = { nome, notas: { <id>: { melhor, ultima, acertos, total, tentativas, em } }, em }.
// O ranking soma o desempenho de todo mundo; só conta a prova completa (refazer só as erradas não conta).
import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import INDICE from './provas/indice.json';

const CARREGAR = import.meta.glob(['./provas/*.json', '!./provas/indice.json'], { import: 'default' });
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
const LETRA = ['A', 'B', 'C', 'D'];
const APROVA = 70; // a ANAC aprova com 70% em cada matéria
const CHAVE = 'hangar-prova-andamento';
const hojeIso = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

const cache = {};            // id → prova carregada
let tela = 'menu';           // menu | prova | fim
let verRanking = 'geral';    // geral | <id da prova>
let atual = null;            // { id, titulo, ordem: [{q, alt: [índices embaralhados]}], i, resp: [índice escolhido], soErradas }
let carregando = '';

function embaralhar(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function salvarAndamento() { try { atual && tela === 'prova' ? localStorage.setItem(CHAVE, JSON.stringify(atual)) : localStorage.removeItem(CHAVE); } catch {} }
function lerAndamento() { try { const a = JSON.parse(localStorage.getItem(CHAVE) || 'null'); return a && INDICE.some((p) => p.id === a.id) ? a : null; } catch { return null; } }
async function carregar(id) { if (!cache[id]) { const f = CARREGAR[`./provas/${id}.json`]; if (!f) throw new Error('prova não encontrada'); cache[id] = await f(); } return cache[id]; }

// ---------- ranking ----------
// geral: média das melhores notas em todas as matérias (matéria não feita conta 0), para premiar quem estuda tudo
function linhasRanking(notas, id) {
  const l = notas.map((n) => {
    if (id === 'geral') {
      const feitas = INDICE.filter((p) => n.notas?.[p.id]);
      const media = Math.round(INDICE.reduce((s, p) => s + (n.notas?.[p.id]?.melhor || 0), 0) / INDICE.length);
      const aprov = INDICE.filter((p) => (n.notas?.[p.id]?.melhor || 0) >= APROVA).length;
      return { nome: n.nome, uid: n.uid, valor: media, extra: `${feitas.length}/${INDICE.length} provas · ${aprov} aprovada${aprov === 1 ? '' : 's'}`, tem: feitas.length > 0 };
    }
    const x = n.notas?.[id];
    return { nome: n.nome, uid: n.uid, valor: x?.melhor || 0, extra: x ? `${x.tentativas || 1} tentativa${(x.tentativas || 1) === 1 ? '' : 's'} · última ${x.ultima ?? x.melhor}%` : '', tem: !!x };
  }).filter((x) => x.tem).sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome));
  let pos = 0, ant = null; l.forEach((x, k) => { if (x.valor !== ant) { pos = k + 1; ant = x.valor; } x.pos = pos; });
  return l;
}
const medalha = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : p + 'º');
function blocoRanking(notas, eu) {
  const l = linhasRanking(notas, verRanking);
  const opc = [['geral', 'Geral'], ...INDICE.map((p) => [p.id, p.curto])];
  return `<div class="caixa pv-rank"><div class="cab"><h3>🏆 Ranking da turma</h3></div>
    <div class="chips">${opc.map(([k, t]) => `<button class="chip" aria-pressed="${k === verRanking}" data-pv-rank="${k}">${esc(t)}</button>`).join('')}</div>
    ${l.length ? `<ol class="pv-lista">${l.map((x) => `<li class="${x.uid === eu ? 'pv-eu' : ''}"><span class="pv-pos">${medalha(x.pos)}</span><span class="pv-nome">${esc(x.nome)}${x.uid === eu ? ' <span class="sub">(você)</span>' : ''}<span class="sub">${esc(x.extra)}</span></span><b class="pv-val ${x.valor >= APROVA ? 'ok' : ''}">${x.valor}%</b></li>`).join('')}</ol>`
      : `<p class="sub">Ninguém fez ${verRanking === 'geral' ? 'nenhuma prova' : 'esta prova'} ainda. Seja o primeiro.</p>`}
    <p class="sub">${verRanking === 'geral' ? `Geral = média das melhores notas nas ${INDICE.length} matérias (a que não foi feita conta zero).` : 'Vale a melhor nota de cada um na prova completa.'} Aprovação da ANAC: ${APROVA}% em cada matéria.</p></div>`;
}

// ---------- telas ----------
function telaMenu(ctx) {
  const eu = ctx.user()?.uid, minhas = ctx.notas().find((n) => n.uid === eu)?.notas || {};
  const and = lerAndamento();
  return `<div class="cab"><h2>Provas</h2><span class="selo la">${INDICE.reduce((s, p) => s + p.n, 0)} questões</span></div>
  <p class="intro">Uma prova por matéria, no estilo da prova teórica da ANAC. As questões vêm dos manuais da nossa pasta: a cada erro aparece a explicação, o trecho do manual com a página (abre o PDF) e um vídeo do assunto. A melhor nota de cada um entra no ranking.</p>
  ${and ? `<div class="caixa destaque"><div class="cab"><div><b>Prova em andamento: ${esc(and.titulo)}</b><div class="sub">Questão ${Math.min(and.i + 1, and.ordem.length)} de ${and.ordem.length}${and.soErradas ? ' · só as erradas' : ''}</div></div><span class="linha-acao"><button class="pri" data-pv-continuar>Continuar</button><button class="mini fantasma" data-pv-descartar>Descartar</button></span></div></div>` : ''}
  ${blocoRanking(ctx.notas(), eu)}
  <div class="grade pv-grade">${INDICE.map((p) => { const m = minhas[p.id]; return `<div class="caixa pv-card">
    <div class="cab"><h3>${esc(p.titulo)}</h3>${m ? `<span class="selo ${m.melhor >= APROVA ? 'ok' : 'al'}">${m.melhor}%</span>` : ''}</div>
    <p class="sub">${esc(p.descricao)}</p>
    <div class="sub">${p.n} questões · ${p.temas} assuntos${m ? ` · você fez ${m.tentativas || 1}x, última ${m.ultima ?? m.melhor}%` : ''}</div>
    <div class="linha-acao"><button class="pri" data-pv-comecar="${p.id}"${carregando === p.id ? ' disabled' : ''}>${carregando === p.id ? 'Abrindo…' : m ? 'Fazer de novo' : 'Começar'}</button></div></div>`; }).join('')}</div>`;
}

function blocoFonte(prova, q, ctx) {
  const r = q.ref || {}, nome = prova.fontes?.[r.doc] || r.doc, link = ctx.arq[r.doc];
  const tema = prova.temas.find((t) => t.id === q.tema) || {};
  const video = tema.video?.url ? `<a class="btn mini" href="${esc(tema.video.url)}" target="_blank" rel="noopener">▶ Vídeo: ${esc(tema.video.titulo)}</a>` : '';
  return `<div class="pv-fonte">
    <div class="rotulo">📖 No manual</div>
    <blockquote>“${esc(r.trecho)}”</blockquote>
    <div class="linha-acao">${link ? `<a class="btn mini" href="${esc(link)}" target="_blank" rel="noopener">📄 ${esc(nome)}, pág. ${esc(r.pag)}</a>` : `<span class="sub">📄 ${esc(nome)}, pág. ${esc(r.pag)} (na pasta do curso)</span>`}</div>
    <div class="rotulo">🎬 Para reforçar: ${esc(tema.nome || '')}</div>
    <div class="linha-acao">${video}<a class="btn mini${video ? ' fantasma' : ''}" href="${esc(yt(tema.busca || tema.nome || q.p))}" target="_blank" rel="noopener">🔎 ${video ? 'Mais vídeos' : 'Vídeos no YouTube'}</a></div>
  </div>`;
}

function telaQuestao(ctx) {
  const prova = cache[atual.id], k = atual.ordem[atual.i], q = prova.questoes[k.q];
  const resp = atual.resp[atual.i], respondeu = resp != null, certa = q.c;
  const acertos = atual.resp.filter((r, j) => r != null && r === prova.questoes[atual.ordem[j].q].c).length;
  const feitas = atual.resp.filter((r) => r != null).length;
  const pct = Math.round((atual.i / atual.ordem.length) * 100);
  return `<div class="cab"><h2>${esc(atual.titulo)}</h2><button class="mini fantasma" data-pv-sair>Sair</button></div>
  <div class="pv-prog"><span>Questão ${atual.i + 1} de ${atual.ordem.length}${atual.soErradas ? ' · só as erradas (não conta no ranking)' : ''}</span><span>✓ ${acertos} de ${feitas}</span></div>
  <div class="barra"><i style="width:${pct}%"></i></div>
  <div class="caixa pv-q">
    <div class="pv-tema">${esc(prova.temas.find((t) => t.id === q.tema)?.nome || '')}</div>
    <p class="pv-enun">${esc(q.p)}</p>
    <div class="pv-alts">${k.alt.map((a, n) => {
      const cls = !respondeu ? '' : a === certa ? ' certa' : a === resp ? ' errada' : ' apagada';
      return `<button class="pv-alt${cls}" data-pv-alt="${a}"${respondeu ? ' disabled' : ''}><b>${LETRA[n]}</b><span>${esc(q.alt[a])}</span></button>`; }).join('')}</div>
    ${respondeu ? (resp === certa
      ? `<div class="pv-res ok"><b>✓ Certo!</b><details><summary>Ver explicação e fonte</summary><p>${esc(q.exp)}</p>${blocoFonte(prova, q, ctx)}</details></div>`
      : `<div class="pv-res pe"><b>✗ Errado.</b><p>A certa é a <b>${LETRA[k.alt.indexOf(certa)]}</b>: ${esc(q.alt[certa])}</p><p>${esc(q.exp)}</p>${blocoFonte(prova, q, ctx)}</div>`)
      + `<div class="linha-acao pv-seg"><button class="pri" data-pv-prox>${atual.i + 1 < atual.ordem.length ? 'Próxima →' : 'Ver resultado'}</button></div>` : ''}
  </div>`;
}

function telaFim(ctx) {
  const prova = cache[atual.id], total = atual.ordem.length;
  const erradas = atual.ordem.map((k, j) => ({ k, j, q: prova.questoes[k.q] })).filter((x) => atual.resp[x.j] !== x.q.c);
  const acertos = total - erradas.length, pct = Math.round((acertos / total) * 100);
  const m = ctx.notas().find((n) => n.uid === ctx.user()?.uid)?.notas?.[atual.id];
  return `<div class="cab"><h2>${esc(atual.titulo)}</h2><button class="mini fantasma" data-pv-menu>Voltar às provas</button></div>
  <div class="caixa pv-placar ${pct >= APROVA ? 'ok' : 'pe'}">
    <div class="pv-nota">${pct}%</div>
    <div><b>${acertos} de ${total} certas</b> · ${pct >= APROVA ? 'Aprovado pelo critério da ANAC (70%)' : `Faltou para os 70% da ANAC (precisava de ${Math.ceil(total * APROVA / 100)} certas)`}
      <div class="sub">${atual.soErradas ? 'Treino das erradas: não entra no ranking.' : m ? `Sua melhor nota nesta prova: ${m.melhor}%.` : ''}</div></div>
  </div>
  ${erradas.length ? `<div class="caixa"><div class="cab"><h3>Revise o que errou (${erradas.length})</h3><button class="pri" data-pv-erradas>Refazer só as erradas</button></div>
    ${erradas.map((x) => `<details class="pv-rev"><summary>${esc(x.q.p)}</summary>
      <p><span class="selo pe">Você: ${esc(x.q.alt[atual.resp[x.j]] ?? '—')}</span></p><p><span class="selo ok">Certa: ${esc(x.q.alt[x.q.c])}</span></p><p>${esc(x.q.exp)}</p>${blocoFonte(prova, x.q, ctx)}</details>`).join('')}</div>`
    : '<div class="caixa"><p>Gabaritou. 🎉</p></div>'}
  <div class="linha-acao"><button class="pri" data-pv-comecar="${atual.id}">Fazer a prova inteira de novo</button><button data-pv-menu>Outras provas</button></div>`;
}

export function telaProvas(ctx) {
  if (tela === 'prova' && atual && cache[atual.id]) return telaQuestao(ctx);
  if (tela === 'fim' && atual && cache[atual.id]) return telaFim(ctx);
  return telaMenu(ctx);
}

// ---------- ações ----------
// ctx: { db, user: () => user, membro: () => membro, notas: () => lista de provas/{uid}, arq: { doc → link do PDF }, toast, render }
async function comecar(id, ctx, soErradas = null) {
  try {
    carregando = id; ctx.render();
    const prova = await carregar(id);
    const base = soErradas || prova.questoes.map((_, n) => n);
    atual = { id, titulo: prova.titulo, ordem: embaralhar(base).map((n) => ({ q: n, alt: embaralhar([0, 1, 2, 3]) })), i: 0, resp: [], soErradas: !!soErradas };
    tela = 'prova';
  } catch (e) { ctx.toast('Não deu para abrir a prova: ' + (e.message || e)); }
  carregando = ''; salvarAndamento(); ctx.render(); window.scrollTo(0, 0);
}

async function gravarNota(ctx) {
  const prova = cache[atual.id], total = atual.ordem.length;
  const acertos = atual.ordem.filter((k, j) => atual.resp[j] === prova.questoes[k.q].c).length, pct = Math.round((acertos / total) * 100);
  const antes = ctx.notas().find((n) => n.uid === ctx.user().uid)?.notas?.[atual.id];
  const melhor = Math.max(pct, antes?.melhor || 0);
  try {
    await setDoc(doc(ctx.db, 'provas', ctx.user().uid), { nome: ctx.membro().nome, notas: { [atual.id]: { melhor, ultima: pct, acertos, total, tentativas: increment(1), em: hojeIso() } }, em: serverTimestamp() }, { merge: true });
    ctx.toast(pct > (antes?.melhor || -1) ? (antes ? `Novo recorde: ${pct}%` : `Nota registrada: ${pct}%`) : `Nota registrada: ${pct}% (seu recorde é ${melhor}%)`);
  } catch (e) { ctx.toast('A nota não foi salva no ranking: ' + (e.code === 'permission-denied' ? 'o ranking ainda está sendo ativado no banco.' : e.code || e.message)); }
}

export function ligarProvas(c, ctx) {
  c.querySelectorAll('[data-pv-rank]').forEach((b) => b.onclick = () => { verRanking = b.dataset.pvRank; ctx.render(); });
  c.querySelectorAll('[data-pv-comecar]').forEach((b) => b.onclick = () => comecar(b.dataset.pvComecar, ctx));
  c.querySelector('[data-pv-continuar]')?.addEventListener('click', async () => {
    const a = lerAndamento(); if (!a) return ctx.render();
    try { await carregar(a.id); atual = a; tela = 'prova'; ctx.render(); window.scrollTo(0, 0); } catch (e) { ctx.toast('Não deu para abrir: ' + (e.message || e)); }
  });
  c.querySelector('[data-pv-descartar]')?.addEventListener('click', () => { try { localStorage.removeItem(CHAVE); } catch {} ctx.render(); });
  c.querySelectorAll('[data-pv-alt]').forEach((b) => b.onclick = () => {
    if (atual.resp[atual.i] != null) return;
    atual.resp[atual.i] = +b.dataset.pvAlt; salvarAndamento(); ctx.render();
    c.querySelector('.pv-res')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  c.querySelector('[data-pv-prox]')?.addEventListener('click', async () => {
    if (atual.i + 1 < atual.ordem.length) { atual.i++; salvarAndamento(); ctx.render(); window.scrollTo(0, 0); return; }
    tela = 'fim'; salvarAndamento(); ctx.render(); window.scrollTo(0, 0);
    if (!atual.soErradas) { await gravarNota(ctx); ctx.render(); }
  });
  c.querySelector('[data-pv-sair]')?.addEventListener('click', () => { tela = 'menu'; ctx.render(); window.scrollTo(0, 0); }); // o andamento fica salvo para continuar depois
  c.querySelectorAll('[data-pv-menu]').forEach((b) => b.onclick = () => { tela = 'menu'; atual = null; salvarAndamento(); ctx.render(); window.scrollTo(0, 0); });
  c.querySelector('[data-pv-erradas]')?.addEventListener('click', () => {
    const prova = cache[atual.id], err = atual.ordem.map((k, j) => (atual.resp[j] !== prova.questoes[k.q].c ? k.q : null)).filter((x) => x != null);
    comecar(atual.id, ctx, err);
  });
}

// durante a prova a tela só redesenha por ação da pessoa (o ranking que muda no banco não interrompe)
export const emProva = () => tela !== 'menu';
export const totalQuestoes = () => INDICE.reduce((s, p) => s + p.n, 0);
