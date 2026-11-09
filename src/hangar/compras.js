// Lista de compras da turma (aba Compras do Hangar). Banco: compras/{id} = { item, qtd, cat, feito, feitoPor, nome, autor, em }.
// Cada item tem um "Onde comprar": lojas online que entregam em Curitiba e o mapa com lojas perto de onde a gente está.
// O endereço da casa não fica guardado aqui: cada um confirma o endereço na hora de fechar o pedido.
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const limpa = (t, n) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const u = encodeURIComponent;

export const CATS = { mercado: '🛒 Mercado', casa: '🏠 Casa e limpeza', higiene: '🧴 Higiene', roupa: '🧥 Roupa e frio', curso: '🚁 Curso e voo', outros: '📦 Outros' };

// Lojas online (entregam em Curitiba; o prazo aparece depois de pôr o CEP da casa na loja)
const ONLINE = [
  ['Mercado Livre (Full, chega rápido)', (q) => `https://lista.mercadolivre.com.br/${u(q.replace(/\s+/g, '-'))}_Frete_Full_NoIndex_True`],
  ['Amazon', (q) => `https://www.amazon.com.br/s?k=${u(q)}`],
  ['Magalu', (q) => `https://www.magazineluiza.com.br/busca/${u(q)}/`],
  ['Comparar preços (Google Shopping)', (q) => `https://www.google.com/search?tbm=shop&q=${u(q)}`],
];
// Perto de nós: o mapa usa a posição do celular ("perto de mim") ou procura em Piraquara/Pinhais
const PERTO = [
  ['📍 Perto de mim agora', (q) => `https://www.google.com/maps/search/?api=1&query=${u(q + ' perto de mim')}`],
  ['Em Piraquara', (q) => `https://www.google.com/maps/search/?api=1&query=${u(q + ' em Piraquara PR')}`],
  ['Em Pinhais', (q) => `https://www.google.com/maps/search/?api=1&query=${u(q + ' em Pinhais PR')}`],
  ['Em Curitiba', (q) => `https://www.google.com/maps/search/?api=1&query=${u(q + ' em Curitiba PR')}`],
];
const MERCADO = [ // mercado e farmácia entregam pelo app; a busca abre no site
  ['iFood Mercado', () => 'https://www.ifood.com.br/mercados'],
  ['Rappi', () => 'https://www.rappi.com.br/'],
];

const TEM_APP = new Set(['mercado', 'higiene', 'casa']);
let abertos = new Set(), termos = {}, verFeitos = false;

const links = (lista, q) => lista.map(([t, f]) => `<a class="btn mini" href="${esc(f(q))}" target="_blank" rel="noopener">${esc(t)}</a>`).join('');
function painel(c) {
  const q = termos[c.id] ?? c.item;
  return `<div class="cp-onde" data-cp-painel="${c.id}">
    <label class="sub">Buscar por (dá para detalhar: marca, tamanho, cor)<input data-cp-q="${c.id}" value="${esc(q)}" maxlength="100"></label>
    <div class="rotulo">🚚 Comprar online e receber em casa</div><div class="linha-acao">${links(ONLINE, q)}</div>
    ${TEM_APP.has(c.cat) ? `<div class="linha-acao">${links(MERCADO, q)}</div>` : ''}
    <p class="sub">Na loja, ponha o CEP da casa para ver o prazo e o frete. Prefira "chega hoje" ou "amanhã".</p>
    <div class="rotulo">🏬 Buscar numa loja perto</div><div class="linha-acao">${links(PERTO, q)}</div>
  </div>`;
}
function linha(c, eu) {
  const aberto = abertos.has(c.id);
  return `<div class="cp-item${c.feito ? ' cp-feito' : ''}">
    <div class="cp-lin">
      <button class="cp-check" data-cp-feito="${c.id}" aria-label="${c.feito ? 'Voltar para a lista' : 'Marcar como comprado'}">${c.feito ? '✓' : ''}</button>
      <div class="cp-txt"><b>${esc(c.item)}</b>${c.qtd ? ` <span class="chip">${esc(c.qtd)}</span>` : ''}
        <div class="sub">${esc(CATS[c.cat] || CATS.outros)} · pôs ${esc(c.nome || '')}${c.feito && c.feitoPor ? ` · comprado por ${esc(c.feitoPor)}` : ''}</div></div>
      ${c.feito ? '' : `<button class="mini${aberto ? ' pri' : ''}" data-cp-onde="${c.id}">🔎 Onde comprar</button>`}
      <button class="mini" data-cp-del="${c.id}" aria-label="Tirar da lista">✕</button>
    </div>${aberto && !c.feito ? painel(c) : ''}</div>`;
}

