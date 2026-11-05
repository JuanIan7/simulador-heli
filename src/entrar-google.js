// Login com Google. No computador, pela janela (popup). No celular, pela própria aba (redirecionamento), mas só quando o
// login passa pelo mesmo endereço do site (authDomain = juanian7.github.io, ver firebase-config.js): passando por
// simulador-heli.firebaseapp.com, os navegadores que separam o armazenamento por site (Safari, Chrome do iPhone, navegador de
// dentro do WhatsApp/Instagram) dão "Unable to process request due to missing initial state". Onde não dá, a saída é o navegador de verdade.
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';

const ua = navigator.userAgent;
const android = /Android/i.test(ua), iphone = /iPhone|iPad|iPod/i.test(ua);
// navegador de dentro de outro app (WhatsApp, Instagram, Facebook, Line, app do Google, WebView do Android), navegador embutido
// do iPhone (app do Claude e outros: o Safari de verdade, o Chrome e o Firefox do iPhone trazem "Safari/" no nome) ou atalho da tela de início
export const navegadorRuim = () => /FBAN|FBAV|Instagram|WhatsApp|Line\/|GSA\/|; wv\)/i.test(ua) || (iphone && !/Safari\//.test(ua)) || navigator.standalone === true;

// devolve null quando entrou ou a pessoa fechou a janela; 'navegador' quando este navegador não deixa; ou a mensagem de erro
export async function entrarGoogle(auth) {
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  // no celular, com o login no mesmo endereço do site, vai pela própria aba: a janela nova é que se perde no iPhone
  if ((android || iphone) && auth.config.authDomain === location.hostname) { await signInWithRedirect(auth, p); return null; }
  try { await signInWithPopup(auth, p); return null; }
  catch (e) {
    if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'].includes(e.code)) return null;
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) return 'navegador';
    return 'Não deu para entrar: ' + (e.code || e.message);
  }
}

// caixa "abra no Chrome/Safari", com botão que tenta abrir direto e outro que copia o link.
// Sem "forte" (navegador que parece bom) fica só uma linha: alguns navegadores embutidos não se identificam e dão "missing initial state".
export function avisoNavegador(forte, url = location.href) {
  if (!forte) return `<p class="sub aviso-navegador" style="margin-top:10px">Apareceu "missing initial state"? O link abriu dentro de outro app (Claude, WhatsApp...).
    <button type="button" data-copiar-link="${url.replace(/"/g, '&quot;')}">Copiar o link</button> e abra no ${iphone ? 'Safari' : 'Chrome'}.</p>`;
  const sem = url.replace(/^https:\/\//, '');
  const abrir = android ? `intent://${sem}#Intent;scheme=https;package=com.android.chrome;end` : iphone ? `x-safari-https://${sem}` : '';
  return `<div class="aviso-navegador" style="margin-top:10px;text-align:left">
    <p><b>Este navegador não deixa entrar com o Google.</b> Isso acontece quando o link abre dentro de outro app (Claude, WhatsApp, Instagram) ou pelo atalho da tela de início.
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
