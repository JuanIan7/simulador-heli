// Conta Google + progresso no Firebase (Firestore). Carregado sob demanda: o jogo abre sem esperar o Firebase.
// Coleções: jogadores/{uid} (apelido e progresso, lido por todos os logados para o ranking)
//           privado/{uid}  (e-mail e acessos, só o dono e o desenvolvedor). Regras em firestore.rules.
// Sincronia: o progresso do aparelho e o da conta se somam (melhor estrela de cada fase, melhor tempo de cada rota).
// Quando o desenvolvedor zera uma conta, grava `resetEm`; o aparelho que ainda não viu esse reset troca o progresso local pelo da nuvem.
import { FIREBASE_CONFIG, ADMINS } from './firebase-config.js';
import { estado } from './estado.js';

const nativo = () => !!window.Capacitor?.isNativePlatform?.();
export const disponivel = () => !!FIREBASE_CONFIG && !nativo();
export const conta = { user: null, perfil: null, pronto: false, erro: null };
export const ehAdmin = () => !!conta.user && conta.user.emailVerified && ADMINS.includes((conta.user.email || '').toLowerCase());

let fb = null, ouvintes = [], pararDoc = null, envio = null;
const avisar = () => ouvintes.forEach(f => { try { f(conta); } catch {} });
export function aoMudarConta(f) { ouvintes.push(f); return () => { ouvintes = ouvintes.filter(x => x !== f); }; }

async function carregar() {
  if (fb) return fb;
  const [app, auth, fs] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
  const a = app.initializeApp(FIREBASE_CONFIG);
  fb = { auth: auth.getAuth(a), db: fs.getFirestore(a), A: auth, F: fs };
  fb.auth.languageCode = 'pt';
  return fb;
}

// chamado uma vez no início: liga o ouvinte de login (sem abrir janela nenhuma)
export async function iniciarNuvem() {
  if (!disponivel()) { conta.pronto = true; return; }
  try {
    const { auth, A } = await carregar();
    A.getRedirectResult(auth).catch(() => {});
    A.onAuthStateChanged(auth, async (u) => {
      conta.user = u; conta.perfil = null; pararDoc?.(); pararDoc = null;
      if (u) { try { await sincronizarEntrada(u); } catch (e) { conta.erro = 'Não foi possível ler o seu progresso na nuvem (' + (e.code || e.message) + ').'; } }
      conta.pronto = true; avisar();
    });
  } catch (e) { conta.erro = 'Não foi possível carregar o login.'; conta.pronto = true; avisar(); }
}

export async function entrar() {
  const { auth, A } = await carregar();
  const prov = new A.GoogleAuthProvider(); prov.setCustomParameters({ prompt: 'select_account' });
  try { await A.signInWithPopup(auth, prov); }
  catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return A.signInWithRedirect(auth, prov);
    if (e.code === 'auth/popup-closed-by-user') return;
    throw e;
  }
}
export async function sair() {
  const { auth, A } = await carregar(); pararDoc?.(); pararDoc = null;
  await A.signOut(auth);
  estado.trocarProgresso({}, { uid: null, resetVisto: 0 }); // o progresso fica guardado na conta; o aparelho volta a zero
}

const maxObj = (a = {}, b = {}) => { const o = { ...a }; for (const k in b) o[k] = Math.max(o[k] || 0, b[k] || 0); return o; };
function somarRotas(a = {}, b = {}) {
  const o = { ...a };
  for (const k in b) { const x = o[k] || { estrelas: 0, tempo: null }, y = b[k]; o[k] = { estrelas: Math.max(x.estrelas || 0, y.estrelas || 0), tempo: x.tempo == null ? y.tempo ?? null : y.tempo == null ? x.tempo : Math.min(x.tempo, y.tempo) }; }
  return o;
}
function resumo(p) {
  const totalFases = Object.values(p.estrelas || {}).reduce((a, b) => a + b, 0);
  const totalRotas = Object.values(p.rotas || {}).reduce((a, r) => a + (r.estrelas || 0), 0);
  const provas = p.provas || [], melhorProva = provas.length ? Math.max(...provas.map(x => Math.round(x.acertos / x.total * 100))) : null;
  return { totalFases, totalRotas, pontos: totalFases + totalRotas, melhorProva };
}

