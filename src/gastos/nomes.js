// Cada nome da turma tem um dono só: gastosNomes/{codigo}|{nome} = { uid, email }.
// Quem entra escolhe um nome livre; o banco recusa um nome que já é de outra conta (regras em firestore.rules).
// Usado pela página de gastos e pelo Hangar da Turma.
import { doc, getDoc, updateDoc, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const idNome = (codigo, nome) => `${codigo}|${nome}`;

// Quais nomes da lista já são de outra conta: { nome: true }.
export async function nomesOcupados(db, codigo, pessoas, uid) {
  const ocup = {};
  await Promise.all((pessoas || []).map(async (p) => {
    try { const s = await getDoc(doc(db, 'gastosNomes', idNome(codigo, p))); if (s.exists() && s.data().uid !== uid) ocup[p] = true; } catch {}
  }));
  return ocup;
}

// Lista de nomes sem nenhum marcado: a pessoa precisa escolher. Os nomes ocupados aparecem, mas bloqueados.
export const opcoesNomes = (pessoas, ocup) => `<option value="?" selected disabled>Escolha o seu nome…</option>${(pessoas || []).map((p) => `<option value="${esc(p)}"${ocup[p] ? ' disabled' : ''}>${esc(p)}${ocup[p] ? ' (já entrou)' : ''}</option>`).join('')}<option value="">Outro nome…</option>`;

// Reserva o nome e cria o cadastro juntos. Se o nome já for de outra conta, o banco recusa e nada é gravado.
export async function entrarComNome(db, user, codigo, nome, pessoas) {
  const lote = writeBatch(db);
  lote.set(doc(db, 'gastosNomes', idNome(codigo, nome)), { uid: user.uid, email: user.email || '', codigo, nome, em: serverTimestamp() });
  lote.set(doc(db, 'gastosMembros', user.uid), { nome, email: user.email, codigo, entrouEm: serverTimestamp() });
  await lote.commit();
  // depois do cadastro, porque só quem já é da turma pode acrescentar nome à lista
  if (!(pessoas || []).includes(nome)) await updateDoc(doc(db, 'gastosConvites', codigo), { pessoas: arrayUnion(nome) });
}

export const erroNome = (e) => (e?.code === 'permission-denied' ? 'Esse nome já é de outra pessoa da turma. Escolha o seu.' : 'Não deu para entrar: ' + (e?.code || e?.message));
