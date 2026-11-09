// Lançar gasto falando: "almoço 42 e 50", "uber 38 reais", "mercado 120 ontem só meu".
// Usa o reconhecimento de voz do próprio navegador (Chrome no Android, Safari no iPhone); nada sai para outro servidor.
// interpretar() tira do texto o valor, a descrição, a categoria (por palavra-chave), a data (hoje/ontem/anteontem) e "só meu".

export const suportaVoz = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Ouve uma frase e devolve o texto. onParcial recebe o que já foi entendido enquanto a pessoa fala.
export function ouvir({ onParcial, onFim, onErro }) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) return onErro('Este navegador não tem reconhecimento de voz. No celular, use o Chrome (Android) ou o Safari (iPhone).');
  const r = new R(); r.lang = 'pt-BR'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
  let texto = '', acabou = false;
  r.onresult = (e) => { texto = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim(); onParcial?.(texto); };
  r.onerror = (e) => { acabou = true; onErro(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Sem permissão para o microfone. Libere o microfone para este site e tente de novo.' : e.error === 'no-speech' ? 'Não ouvi nada. Toque no microfone e fale logo em seguida.' : e.error === 'network' ? 'O reconhecimento de voz precisa de internet.' : 'Não deu para ouvir (' + e.error + ').'); };
  r.onend = () => { if (!acabou) { acabou = true; onFim(texto); } };
  try { r.start(); } catch { onErro('Não deu para ligar o microfone. Tente de novo.'); }
  return () => { try { r.stop(); } catch {} };
}

// ---------- interpretar a frase ----------
const UNID = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19 };
const DEZ = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90 };
const CEN = { cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900 };
const NUM_PAL = new Set([...Object.keys(UNID), ...Object.keys(DEZ), ...Object.keys(CEN), 'mil', 'e']);
// "cento e vinte e três" → 123 (só inteiros; o reconhecedor costuma mandar dígitos, isto é o plano B)
function porExtenso(palavras) {
  let total = 0, atual = 0;
  for (const p of palavras) {
    if (p === 'e') continue;
    if (p === 'mil') { total += (atual || 1) * 1000; atual = 0; }
    else if (p in CEN) atual += CEN[p]; else if (p in DEZ) atual += DEZ[p]; else if (p in UNID) atual += UNID[p];
  }
  return total + atual;
}
// \b do JavaScript não enxerga acento nem ç ("almoço", "água"): esta fronteira usa letras Unicode
const P = (w) => new RegExp('(?<![\\p{L}\\d])(?:' + w + ')(?![\\p{L}\\d])', 'u');
const CATS = [
  ['transporte', P('uber|99|t[aá]xi|corrida|[oô]nibus|metr[oô]|passagem de [oô]nibus|pedágio|estacionamento')],
  ['carro', P('gasolina|combust[ií]vel|etanol|[aá]lcool|abastec\w*|aluguel do carro|carro|lavagem')],
  ['passagem', P('passagem|voo|a[eé]reo|aérea|gol|latam|azul')],
  ['hospedagem', P('aluguel|casa|hotel|hospedagem|pousada|airbnb|di[aá]ria')],
  ['mercado', P('mercado|supermercado|compras|feira|padaria|a[çc]ougue|hortifruti')],
  ['alimentacao', P('almo[çc]o|jantar|janta|caf[eé]|lanche|pizza|comida|restaurante|hamb[uú]rguer|a[çc]a[ií]|sorvete|cerveja|bebida|[aá]gua|refri\w*|marmita|ifood|delivery|p[aã]o')],
  ['lazer', P('cinema|bar|balada|festa|passeio|ingresso|jogo|show|lazer')],
  ['casa', P('limpeza|detergente|papel higi[eê]nico|sab[aã]o|g[aá]s|luz|internet|conta de')],
  ['curso', P('curso|aula|instrutor|hora de voo|simulador|taxa|anac|exame|prova|manual|apostila')],
  ['material', P('caderno|caneta|material|fone|headset|carregador|cabo|mochila|roupa|cal[çc]a|camisa|touca|luva|casaco|t[eê]nis')],
];
const semAcento = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Quem dividiu, pela fala: "com o Meira e o Paulo" → [eu, Meira, Paulo Henrique]; "todos"/"a turma" → todo mundo.
function quemDividiu(t, pessoas, eu) {
  if (P('todos|todo mundo|a turma|turma toda|galera|geral').test(t)) return { lista: pessoas, t: t.replace(new RegExp(P('com (todos|todo mundo|a turma|turma toda|galera|geral)|todos|todo mundo|a turma|turma toda|galera|geral').source, 'gu'), ' ') };
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
  const r = { descricao: '', valor: NaN, categoria: 'outros', data: 'hoje', soMeu: false, participantes: null, confianca: 'baixa' };
  if (pessoas.length) { const q = quemDividiu(t, pessoas, eu); r.participantes = q.lista; t = ' ' + q.t.trim() + ' '; }
  // "só meu" / "meu" / "pessoal"
  const SOMEU = P('s[oó] meu|s[oó] eu|pessoal|particular|meu gasto');
  if (SOMEU.test(t)) { r.soMeu = true; t = t.replace(new RegExp(SOMEU.source, 'gu'), ' '); }
  // data
  if (P('anteontem').test(t)) r.data = -2; else if (P('ontem').test(t)) r.data = -1; else if (P('hoje').test(t)) r.data = 0;
  t = t.replace(new RegExp(P('hoje|ontem|anteontem|agora').source, 'gu'), ' ');
  // valor: "42,50" · "R$ 42" · "42 reais e 50 centavos" · "42 e 50" · "cinquenta reais" · "12 conto"
  let m;
  if ((m = t.match(/r?\$?\s*(\d{1,6})[,.](\d{2})(?!\d)/))) r.valor = +m[1] * 100 + +m[2];
  else if ((m = t.match(/(\d{1,6})\s*(?:reais?|real|conto|pila|pau)\s*(?:e\s*(\d{1,2})\s*(?:centavos?)?)?/))) r.valor = +m[1] * 100 + (m[2] ? +m[2] : 0);
  else if ((m = t.match(/(\d{1,6})\s+e\s+(\d{1,2})(?!\d)/))) r.valor = +m[1] * 100 + +m[2];
  else if ((m = t.match(/r\$\s*(\d{1,6})(?!\d)/))) r.valor = +m[1] * 100;
  else if ((m = t.match(/(\d{1,6})\s*(?:centavos?)/))) r.valor = +m[1];
  else {
    // só por extenso: pega a maior sequência de palavras de número antes de "reais"/"conto" ou no fim
    const pal = t.trim().split(' '); let melhor = null;
    for (let i = 0; i < pal.length; i++) { if (!NUM_PAL.has(pal[i]) || pal[i] === 'e') continue; let j = i; while (j < pal.length && NUM_PAL.has(pal[j])) j++; const seq = pal.slice(i, j); const v = porExtenso(seq); if (v > 0 && (!melhor || v > melhor.v)) melhor = { i, j, v }; i = j; }
    if (melhor) { r.valor = melhor.v * 100; const cent = t.match(/\b(?:e\s+)?(\d{1,2}|[a-zç]+)\s+centavos?/); if (cent) r.valor += /\d/.test(cent[1]) ? +cent[1] : porExtenso([cent[1]]); m = { 0: pal.slice(melhor.i, melhor.j).join(' ') }; }
    else if ((m = t.match(/(\d{1,6})(?!\d)/))) r.valor = +m[1] * 100; // um número solto é o valor
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