async function sincronizarEntrada(u) {
  const { db, F } = await carregar();
  const ref = F.doc(db, 'jogadores', u.uid), snap = await F.getDoc(ref);
  const nuvem = snap.exists() ? snap.data() : null, local = estado.dados;
  let p;
  if (!nuvem) p = local.uid && local.uid !== u.uid ? {} : estado.progresso(); // aparelho de outra pessoa: começa do zero
  else if ((local.uid && local.uid !== u.uid) || (nuvem.resetEm && nuvem.resetEm > (local.resetVisto || 0))) p = nuvem; // outra conta neste aparelho, ou conta zerada pelo desenvolvedor
  else { const l = estado.progresso(); p = { estrelas: maxObj(nuvem.estrelas, l.estrelas), rotas: somarRotas(nuvem.rotas, l.rotas), provas: [...(nuvem.provas || []), ...l.provas.filter(x => !(nuvem.provas || []).some(y => y.data === x.data))].slice(-20), jogadas: Math.max(nuvem.jogadas || 0, l.jogadas) }; }
  estado.trocarProgresso(p, { uid: u.uid, resetVisto: nuvem?.resetEm || local.resetVisto || 0 });
  conta.perfil = nuvem ? { apelido: nuvem.apelido } : null;
  await F.setDoc(F.doc(db, 'privado', u.uid), { email: u.email, nome: u.displayName || '', ultimoAcesso: F.serverTimestamp(), ...(nuvem ? {} : { criadoEm: F.serverTimestamp() }) }, { merge: true });
  if (nuvem) await enviar();
  ouvirReset(u.uid);
}

// o desenvolvedor pode zerar a conta com o jogo aberto: o aparelho percebe e troca o progresso local
function ouvirReset(uid) {
  const { db, F } = fb;
  pararDoc = F.onSnapshot(F.doc(db, 'jogadores', uid), (s) => {
    const d = s.data(); if (!d) return;
    conta.perfil = { apelido: d.apelido };
    if (d.resetEm && d.resetEm > (estado.dados.resetVisto || 0)) { estado.trocarProgresso(d, { resetVisto: d.resetEm }); avisar(); }
  }, () => {});
}

export async function definirApelido(apelido) {
  const { db, F } = await carregar(); const u = conta.user; if (!u) return;
  apelido = String(apelido || '').trim().slice(0, 24);
  if (apelido.length < 2) throw new Error('O apelido precisa ter pelo menos 2 letras.');
  conta.perfil = { apelido };
  await F.setDoc(F.doc(db, 'jogadores', u.uid), { apelido }, { merge: true });
  await enviar(); avisar();
}

// grava o progresso do aparelho na conta (chamado a cada fase/rota concluída, com um pequeno atraso para juntar gravações)
async function enviar() {
  const u = conta.user; if (!u || !conta.perfil) return;
  const { db, F } = await carregar(); const p = estado.progresso();
  await F.setDoc(F.doc(db, 'jogadores', u.uid), { apelido: conta.perfil.apelido, ...p, ...resumo(p), atualizadoEm: F.serverTimestamp() }, { merge: true });
}
estado.aoMudar = () => { if (!conta.user) return; clearTimeout(envio); envio = setTimeout(() => enviar().catch(() => {}), 1500); };

// ---- ranking e administração ----
export async function listarJogadores() {
  const { db, F } = await carregar();
  const s = await F.getDocs(F.query(F.collection(db, 'jogadores'), F.limit(300)));
  return s.docs.map(d => ({ uid: d.id, ...d.data() }));
}
export async function listarPrivado() {
  const { db, F } = await carregar();
  const s = await F.getDocs(F.collection(db, 'privado'));
  const o = {}; s.docs.forEach(d => { o[d.id] = d.data(); }); return o;
}
export async function zerarJogador(uid) {
  const { db, F } = await carregar(); const ref = F.doc(db, 'jogadores', uid), s = await F.getDoc(ref);
  const vazio = { estrelas: {}, rotas: {}, provas: [], jogadas: 0 };
  await F.setDoc(ref, { apelido: s.data()?.apelido || 'Jogador', ...vazio, ...resumo(vazio), resetEm: Date.now(), atualizadoEm: F.serverTimestamp() });
  if (uid === conta.user?.uid) estado.trocarProgresso(vazio, { resetVisto: Date.now() });
}
export async function apagarJogador(uid) {
  const { db, F } = await carregar();
  await F.deleteDoc(F.doc(db, 'jogadores', uid)); await F.deleteDoc(F.doc(db, 'privado', uid));
}
