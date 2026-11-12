// Contas dos gastos da turma e chave Pix de cada um. Usado pela página de gastos e pelo Início do Hangar da Turma.
// A chave Pix fica em gastosMembros/{uid}.pix: cada um grava a sua, e todos do grupo leem para copiar na hora de pagar.
// Acerto em dois passos: quem deve avisa que pagou (gastos/{id}.informados[]) e só quem recebe confirma (quitados[]).
import { doc, writeBatch, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { partesParaAvisar, partesParaQuitar } from './acerto.js';
export const hojeIso = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const brl = (c) => ((c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function partes(g) {
  const ps = g.participantes || [], n = ps.length, base = n ? Math.floor((g.valor || 0) / n) : 0, sobra = n ? (g.valor || 0) - base * n : 0;
  return ps.map((p, i) => ({ nome: p, valor: base + (i < sobra ? 1 : 0), pagador: !!g.pagoPor && p === g.pagoPor, quitado: !g.pagoPor || p === g.pagoPor || (g.quitados || []).includes(p), informado: (g.informados || []).includes(p) }));
}
export function calcular(lista) {
  const r = { total: 0, pendente: 0, porCat: {}, pessoa: {}, deve: {}, cnt: {}, inf: {} };
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
      const k = p.nome + '→' + g.pagoPor; r.deve[k] = (r.deve[k] || 0) + p.valor; r.cnt[k] = (r.cnt[k] || 0) + 1; if (p.informado) r.inf[k] = (r.inf[k] || 0) + 1;
    }
  }
  // Compensa quem deve um para o outro: sobra só a diferença de cada par.
  r.acertos = [];
  const visto = new Set();
  for (const k of Object.keys(r.deve)) {
    const [a, b] = k.split('→'); const par = [a, b].sort().join('|');
    if (visto.has(par)) continue; visto.add(par);
    const liq = (r.deve[a + '→' + b] || 0) - (r.deve[b + '→' + a] || 0);
    if (!liq) continue;
    const [de, para] = liq > 0 ? [a, b] : [b, a], kk = de + '→' + para;
    // "inf": o devedor já avisou que pagou todas as partes que compõem o acerto
    r.acertos.push({ de, para, valor: Math.abs(liq), inf: (r.cnt[kk] || 0) > 0 && (r.inf[kk] || 0) >= (r.cnt[kk] || 0) });
  }
  r.acertos.sort((x, y) => y.valor - x.valor);
  return r;
}

// Quita todas as partes pendentes entre duas pessoas (nos dois sentidos, porque o acerto já é a diferença). Devolve quantas.
export async function quitarPar(db, gastos, a, b, quem) {
  const lote = writeBatch(db); let n = 0;
  for (const { g, devedor } of partesParaQuitar(gastos, a, b)) {
    // set+merge (e não update) porque o nome pode ter espaço ou acento, o que não cabe num caminho "quitadosEm.Nome"
    lote.set(doc(db, 'gastos', g.id), { quitados: arrayUnion(devedor), quitadosEm: { [devedor]: hojeIso() }, atualizadoPor: quem, atualizadoEm: serverTimestamp() }, { merge: true }); n++;
  }
  if (n) await lote.commit();
  return n;
}

// O devedor avisa que pagou (ou desfaz o aviso). Só o sentido dele: confirmar o recebimento é do outro lado.
export async function informarPar(db, gastos, de, para, quem, desfazer = false) {
  if (quem !== de) throw new Error('o aviso de pagamento é de quem paga');
  const lote = writeBatch(db); let n = 0;
  for (const g of partesParaAvisar(gastos, de, para)) {
    if (desfazer === (g.informados || []).includes(de)) { lote.update(doc(db, 'gastos', g.id), { informados: desfazer ? arrayRemove(de) : arrayUnion(de), atualizadoPor: quem, atualizadoEm: serverTimestamp() }); n++; }
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
  const par = (a) => `${esc(a.de)}|${esc(a.para)}`;
  return `${devo.length ? `<div class="pix-tit">Você deve ${tot(devo)}</div>${devo.map((a) => { const pix = pixDe(membros, a.para); return a.inf
      ? `<div class="acerto"><span>⏳ Você avisou que pagou <b>${brl(a.valor)}</b> a <b>${esc(a.para)}</b><br><span class="sub">fica em aberto até ${esc(a.para)} confirmar que recebeu</span></span><button type="button" data-desinformar="${par(a)}">Desfazer</button></div>`
      : `<div class="acerto"><span>Pagar <b>${brl(a.valor)}</b> a <b>${esc(a.para)}</b>${pix ? `<br><span class="sub">Pix: ${esc(pix)}</span>` : `<br><span class="sub">${esc(a.para)} ainda não cadastrou o Pix</span>`}</span>
      <span class="linha-acao">${pix ? `<button class="pri" type="button" data-pix-copiar="${esc(pix)}">Copiar Pix</button>` : ''}<button type="button" data-informar="${par(a)}">✓ Já paguei</button></span></div>`; }).join('')}` : ''}
    ${recebo.length ? `<div class="pix-tit">A receber ${tot(recebo)}</div>${recebo.map((a) => a.inf
      ? `<div class="acerto"><span>💰 <b>${esc(a.de)}</b> avisou que te pagou <b>${brl(a.valor)}</b><br><span class="sub">confira no banco e confirme</span></span><button class="pri" type="button" data-quitar="${par(a)}">✓ Recebi, confirmar</button></div>`
      : `<div class="acerto"><span><b>${esc(a.de)}</b> te deve <b>${brl(a.valor)}</b></span><button type="button" data-quitar="${par(a)}">✓ Já recebi</button></div>`).join('')}` : ''}`;
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
    if (!confirm(para === eu ? `Confirmar que ${de} já te pagou? Isso quita tudo o que está pendente entre vocês dois.` : `Marcar como pago tudo o que está pendente entre ${de} e ${para}?`)) return;
    try { const n = await quitarPar(ctx.db, ctx.gastos(), de, para, eu); ctx.toast(n ? 'Confirmado: acerto quitado' : 'Nada pendente entre os dois'); }
    catch (e) { ctx.toast('Não salvou: ' + (e.code || e.message)); }
  }));
  raiz.querySelectorAll('[data-informar],[data-desinformar]').forEach((b) => b.addEventListener('click', async () => {
    const desfazer = 'desinformar' in b.dataset, [de, para] = (b.dataset.informar || b.dataset.desinformar).split('|');
    try { const n = await informarPar(ctx.db, ctx.gastos(), de, para, ctx.quem, desfazer); ctx.toast(desfazer ? 'Aviso desfeito' : n ? `${para} vai ver o aviso e confirmar quando receber` : 'Nada pendente entre os dois'); }
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
