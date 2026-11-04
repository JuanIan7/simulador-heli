// Login com Google sempre pela janela (popup), nunca por redirecionamento.
// O redirecionamento passa por simulador-heli.firebaseapp.com e volta para o github.io: nos navegadores que
// separam o armazenamento por site (Safari, Chrome novo, navegador de dentro do WhatsApp/Instagram) ele quebra
// com "Unable to process request due to missing initial state". Onde a janela não abre, a saída é o navegador de verdade.
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const ua = navigator.userAgent;
const android = /Android/i.test(ua), iphone = /iPhone|iPad|iPod/i.test(ua);
// navegador de dentro de outro app (WhatsApp, Instagram, Facebook, Line, app do Google, WebView do Android) ou atalho da tela de início do iPhone
export const navegadorRuim = () => /FBAN|FBAV|Instagram|WhatsApp|Line\/|GSA\/|; wv\)/i.test(ua) || navigator.standalone === true;

// devolve null quando entrou ou a pessoa fechou a janela; 'navegador' quando este navegador não deixa; ou a mensagem de erro
export async function entrarGoogle(auth) {
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, p); return null; }
  catch (e) {
    if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'].includes(e.code)) return null;
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) return 'navegador';
    return 'Não deu para entrar: ' + (e.code || e.message);
  }
}

// caixa "abra no Chrome/Safari", com botão que tenta abrir direto e outro que copia o link
export function avisoNavegador(url = location.href) {
  const sem = url.replace(/^https:\/\//, '');
  const abrir = android ? `intent://${sem}#Intent;scheme=https;package=com.android.chrome;end` : iphone ? `x-safari-https://${sem}` : '';
  return `<div class="aviso-navegador" style="margin-top:10px;text-align:left">
    <p><b>Este navegador não deixa entrar com o Google.</b> Isso acontece quando o link abre dentro do WhatsApp, do Instagram ou pelo atalho da tela de início.
    Abra no ${iphone ? 'Safari' : 'Chrome'} e entre de novo por lá.</p>
    <p style="display:flex;gap:8px;flex-wrap:wrap">${abrir ? `<button class="pri" type="button" data-abrir-em="${abrir}">Abrir no ${iphone ? 'Safari' : 'Chrome'}</button>` : ''}
    <button type="button" data-copiar-link="${url.replace(/"/g, '&quot;')}">Copiar o link</button></p></div>`;
}
export function ligarAviso(raiz = document) {
  raiz.querySelectorAll('[data-abrir-em]').forEach((b) => b.addEventListener('click', () => { location.href = b.dataset.abrirEm; }));
  raiz.querySelectorAll('[data-copiar-link]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copiarLink); b.textContent = 'Link copiado: cole no navegador'; }
    catch { prompt('Copie o link e cole no navegador:', b.dataset.copiarLink); }
  }));
}
