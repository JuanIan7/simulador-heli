// Controle de entrada dos campos de texto (Diário, Gastos, Hangar e apelido do jogo).
// Uso: no HTML, <input data-m="matricula">; depois de montar a tela, ligarMascaras(raiz).
// A máscara age enquanto a pessoa digita; limpar()/validar na hora de salvar garante o mesmo no que vai para o banco.
// Não há SQL no projeto (o banco é o Firestore). Os riscos reais são HTML injetado (resolvido com esc() na exibição),
// fórmula injetada nos CSV (resolvido com celulaCsv) e lixo/tamanho exagerado no banco (resolvido aqui e em firestore.rules).

const CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g;

/** Texto livre: tira caracteres de controle/invisíveis e < > ` { }, junta espaços repetidos e corta no tamanho. */
export function limpar(s, max = 200, { multilinha = false } = {}) {
  let t = String(s ?? '').normalize('NFC').replace(CONTROLE, '').replace(/[<>`{}]/g, '');
  t = multilinha ? t.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : t.replace(/\s+/g, ' ');
  return t.trim().slice(0, max);
}

/** Nome de pessoa: letras (com acento), espaço, ponto, apóstrofo e hífen. */
export const limparNome = (s, max = 60) => limpar(s, max).replace(/[^\p{L}\p{M} .'-]/gu, '').replace(/\s+/g, ' ').trim();

/** Matrícula: PR-ABC (Brasil: duas letras de nacionalidade + hífen + três letras). Estrangeira até 7 caracteres. */
export function formatarMatricula(s) {
  const c = String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  return c.length > 2 ? c.slice(0, 2) + '-' + c.slice(2) : c;
}
export const matriculaValida = (s) => !s || /^[A-Z0-9]{2}-[A-Z0-9]{1,5}$/.test(s);

/** Código ICAO de aeródromo/heliponto: 4 letras ou números, caixa alta. */
export const formatarIcao = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
export const icaoValido = (s) => !s || /^[A-Z0-9]{4}$/.test(s);

/** Modelo de aeronave (R22, AS350 B2): caixa alta, letras, números, espaço, hífen e barra. */
export const formatarModelo = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9 \-/]/g, '').replace(/\s+/g, ' ').slice(0, 20);

/** Só dígitos, com limite. */
export const soDigitos = (s, max) => String(s ?? '').replace(/\D/g, '').slice(0, max);

/** Duração h:min enquanto digita: "130" → "1:30", "0145" → "01:45". */
export function formatarDuracao(s) {
  const d = soDigitos(s, 4);
  return d.length <= 2 ? d : d.slice(0, -2) + ':' + d.slice(-2);
}
/** Ao sair do campo: normaliza para HH:MM; minutos ≥ 60 viram horas ("0:75" → "01:15"). Vazio fica vazio. */
export function fecharDuracao(s) {
  const t = String(s ?? '').trim(); if (!t) return '';
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(t), min = m ? (+m[1]) * 60 + (+m[2]) : /^\d+$/.test(t) ? +t : null;
  if (min == null) return '';
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}

/** Dinheiro em reais enquanto digita: só dígitos e uma vírgula, no máximo 2 casas. */
export function formatarDinheiro(s) {
  let t = String(s ?? '').replace(/\./g, ',').replace(/[^\d,]/g, '');
  const i = t.indexOf(',');
  if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/,/g, '').slice(0, 2);
  return t.replace(/^0+(?=\d)/, '').slice(0, 10);
}

/** Data ISO (AAAA-MM-DD) que existe de verdade e está entre min e max (também ISO). */
export function dataValida(iso, min = '2000-01-01', max = '2100-12-31') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return false;
  const [a, m, d] = iso.split('-').map(Number), dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && iso >= min && iso <= max;
}
export const hojeIso = (dias = 0) => { const d = new Date(); d.setDate(d.getDate() + dias); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

/** Link: só https (bloqueia javascript:, data: etc.). Devolve a URL normalizada ou ''. */
export function linkSeguro(s) {
  try { const u = new URL(String(s ?? '').trim()); return u.protocol === 'https:' ? u.href.slice(0, 1000) : ''; } catch { return ''; }
}

/** Célula de CSV: aspas escapadas e, se começar com = + - @ (fórmula no Excel/Sheets), prefixa com apóstrofo. */
export function celulaCsv(x) {
  let s = String(x ?? '');
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

// ---------- Máscaras ao vivo ----------
const MASCARAS = {
  matricula: { f: formatarMatricula, attrs: { autocapitalize: 'characters', maxlength: 8, spellcheck: 'false', autocomplete: 'off' } },
  icao: { f: formatarIcao, attrs: { autocapitalize: 'characters', maxlength: 4, spellcheck: 'false', autocomplete: 'off' } },
  modelo: { f: formatarModelo, attrs: { autocapitalize: 'characters', maxlength: 20, spellcheck: 'false' } },
  canac: { f: (s) => soDigitos(s, 6), attrs: { inputmode: 'numeric', maxlength: 6, autocomplete: 'off' } },
  duracao: { f: formatarDuracao, fim: fecharDuracao, attrs: { inputmode: 'numeric', maxlength: 5, autocomplete: 'off' } },
  dinheiro: { f: formatarDinheiro, attrs: { inputmode: 'decimal', maxlength: 10, autocomplete: 'off' } },
  inteiro: { f: (s) => soDigitos(s, 3), attrs: { inputmode: 'numeric' } },
  nome: { f: (s) => s.replace(/[^\p{L}\p{M} .'-]/gu, '').replace(/\s{2,}/g, ' '), fim: (s) => limparNome(s), attrs: { autocapitalize: 'words', spellcheck: 'false' } },
  texto: { f: (s) => s.replace(CONTROLE, '').replace(/[<>`{}]/g, ''), fim: (s, el) => limpar(s, +el.maxLength > 0 ? el.maxLength : 200, { multilinha: el.tagName === 'TEXTAREA' }) },
  maiusculo: { f: (s) => s.toUpperCase().replace(CONTROLE, '').replace(/[<>`{}]/g, ''), attrs: { autocapitalize: 'characters', spellcheck: 'false' } },
  codigo: { f: (s) => s.replace(/\s/g, '').replace(CONTROLE, '').replace(/[<>`{}"']/g, ''), attrs: { autocapitalize: 'off', spellcheck: 'false', autocomplete: 'off' } },
};

function aplicar(el, f) {
  const antes = el.value, novo = f(antes, el);
  if (novo === antes) return;
  // mantém o cursor no lugar certo: conta quantos caracteres "úteis" havia antes do cursor
  const pos = el.selectionStart ?? antes.length, uteis = f(antes.slice(0, pos), el).length;
  el.value = novo;
  try { if (document.activeElement === el) el.setSelectionRange(uteis, uteis); } catch { /* type=email/number não deixam */ }
}

/** Liga as máscaras em todo campo com data-m dentro de raiz. Pode chamar de novo a cada tela (não duplica). */
export function ligarMascaras(raiz = document) {
  raiz.querySelectorAll('[data-m]').forEach((el) => {
    const m = MASCARAS[el.dataset.m]; if (!m || el.dataset.mLigado) return;
    el.dataset.mLigado = '1';
    for (const [k, v] of Object.entries(m.attrs || {})) if (!el.hasAttribute(k)) el.setAttribute(k, v);
    let compondo = false; // teclado com acento/IME: espera terminar de compor a letra
    el.addEventListener('compositionstart', () => { compondo = true; });
    el.addEventListener('compositionend', () => { compondo = false; aplicar(el, m.f); });
    el.addEventListener('input', () => { if (!compondo) aplicar(el, m.f); });
    el.addEventListener('blur', () => { if (m.fim) el.value = m.fim(el.value, el); });
    if (el.value) { el.value = m.f(el.value, el); if (m.fim) el.value = m.fim(el.value, el); }
  });
  // campos de data: limita o intervalo e recusa data inexistente (o navegador já não aceita letras)
  raiz.querySelectorAll('input[type="date"]').forEach((el) => {
    if (!el.min) el.min = '2000-01-01';
    if (!el.max) el.max = '2100-12-31';
    if (el.dataset.mLigado) return; el.dataset.mLigado = '1';
    el.addEventListener('change', () => el.setCustomValidity(!el.value || dataValida(el.value, el.min, el.max) ? '' : `Data fora do intervalo (${el.min.split('-').reverse().join('/')} a ${el.max.split('-').reverse().join('/')}).`));
  });
}
