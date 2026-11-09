// Lançar gasto falando: "almoço 42 e 50", "uber 38 reais", "mercado 120 ontem só meu".
// Usa o reconhecimento de voz do próprio navegador (Chrome no Android, Safari no iPhone); nada sai para outro servidor.
// interpretar() tira do texto o valor, a descrição, a categoria (por palavra-chave), a data (hoje/ontem/anteontem) e "só meu".

export const suportaVoz = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Ouve uma frase e devolve o texto. onParcial recebe o que já foi entendido enquanto a pessoa fala.
export function ouvir({ onParcial, onFim, onErro }) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) return onErro('Este navegador não tem reconhecimento de voz. No celular, use o Chrome (Android) ou o Safari (iPhone).');
  // continuous: a pessoa pode respirar no meio ("mercado… 699 e 46… pelo Loureiro") sem o microfone desligar.
  // Desliga sozinho 2,5 s depois da última palavra entendida, ou em 25 s no máximo.
  const r = new R(); r.lang = 'pt-BR'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = true;
  let texto = '', acabou = false, timer = 0;
  const parar = () => { try { r.stop(); } catch {} };
  const agendar = (ms) => { clearTimeout(timer); timer = setTimeout(parar, ms); };
  r.onresult = (e) => { texto = Array.from(e.results).map((x) => x[0].transcript).join(' ').replace(/\s+/g, ' ').trim(); onParcial?.(texto); agendar(2500); };
  r.onerror = (e) => { acabou = true; onErro(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Sem permissão para o microfone. Libere o microfone para este site e tente de novo.' : e.error === 'no-speech' ? 'Não ouvi nada. Toque no microfone e fale logo em seguida.' : e.error === 'network' ? 'O reconhecimento de voz precisa de internet.' : 'Não deu para ouvir (' + e.error + ').'); };
  r.onend = () => { clearTimeout(timer); if (!acabou) { acabou = true; onFim(texto); } };
  try { r.start(); agendar(25000); } catch { onErro('Não deu para ligar o microfone. Tente de novo.'); }
  return parar;
}

// ---------- interpretar a frase ----------
const UNID = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19 };
const DEZ = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90 };
const CEN = { cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900 };
const NUM_PAL = new Set([...Object.keys(UNID), ...Object.keys(DEZ), ...Object.keys(CEN), 'mil', 'e']);
// "cento e vinte e três" → [123]; "seiscentos e noventa e nove e quarenta e seis" → [699, 46] (centena > dezena > unidade:
// quando vem uma ordem igual ou maior que a anterior, começou outro número). O reconhecedor costuma mandar dígitos; isto é o plano B.
function porExtenso(palavras) {
  const nums = []; let total = 0, atual = 0, ultimo = 0, tem = false; // ultimo: 4 mil, 3 centena, 2 dezena, 1 unidade
  const fecha = () => { if (tem) nums.push(total + atual); total = 0; atual = 0; ultimo = 0; tem = false; };
  for (const p of palavras) {
    if (p === 'e') continue;
    const r = p === 'mil' ? 4 : p in CEN ? 3 : p in DEZ ? 2 : p in UNID ? 1 : 0; if (!r) continue;
    if (r === 4) { if (total >= 1000) fecha(); total += (atual || 1) * 1000; atual = 0; ultimo = 4; tem = true; continue; }
    if (ultimo && ultimo !== 4 && r >= ultimo) fecha();
    atual += r === 3 ? CEN[p] : r === 2 ? DEZ[p] : UNID[p]; ultimo = r; tem = true;
  }
  fecha(); return nums;
}
const MOEDA = /^(reais?|real|conto|pila|pau|centavos?)$/;
// troca os números por extenso por dígitos, no lugar: "mercado seiscentos e noventa e nove e quarenta e seis reais" → "mercado 699 e 46 reais"
function digitar(t) {
  const pal = t.split(' '), saida = [];
  for (let i = 0; i < pal.length; i++) {
    if (!NUM_PAL.has(pal[i]) || pal[i] === 'e') { saida.push(pal[i]); continue; }
    let j = i; while (j < pal.length && NUM_PAL.has(pal[j])) j++; while (pal[j - 1] === 'e') j--;
    const seq = pal.slice(i, j);
    // "um"/"uma" sozinho é artigo ("uma pizza"), não número; só vira 1 se vier "reais"/"real" logo depois
    if (seq.every((w) => w === 'um' || w === 'uma') && !MOEDA.test(pal[j] || '')) { saida.push(...seq); i = j - 1; continue; }
    const nums = porExtenso(seq); saida.push(nums.length ? nums.join(' e ') : seq.join(' ')); i = j - 1;
  }
  return saida.join(' ');
}
// Quem pagou, pela fala: "pelo Loureiro", "pago pela Ana", "o Meira pagou", "quem pagou foi o Paulo", "eu paguei" → eu.
function quemPagou(t, pessoas, eu) {
  const esc = (n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const p of pessoas) {
    const nomes = [p, p.split(' ')[0]].filter((n) => n.length >= 3).map(semAcento).map(esc).join('|');
    const re = new RegExp('(?:(?:pago|paga|comprado|comprada|foi)\\s+)?(?:pel[oa]|por)\\s+(?:[oa]\\s+)?(?:' + nomes + ')(?![\\p{L}\\d])|quem\\s+pagou\\s+foi\\s+(?:[oa]\\s+)?(?:' + nomes + ')(?![\\p{L}\\d])|(?:[oa]\\s+)?(?<![\\p{L}\\d])(?:' + nomes + ')\\s+pagou', 'iu');
    const m = semAcento(t).match(re);
    if (m) { const ini = m.index, fim = ini + m[0].length; return { pagoPor: p, t: t.slice(0, ini) + ' ' + t.slice(fim) }; }
  }
  if (eu && /(?<![\p{L}\d])(?:eu\s+)?paguei(?![\p{L}\d])/u.test(t)) return { pagoPor: eu, t: t.replace(/(?<![\p{L}\d])(?:eu\s+)?paguei(?![\p{L}\d])/gu, ' ') };
  return { pagoPor: null, t };
}
// \b do JavaScript não enxerga acento nem ç ("almoço", "água"): esta fronteira usa letras Unicode
const P = (w) => new RegExp('(?<![\\p{L}\\d])(?:' + w + ')(?![\\p{L}\\d])', 'u');
const CATS = [
  ['transporte', P('uber|99|t[aá]xi|corrida|[oô]nibus|metr[oô]|passagem de [oô]nibus|pedágio|estacionamento')],
  ['carro', P('gasolina|combust[ií]vel|etanol|[aá]lcool|abastec\w*|aluguel do carro|carro|lavagem')],
  ['passagem', P('passagem|voo|a[eé]reo|aérea|gol|latam|azul')],
  ['hospedagem', P('aluguel|casa|hotel|hospedagem|pousada|airbnb|di[aá]ria')],
  ['hortifruti', P('hortifruti|feira|frutas?|verduras?|legumes?|sacol[aã]o|quitanda')],
  ['mercado', P('mercado|supermercado|compras|padaria|a[çc]ougue')],
  ['alimentacao', P('almo[çc]o|jantar|janta|caf[eé]|lanches?|pizzas?|comida|restaurante|hamb[uú]rgue?r(?:es)?|a[çc]a[ií]|sorvetes?|cervejas?|bebidas?|[aá]gua|refri\w*|marmita|ifood|delivery|p[aã]o')],
  ['lazer', P('cinema|bar|balada|festa|passeio|ingresso|jogo|show|lazer')],
  ['casa', P('limpeza|detergente|papel higi[eê]nico|sab[aã]o|g[aá]s|luz|internet|conta de')],
  ['curso', P('curso|aula|instrutor|hora de voo|simulador|taxa|anac|exame|prova|manual|apostila')],
  ['material', P('caderno|caneta|material|fone|headset|carregador|cabo|mochila|roupa|cal[çc]a|camisa|touca|luva|casaco|t[eê]nis')],
];
const semAcento = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Quem dividiu, pela fala: "com o Meira e o Paulo" → [eu, Meira, Paulo Henrique]; "todos"/"a turma" → todo mundo.
function quemDividiu(t, pessoas, eu) {
  const TODOS = 'todos|todo mundo|a turma|turma toda|galera|geral|pela turma|pra turma|para a turma|turma';
  if (P(TODOS).test(t)) return { lista: pessoas, t: t.replace(new RegExp(P('com (' + TODOS + ')|' + TODOS).source, 'gu'), ' ') };
  const achados = [];
  for (const p of pessoas) {
    const nomes = [p, p.split(' ')[0]].filter((n) => n.length >= 3).map(semAcento);
    const re = new RegExp('(?<![\\p{L}\\d])(?:' + nomes.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\p{L}\\d])', 'giu');
    if (re.test(semAcento(t))) { achados.push(p); t = t.split(' ').filter((w) => !nomes.includes(semAcento(w)) && !nomes.some((n) => n.split(' ').includes(semAcento(w)))).join(' '); }
  }
  if (!achados.length) return { lista: null, t };
  if (eu && !achados.includes(eu) && pessoas.includes(eu)) achados.unshift(eu);
  return { lista: pessoas.filter((p) => achados.includes(p)), t: t.replace(new RegExp(P('com|comigo|junto|juntos|e eu|eu').source, 'gu'), ' ') };
}
export function interpretar(frase, CATEGORIAS, { pessoas = [], eu = '' } = {}) {
  let t = ' ' + String(frase || '').toLowerCase().replace(/\s+/g, ' ').trim() + ' ';
  const r = { descricao: '', valor: NaN, categoria: 'outros', data: 'hoje', soMeu: false, pagoPor: null, participantes: null, confianca: 'baixa' };
  t = ' ' + digitar(t.trim()).replace(/\bv[ií]rgula\b/g, 'e') + ' ';
  if (pessoas.length) {
    const qp = quemPagou(t, pessoas, eu); r.pagoPor = qp.pagoPor; t = ' ' + qp.t.replace(/\s+/g, ' ').trim() + ' ';
    const q = quemDividiu(t, pessoas, eu); r.participantes = q.lista; t = ' ' + q.t.trim() + ' ';
    if (r.participantes && r.pagoPor && !r.participantes.includes(r.pagoPor)) r.participantes = pessoas.filter((p) => r.participantes.includes(p) || p === r.pagoPor);
  }
  // "só meu" / "meu" / "pessoal"
  const SOMEU = P('s[oó] meu|s[oó] eu|pessoal|particular|meu gasto');
  if (SOMEU.test(t)) { r.soMeu = true; t = t.replace(new RegExp(SOMEU.source, 'gu'), ' '); }
  // data
  if (P('anteontem').test(t)) r.data = -2; else if (P('ontem').test(t)) r.data = -1; else if (P('hoje').test(t)) r.data = 0;
  t = t.replace(new RegExp(P('hoje|ontem|anteontem|agora').source, 'gu'), ' ');
  // valor: "42,50" · "R$ 42" · "42 reais e 50 centavos" · "42 reais com 50" · "42 e 50" · "699 46" (dois números seguidos,
  // o segundo com 2 dígitos = centavos) · "cinquenta reais" (já virou dígito) · "12 conto" · "30 centavos"
  let m;
  const C = '(?:reais?|real|conto|pila|pau)';
  if ((m = t.match(/r?\$?\s*(\d{1,6})[,.](\d{2})(?!\d)/))) r.valor = +m[1] * 100 + +m[2];
  else if ((m = t.match(new RegExp('(\\d{1,6})\\s*' + C + '?\\s*(?:e|com)\\s+(\\d{1,2})(?!\\d)\\s*(?:centavos?)?')))) r.valor = +m[1] * 100 + +m[2];
  else if ((m = t.match(new RegExp('(\\d{1,6})\\s+(\\d{2})(?!\\d)\\s*(?:' + C + '|centavos?)?')))) r.valor = +m[1] * 100 + +m[2];
  else if ((m = t.match(new RegExp('(\\d{1,6})\\s*' + C)))) r.valor = +m[1] * 100;
  else if ((m = t.match(/r\$\s*(\d{1,6})(?!\d)/))) r.valor = +m[1] * 100;
  else if ((m = t.match(/(\d{1,6})\s*(?:centavos?)/))) r.valor = +m[1];
  else {
    // números soltos: o valor é o maior deles ("2 lanches 30" → 30)
    const todos = [...t.matchAll(/(?<![\d,.])(\d{1,6})(?![\d,.])/g)];
    if (todos.length) { const mel = todos.reduce((a, b) => (+b[1] > +a[1] ? b : a)); r.valor = +mel[1] * 100; m = { 0: mel[0] }; }
  }
  if (m) t = t.replace(m[0], ' ');
  const SOBRA = new Set(['reais', 'real', 'conto', 'pila', 'pau', 'centavos', 'centavo', 'r$', 'gastei', 'paguei', 'gasto', 'comprei', 'foi', 'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'com', 'em', 'um', 'uma', 'o', 'a', 'os', 'as', 'e', 'pra', 'pro', 'para', 'por', 'pelo', 'pela']);
  t = t.replace(/[,.;:]+/g, ' ').split(' ').filter((w) => w && !SOBRA.has(w)).join(' ');
  // categoria por palavra-chave (na frase original)
  const orig = ' ' + String(frase || '').toLowerCase() + ' ';
  for (const [k, re] of CATS) if (re.test(orig) && CATEGORIAS[k]) { r.categoria = k; break; }
  r.descricao = t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  r.descricao = r.descricao.slice(0, 80);
  r.confianca = Number.isFinite(r.valor) && r.valor > 0 && r.descricao ? 'alta' : Number.isFinite(r.valor) && r.valor > 0 ? 'media' : 'baixa';
  return r;
}