export function telaCompras(compras, erro) {
  const falta = compras.filter((c) => !c.feito), feitos = compras.filter((c) => c.feito);
  const grupos = Object.keys(CATS).map((k) => [k, falta.filter((c) => (CATS[c.cat] ? c.cat : 'outros') === k)]).filter(([, l]) => l.length);
  return `<div class="caixa"><h2>Lista de compras da turma</h2>
    <p class="sub">O que a casa e a turma precisam. Ponha o item; em "Onde comprar" aparecem as lojas online que entregam aqui e as lojas perto. Quem comprar marca o ✓ (e lança o valor em Gastos).</p>
    <form id="cpForm" class="form">
      <label class="largo">Item<input id="cpItem" maxlength="80" placeholder="Ex.: papel higiênico, café, cobertor" required autocomplete="off"></label>
      <label>Quantidade<input id="cpQtd" maxlength="30" placeholder="Ex.: 2 pacotes"></label>
      <label>Tipo<select id="cpCat">${Object.entries(CATS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Pôr na lista</button></div>
    </form>${erro ? `<p class="sub" style="color:var(--perigo)">${esc(erro)}</p>` : ''}</div>
  <div class="caixa"><div class="cab"><h3>Para comprar (${falta.length})</h3></div>
    ${grupos.length ? grupos.map(([k, l]) => `<div class="rotulo cp-cat">${esc(CATS[k])}</div>${l.map((c) => linha(c)).join('')}`).join('') : '<p class="sub">Nada na lista. 🎉</p>'}</div>
  ${feitos.length ? `<div class="caixa"><div class="cab"><h3>Já comprados (${feitos.length})</h3><span class="linha-acao"><button class="mini" data-cp-ver>${verFeitos ? 'Esconder' : 'Mostrar'}</button><button class="mini" data-cp-limpar>Limpar comprados</button></span></div>
    ${verFeitos ? feitos.map((c) => linha(c)).join('') : ''}</div>` : ''}`;
}

// ctx: { db, user, membro, compras: () => lista, toast, render }
export function ligarCompras(c, ctx) {
  const { db, toast, render } = ctx, achar = (id) => ctx.compras().find((x) => x.id === id);
  c.querySelector('#cpForm').onsubmit = async (e) => {
    e.preventDefault();
    const item = limpa(c.querySelector('#cpItem').value, 80); if (item.length < 2) return toast('Escreva o item.');
    const cat = c.querySelector('#cpCat').value;
    try {
      const r = await addDoc(collection(db, 'compras'), { item, qtd: limpa(c.querySelector('#cpQtd').value, 30), cat, feito: false, nome: ctx.membro().nome, autor: ctx.user().uid, em: serverTimestamp() });
      abertos.add(r.id); toast('Na lista. Veja "Onde comprar".');
    } catch (e2) { toast('Não salvou: ' + (e2.code || e2.message)); }
  };
  c.querySelectorAll('[data-cp-onde]').forEach((b) => b.onclick = () => { const id = b.dataset.cpOnde; abertos.has(id) ? abertos.delete(id) : abertos.add(id); render(); });
  c.querySelectorAll('[data-cp-q]').forEach((i) => i.addEventListener('input', () => {
    const id = i.dataset.cpQ, q = limpa(i.value, 100) || achar(id)?.item || ''; termos[id] = i.value;
    // troca só os links do painel, sem redesenhar a tela (o teclado continua aberto)
    const p = c.querySelector(`[data-cp-painel="${id}"]`), lista = [...ONLINE, ...(TEM_APP.has(achar(id)?.cat) ? MERCADO : []), ...PERTO];
    p.querySelectorAll('a').forEach((a, k) => { if (lista[k]) a.href = lista[k][1](q); });
  }));
  c.querySelectorAll('[data-cp-feito]').forEach((b) => b.onclick = async () => {
    const it = achar(b.dataset.cpFeito); if (!it) return;
    try { await updateDoc(doc(db, 'compras', it.id), { feito: !it.feito, feitoPor: it.feito ? '' : ctx.membro().nome, feitoEm: serverTimestamp() }); if (!it.feito) toast('Comprado ✓ Lance o valor em Gastos.'); }
    catch (e2) { toast('Não salvou: ' + (e2.code || e2.message)); }
  });
  c.querySelectorAll('[data-cp-del]').forEach((b) => b.onclick = () => { const it = achar(b.dataset.cpDel); if (it && confirm(`Tirar "${it.item}" da lista?`)) deleteDoc(doc(db, 'compras', it.id)).catch(() => toast('Não deu para tirar.')); });
  c.querySelector('[data-cp-ver]')?.addEventListener('click', () => { verFeitos = !verFeitos; render(); });
  c.querySelector('[data-cp-limpar]')?.addEventListener('click', async () => {
    const f = ctx.compras().filter((x) => x.feito); if (!f.length || !confirm(`Tirar da lista os ${f.length} itens já comprados?`)) return;
    const lote = writeBatch(db); f.forEach((x) => lote.delete(doc(db, 'compras', x.id)));
    try { await lote.commit(); toast('Comprados tirados da lista'); } catch (e2) { toast('Não deu: ' + (e2.code || e2.message)); }
  });
}

// enquanto alguém digita na lista, a tela não redesenha (as mudanças do banco apagariam o que está sendo escrito)
export const digitandoCompras = () => !!document.activeElement?.matches?.('#cpItem,#cpQtd,[data-cp-q]');
