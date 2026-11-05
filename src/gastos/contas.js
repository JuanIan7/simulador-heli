// Contas dos gastos da turma e chave Pix de cada um. Usado pela página de gastos e pelo Início do Hangar da Turma.
// A chave Pix fica em gastosMembros/{uid}.pix: cada um grava a sua, e todos do grupo leem para copiar na hora de pagar.
import { doc, writeBatch, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const brl = (c) => ((c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function partes(g) {
  const ps = g.participantes || [], n = ps.length, base = n ? Math.floor((g.valor || 0) / n) : 0, sobra = n ? (g.valor || 0) - base * n : 0;
  return ps.map((p, i) => ({ nome: p, valor: base + (i < sobra ? 1 : 0), pagador: !!g.pagoPor && p === g.pagoPor, quitado: !g.pagoPor || p === g.pagoPor || (g.quitados || []).includes(p) }));
}
export function calcular(lista) {
  const r = { total: 0, pendente: 0, porCat: {}, pessoa: {}, deve: {} };
  const P = (n) => (r.pessoa[n] ||= { parte: 0, desembolso: 0, deve: 0, receber: 0 });
  for (const g of lista) {
    r.total += g.valor || 0; r.porCat[g.categoria] = (r.porCat[g.categoria] || 0) + (g.valor || 0);
    if (g.pagoPor) P(g.pagoPor).desembolso += g.valor || 0;
    for (const p of partes(g)) {
      P(p.nome).parte += p.valor;
      if (!g.pagoPor) { P(p.nome).desembolso += p.valor; continue; }
      if (p.pagador) continue;
      if (p.quitado) { P(p.nome).desembolso += p.valor; P(g.pagoPor).desembolso -= p.valor; continue; }
      r.pendente += p.valor; P(p.nome).deve += p.valor; P(g.pagoPor).receber += p.valor;
      const k = p.nome + '→' + g.pagoPor; r.deve[k] = (r.deve[k] || 0) + p.valor;
    }
  }
  // Compensa quem deve um para o outro: sobra só a diferença de cada par.
  r.acertos = [];
  const visto = new Set();
  for (const k of Object.keys(r.deve)) {
    const [a, b] = k.split('→'); const par = [a, b].sort().join('|');
    if (visto.has(par)) continue; visto.add(par);
    const liq = (r.deve[a + '→' + b] || 0) - (r.deve[b + '→' + a] || 0);
    if (liq) r.acertos.push(liq > 0 ? { de: a, para: b, valor: liq } : { de: b, para: a, valor: -liq });
  }
  r.acertos.sort((x, y) => y.valor - x.valor);
  return r;
}

// Quita todas as partes pendentes entre duas pessoas (nos dois sentidos, porque o acerto já é a diferença). Devolve quantas.
export async function quitarPar(db, gastos, a, b, quem) {
  const lote = writeBatch(db); let n = 0;
  for (const g of gastos) {
    const devedor = g.pagoPor === b ? a : g.pagoPor === a ? b : null;
    if (!devedor || !(g.participantes || []).includes(devedor) || (g.quitados || []).includes(devedor)) continue;
    lote.update(doc(db, 'gastos', g.id), { quitados: arrayUnion(devedor), atualizadoPor: quem, atualizadoEm: serverTimestamp() }); n++;
  }
  if (n) await lote.commit();
  return n;
}

// ---------- Pix ----------
export const pixDe = (membros, nome) => membros.find((m) => m.nome === nome)?.pix || '';
export const salvarPix = (db, uid, pix) => updateDoc(doc(db, 'gastosMembros', uid), { pix: pix.trim() });
const CHAVE_DEPOIS = 'pix-depois';
const adiou = () => { try { return sessionStorage.getItem(CHAVE_DEPOIS) === '1'; } catch { return false; } };

// Caixa para cadastrar (ou trocar) a chave Pix. Aparece sozinha enquanto a pessoa não cadastrou, até ela tocar em "Agora não".
export function caixaPix(membro, trocando = false) {
  if (membro.pix && !trocando) return '';
  if (!membro.pix && adiou() && !trocando) return '';
  return `<div class="pix-caixa"><b>${membro.pix ? 'Trocar a sua chave Pix' : '💠 Cadastre a sua chave Pix'}</b>
    <p class="sub">Assim, quando alguém for te pagar um gasto da turma, é só copiar a sua chave aqui. Só a turma vê.</p>
    <form class="pix-form" data-pix-form><input data-pix-in maxlength="100" autocomplete="off" placeholder="CPF, celular, e-mail ou chave aleatória" value="${esc(membro.pix || '')}">
      <button class="pri" type="submit">Salvar chave</button>${membro.pix ? '' : '<button type="button" data-pix-depois>Agora não</button>'}</form></div>`;
}

// Alerta pessoal: o que eu devo (com a chave Pix de quem recebe e o botão "Já paguei") e o que me devem.
export function alertaAcertos(r, eu, membros) {
  const devo = r.acertos.filter((a) => a.de === eu), recebo = r.acertos.filter((a) => a.para === eu);
  if (!devo.length && !recebo.length) return '<p class="sub">✓ Você não deve nada a ninguém, e ninguém te deve.</p>';
  const tot = (l) => brl(l.reduce((s, a) => s + a.valor, 0));
  return `${devo.length ? `<div class="pix-tit">Você deve ${tot(devo)}</div>${devo.map((a) => { const pix = pixDe(membros, a.para); return `<div class="acerto"><span>Pagar <b>${brl(a.valor)}</b> a <b>${esc(a.para)}</b>${pix ? `<br><span class="sub">Pix: ${esc(pix)}</span>` : `<br><span class="sub">${esc(a.para)} ainda não cadastrou o Pix</span>`}</span>
      <span class="linha-acao">${pix ? `<button class="pri" type="button" data-pix-copiar="${esc(pix)}">Copiar Pix</button>` : ''}<button type="button" data-quitar="${esc(a.de)}|${esc(a.para)}">✓ Já paguei</button></span></div>`; }).join('')}` : ''}
    ${recebo.length ? `<div class="pix-tit">A receber ${tot(recebo)}</div>${recebo.map((a) => `<div class="acerto"><span><b>${esc(a.de)}</b> te deve <b>${brl(a.valor)}</b></span><button type="button" data-quitar="${esc(a.de)}|${esc(a.para)}">✓ Recebi</button></div>`).join('')}` : ''}`;
}

// Liga os botões de caixaPix, alertaAcertos e de qualquer [data-pix-copiar] dentro de `raiz`.
// ctx: { db, uid, quem (nome), gastos: () => lista, toast, depois (re-render quando a caixa some) }
export function ligarPix(raiz, ctx) {
  raiz.querySelectorAll('[data-pix-copiar]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.pixCopiar); ctx.toast('Chave Pix copiada. Cole no app do banco.'); }
    catch { prompt('Copie a chave Pix:', b.dataset.pixCopiar); }
  }));
  raiz.querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', async () => {
    const [de, para] = b.dataset.quitar.split('|'), eu = ctx.quem;
    const txt = de === eu ? `Confirmar que você já pagou ${para}?` : para === eu ? `Confirmar que ${de} já te pagou?` : `Marcar como pago tudo o que está pendente entre ${de} e ${para}?`;
    if (!confirm(txt)) return;
    try { const n = await quitarPar(ctx.db, ctx.gastos(), de, para, eu); ctx.toast(n ? 'Marcado como pago' : 'Nada pendente entre os dois'); }
    catch (e) { ctx.toast('Não salvou: ' + (e.code || e.message)); }
  }));
  raiz.querySelectorAll('[data-pix-form]').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault(); const v = f.querySelector('[data-pix-in]').value.trim();
    if (v.length < 5) return ctx.toast('Escreva a chave Pix completa.');
    try { await salvarPix(ctx.db, ctx.uid, v); f.querySelector('[data-pix-in]').blur(); ctx.toast('Chave Pix salva'); ctx.depois(v); }
    catch (e2) { ctx.toast('Não salvou: ' + (e2.code || e2.message)); }
  }));
  raiz.querySelectorAll('[data-pix-depois]').forEach((b) => b.addEventListener('click', () => { try { sessionStorage.setItem(CHAVE_DEPOIS, '1'); } catch {} ctx.depois(); }));
  raiz.querySelectorAll('[data-pix-trocar]').forEach((b) => b.addEventListener('click', () => ctx.depois(undefined, true)));
}

// enquanto a pessoa digita a chave, não redesenha a tela (as atualizações do banco apagariam o que ela escreveu)
export const digitandoPix = () => !!document.activeElement?.matches?.('[data-pix-in]');
