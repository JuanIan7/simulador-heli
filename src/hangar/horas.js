// Ranking de horas de voo da turma (cartão do Início do Hangar): mostra quem tem mais e quem tem menos hora, para um ceder hora ao outro.
// Decisão do Juan (22/11/2026): todos entram automaticamente ao abrir o Hangar com pelo menos um voo lançado; quem quiser pode sair.
// Só o TOTAL vai para horasTurma/{uid} = { nome, minutos, em, fora? }; data, instrutor, matrícula e observações não saem do diário.
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const minutosDe = (voos) => Math.round((voos || []).reduce((t, v) => t + (Number(v.diurno) || 0) + (Number(v.noturno) || 0), 0));
export const hhmm = (m) => `${Math.floor((m || 0) / 60)}:${String((m || 0) % 60).padStart(2, '0')}`;

// Ordena do maior para o menor; quem empata fica na mesma posição.
export function montarRanking(lista) {
  const l = [...(lista || [])].sort((a, b) => (b.minutos || 0) - (a.minutos || 0) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  let pos = 0;
  return l.map((h, i) => { if (!i || (h.minutos || 0) !== (l[i - 1].minutos || 0)) pos = i + 1; return { ...h, minutos: h.minutos || 0, pos }; });
}

const nomes = (l) => l.map((h) => esc(h.nome)).join(', ');
export function cartaoHoras({ lista, uid, membros, erro }) {
  if (!lista) return '';                       // ainda carregando, ou regras do banco ainda não publicadas
  const r = montarRanking(lista.filter((h) => !h.fora)), maior = r[0]?.minutos || 0, menor = r.length ? r[r.length - 1].minutos : 0, dentro = r.some((h) => h.uid === uid), saiu = lista.some((h) => h.uid === uid && h.fora);
  const fora = (membros || []).filter((m) => !lista.some((h) => h.uid === m.uid)).map((m) => m.nome).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
  const linhas = r.map((h) => `<li class="hr-l${h.uid === uid ? ' eu' : ''}"><span class="hr-p">${h.pos}º</span><span class="hr-n">${esc(h.nome)}${h.uid === uid ? ' <small>você</small>' : ''}</span><span class="hr-b" aria-hidden="true"><i style="width:${maior ? Math.round(h.minutos / maior * 100) : 0}%"></i></span><b>${hhmm(h.minutos)}</b></li>`).join('');
  const resumo = r.length > 1 && maior !== menor
    ? `<p class="sub hr-res">Mais horas: <b>${nomes(r.filter((h) => h.minutos === maior))}</b> · Menos horas: <b>${nomes(r.filter((h) => h.minutos === menor))}</b> · diferença de <b>${hhmm(maior - menor)}</b></p>`
    : r.length > 1 ? '<p class="sub hr-res">Todos com as mesmas horas.</p>' : '';
  return `<div class="caixa hr"><div class="cab"><div class="rotulo">Ranking de horas de voo</div><button class="mini" data-ir="diario">Lançar voo</button></div>
    ${r.length ? `<ol class="hr-lista">${linhas}</ol>` : '<p class="sub">Ninguém entrou no ranking ainda.</p>'}${resumo}
    ${fora.length ? `<p class="sub">Ainda sem horas aqui: ${fora.map(esc).join(', ')}. Aparece ao abrir o Hangar com um voo lançado.</p>` : ''}
    ${erro ? `<p class="sub" style="color:var(--perigo)">Não consegui enviar as suas horas ao ranking (${esc(erro)}). Avise o Juan.</p>` : ''}
    ${dentro ? '<div class="hr-acao"><span class="sub">A turma vê só o total. Corrigiu o Diário, atualiza aqui.</span><button class="mini fantasma" data-hr-sair>Sair do ranking</button></div>'
      : saiu ? '<div class="hr-entrar"><p class="sub">Você saiu do ranking. A turma não vê as suas horas.</p><button class="mini pri" data-hr-entrar>Voltar ao ranking</button></div>'
      : '<p class="sub">Lance o seu primeiro voo no Diário para aparecer aqui.</p>'}</div>`;
}

// O que fazer com o total: nada, ou gravar. Só decide com diário e ranking lidos do servidor (nunca publica total incompleto nem desfaz um "sair").
export function precisaGravar(meu, nome, minutos) {
  if (!meu) return minutos > 0;
  return !meu.fora && (meu.minutos !== minutos || meu.nome !== nome);
}
export function sincronizarHoras({ db, uid, nome, voos, pronto, lista, aoFalhar }) {
  if (!pronto || !lista || !uid || !nome) return;
  const meu = lista.find((h) => h.uid === uid), minutos = minutosDe(voos);
  if (precisaGravar(meu, nome, minutos)) setDoc(doc(db, 'horasTurma', uid), { nome, minutos, em: serverTimestamp() }).catch((e) => aoFalhar?.(e.code || e.message));
}

export function ligarHoras(c, { db, uid, nome, voos, voosProntos, toast }) {
  const entrar = c.querySelector('[data-hr-entrar]'), sair = c.querySelector('[data-hr-sair]');
  if (entrar) entrar.onclick = async () => {
    if (!voosProntos()) return toast('Ainda lendo o seu diário. Tente de novo em instantes.');
    entrar.disabled = true;
    try { await setDoc(doc(db, 'horasTurma', uid), { nome, minutos: minutosDe(voos()), em: serverTimestamp() }); toast('Você voltou ao ranking de horas.'); }
    catch (e) { entrar.disabled = false; toast('Não deu: ' + (e.code || e.message)); }
  };
  if (sair) sair.onclick = async () => {
    if (sair.dataset.ok !== '1') { sair.dataset.ok = '1'; sair.textContent = 'Sair mesmo?'; return; }
    sair.disabled = true;
    try { await setDoc(doc(db, 'horasTurma', uid), { nome, minutos: 0, fora: true, em: serverTimestamp() }); toast('Você saiu do ranking.'); }
    catch (e) { sair.disabled = false; toast('Não deu: ' + (e.code || e.message)); }
  };
}
