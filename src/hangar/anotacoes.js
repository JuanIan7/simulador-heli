// Anotações da turma (aba Anotações do Hangar): o que queremos fazer, lugar para ir, tarefa para depois, ideia.
// Banco: anotacoes/{id} = { texto, tipo, quando, feito, feitoPor, nome, autor, em }. Todos os membros veem e acrescentam.
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const limpa = (t, n) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const u = encodeURIComponent;

export const TIPOS = { fazer: '🎯 Queremos fazer', lugar: '📍 Lugar para ir', tarefa: '✅ Tarefa para depois', ideia: '💡 Ideia', outros: '📝 Outros' };
const DICA = { fazer: 'Ex.: churrasco no fim do módulo, assistir ao pouso do Esquilo', lugar: 'Ex.: Jardim Botânico, Ópera de Arame, pizzaria perto do aeródromo', tarefa: 'Ex.: renovar o carro até 25/11, comprar gás', ideia: 'Ex.: revezar quem cozinha, grupo de estudo à noite', outros: 'O que mais quiser guardar' };
let verFeitos = false;

function linha(a) {
  const mapa = a.tipo === 'lugar' && !a.feito ? `<a class="btn mini" href="https://www.google.com/maps/search/?api=1&query=${u(a.texto + ' Curitiba PR')}" target="_blank" rel="noopener">🗺️ Mapa</a>` : '';
  return `<div class="cp-item${a.feito ? ' cp-feito' : ''}">
    <div class="cp-lin">
      <button class="cp-check" data-an-feito="${a.id}" aria-label="${a.feito ? 'Voltar para a lista' : 'Marcar como feito'}">${a.feito ? '✓' : ''}</button>
      <div class="cp-txt"><b>${esc(a.texto)}</b>${a.quando ? ` <span class="chip">📅 ${esc(a.quando)}</span>` : ''}
        <div class="sub">${esc(TIPOS[a.tipo] || TIPOS.outros)} · anotou ${esc(a.nome || '')}${a.feito && a.feitoPor ? ` · feito por ${esc(a.feitoPor)}` : ''}</div></div>
      ${mapa}<button class="mini" data-an-del="${a.id}" aria-label="Apagar anotação">✕</button>
    </div></div>`;
}

export function telaAnotacoes(anotacoes, erro) {
  const abertas = anotacoes.filter((a) => !a.feito), feitas = anotacoes.filter((a) => a.feito);
  const grupos = Object.keys(TIPOS).map((k) => [k, abertas.filter((a) => (TIPOS[a.tipo] ? a.tipo : 'outros') === k)]).filter(([, l]) => l.length);
  return `<div class="caixa"><h2>Anotações da turma</h2>
    <p class="sub">O que queremos fazer, lugar para conhecer, tarefa para depois, ideia que surgiu. Todo mundo vê e acrescenta; quem fizer marca o ✓.</p>
    <form id="anForm" class="form">
      <label class="largo">Anotação<input id="anTexto" maxlength="300" placeholder="${esc(DICA.fazer)}" required autocomplete="off"></label>
      <label>Tipo<select id="anTipo">${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
      <label>Quando (se tiver)<input id="anQuando" maxlength="40" placeholder="Ex.: sábado, antes de 25/11"></label>
      <div class="largo linha-acao"><button class="pri" type="submit">Anotar</button></div>
    </form>${erro ? `<p class="sub" style="color:var(--perigo)">${esc(erro)}</p>` : ''}</div>
  <div class="caixa"><div class="cab"><h3>Pendentes (${abertas.length})</h3></div>
    ${grupos.length ? grupos.map(([k, l]) => `<div class="rotulo cp-cat">${esc(TIPOS[k])}</div>${l.map(linha).join('')}`).join('') : '<p class="sub">Nenhuma anotação ainda. Escreva a primeira acima.</p>'}</div>
  ${feitas.length ? `<div class="caixa"><div class="cab"><h3>Já feitas (${feitas.length})</h3><span class="linha-acao"><button class="mini" data-an-ver>${verFeitos ? 'Esconder' : 'Mostrar'}</button><button class="mini" data-an-limpar>Limpar feitas</button></span></div>
    ${verFeitos ? feitas.map(linha).join('') : ''}</div>` : ''}`;
}

// ctx: { db, user, membro, anotacoes: () => lista, toast, render }
export function ligarAnotacoes(c, ctx) {
  const { db, toast, render } = ctx, achar = (id) => ctx.anotacoes().find((x) => x.id === id);
  const tipo = c.querySelector('#anTipo'), texto = c.querySelector('#anTexto');
  tipo.onchange = () => { texto.placeholder = DICA[tipo.value] || ''; };
  c.querySelector('#anForm').onsubmit = async (e) => {
    e.preventDefault();
    const t = limpa(texto.value, 300); if (t.length < 2) return toast('Escreva a anotação.');
    try {
      await addDoc(collection(db, 'anotacoes'), { texto: t, tipo: tipo.value, quando: limpa(c.querySelector('#anQuando').value, 40), feito: false, nome: ctx.membro().nome, autor: ctx.user().uid, em: serverTimestamp() });
      texto.value = ''; c.querySelector('#anQuando').value = ''; toast('Anotado.');
    } catch (e2) { toast('Não salvou: ' + (e2.code || e2.message)); }
  };
  c.querySelectorAll('[data-an-feito]').forEach((b) => b.onclick = async () => {
    const it = achar(b.dataset.anFeito); if (!it) return;
    try { await updateDoc(doc(db, 'anotacoes', it.id), { feito: !it.feito, feitoPor: it.feito ? '' : ctx.membro().nome, feitoEm: serverTimestamp() }); }
    catch (e2) { toast('Não salvou: ' + (e2.code || e2.message)); }
  });
  c.querySelectorAll('[data-an-del]').forEach((b) => b.onclick = () => { const it = achar(b.dataset.anDel); if (it && confirm(`Apagar "${it.texto}"?`)) deleteDoc(doc(db, 'anotacoes', it.id)).catch(() => toast('Não deu para apagar.')); });
  c.querySelector('[data-an-ver]')?.addEventListener('click', () => { verFeitos = !verFeitos; render(); });
  c.querySelector('[data-an-limpar]')?.addEventListener('click', async () => {
    const f = ctx.anotacoes().filter((x) => x.feito); if (!f.length || !confirm(`Apagar as ${f.length} anotações já feitas?`)) return;
    const lote = writeBatch(db); f.forEach((x) => lote.delete(doc(db, 'anotacoes', x.id)));
    try { await lote.commit(); toast('Feitas apagadas'); } catch (e2) { toast('Não deu: ' + (e2.code || e2.message)); }
  });
}

// enquanto alguém digita, a tela não redesenha (as mudanças do banco apagariam o que está sendo escrito)
export const digitandoAnotacoes = () => !!document.activeElement?.matches?.('#anTexto,#anQuando');
