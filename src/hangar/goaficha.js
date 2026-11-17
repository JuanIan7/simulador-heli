// Aba "Form do GOA": preenche o formulário diário do GOA (Acompanhamento PPH/2026, Contrato 089/2026)
// a partir da foto ou do PDF da Ficha de Avaliação de Voo da EACAR.
// Fluxo: conta e militar (uma vez) → foto/PDF da ficha → leitura pelo Gemini (Firebase AI Logic, plano Spark, sem custo)
// → prévia editável, página por página → link do formulário já preenchido. O site NUNCA envia: quem toca em Enviar é o aluno.
// Mapa dos campos e regras: automação do Loureiro (14/11/2026), conferida com o formulário no ar no mesmo dia.
import { dividirVoo, paraMin, LOCAIS } from '../diario/crepusculo.js';
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSd2OFx-J611f1J_CXAiESXHGYNDDM2XcgF1kJMvOf8T0k2njQ/viewform';
// do mais forte para o mais leve; todos sem cobrança no plano Spark. Se um estourar a cota, tenta o próximo.
const MODELOS = [['gemini-3.5-flash-lite', 30000], ['gemini-3.8-flash', 45000]]; // [modelo, limite em ms]; o 3.8 chegou a travar por minutos (16/11), por isso é a reserva

export const MILITARES = [
  'CAP BM QOC/17 RAFAEL NASCIMENTO LOUREIRO – RG 53.373 – 2º GMar',
  'CAP BM QOC/16 JUAN CARLOS SILVA DE ARAUJO – RG 53.357 – GBS',
  '1º TEN BM QOC/20 JUAN SÉVOLO MEIRA – RG 53.655 – GOPP',
  '1º TEN BM QOC/20 PAULO HENRIQUE BARROS DE OLIVEIRA – RG 53.662 – GBS',
];
const SN = ['Sim', 'Não'], NS = ['Não', 'Sim'], SNA = ['Sim', 'Não', 'Não se aplica'];
const TIPOS = ['Voo de instrução', 'Ground School / instrução de solo', 'Simulador / dispositivo de treinamento', 'Avaliação', 'Check / exame prático', 'Palestra / Segurança de Voo', 'Outra atividade'];
const FASES = ['Ground School / familiarização', 'Fase/Módulo 1 – Adaptação na aeronave', 'Fase/Módulo 2 – Procedimentos anormais e de emergência', 'Fase/Módulo 3 – Aquisição de experiência / piloto em comando', 'Navegação', 'Voo solo', 'Voo noturno', 'Outra fase prevista no programa da escola'];
const NATUREZA = ['Duplo comando', 'Solo', 'Piloto em comando', 'Navegação', 'Noturno', 'Voo por instrumentos / sob capota', 'Check / exame prático', 'Outra'];
export const MOTIVOS_FORM = ['Condições meteorológicas', 'Indisponibilidade / manutenção da aeronave', 'Indisponibilidade do instrutor', 'Indisponibilidade de equipamento ou material', 'Decisão / programação da escola', 'Condição ou impedimento do aluno', 'Folga / intervalo previsto no cronograma', 'Feriado / suspensão programada', 'Outro motivo'];
const DECLARA = 'Declaro que as informações registradas correspondem à atividade efetivamente realizada e aos documentos disponibilizados pela escola.';
const DECLARA_SEM = 'Declaro que as informações acima correspondem ao que me foi informado ou observado nesta data.';

// [chave, entry, rótulo, tipo, opções]
const P1 = [['militar', 447663857, 'Militar', 'lista', MILITARES], ['data', 115789122, 'Data da atividade', 'data']];
const PAGS_VOO = [
  ['1. Identificação', [...P1, ['houve', 2144682723, 'Houve atividade de instrução nesta data?', 'radio', SN]]],
  ['2. Atividade programada / realizada', [
    ['tipo', 405250430, 'Tipo de atividade', 'radio', TIPOS], ['prevista', 510255250, 'Estava prevista no cronograma ou QTS?', 'radio', SN],
    ['hPrev', 1646170212, 'Horário previsto para início', 'hora'], ['hIni', 571169175, 'Horário efetivo de início (partida)', 'hora'], ['hFim', 752804973, 'Horário efetivo de término (corte)', 'hora'],
    ['integral', 771044799, 'Permaneceu integralmente na atividade?', 'radio', SN], ['atraso', 1089335954, 'Houve atraso ou alteração relevante?', 'radio', NS],
    ['atrasoDesc', 1410223716, 'Se houve atraso ou alteração, descreva', 'parag'], ['fase', 1174915737, 'Fase atual da formação', 'lista', FASES],
    ['missao', 1382486366, 'Identificação da missão', 'texto'], ['objetivo', 288304578, 'Objetivo / manobras ou procedimentos', 'parag'],
    ['envolveuVoo', 2131919057, 'Envolveu voo em aeronave?', 'radio', SN]]],
  ['3. Dados do voo', [
    ['modelo', 1145321023, 'Modelo da aeronave', 'texto'], ['matricula', 647459385, 'Matrícula', 'texto'], ['instrutor', 1719287629, 'Nome do instrutor', 'texto'], ['canacInstr', 309540330, 'CANAC do instrutor', 'texto'],
    ['saida', 258067550, 'Local de saída', 'texto'], ['destino', 1499522913, 'Destino ou retorno', 'texto'], ['hDec', 857682260, 'Hora de decolagem', 'hora'], ['hPouso', 294125453, 'Hora de pouso', 'hora'],
    ['tempo', 2117983776, 'Tempo de voo lançado na ficha (h:min)', 'dur'], ['natureza', 2065779925, 'Natureza / marca de experiência', 'caixas', NATUREZA],
    ['decolagens', 2060526933, 'Decolagens', 'texto'], ['pousos', 344958395, 'Pousos completos', 'texto'], ['rota', 649290002, 'Rota do voo', 'parag']]],
  ['4. Instrução e desempenho', [
    ['briefing', 191234536, 'Briefing antes da instrução?', 'radio', SNA], ['debriefing', 305706159, 'Debriefing depois?', 'radio', SNA], ['desempenho', 884237573, 'Instrutor informou desempenho e pontos a melhorar?', 'radio', SNA],
    ['conceito', 1804917950, 'Resultado / conceito', 'texto'], ['repetir', 1483750343, 'Indicou repetir a missão?', 'radio', ['Não', 'Sim', 'Não informado']], ['pontos', 1747154692, 'Pontos trabalhados e observações', 'parag']]],
  ['5. Documentação', []],
  ['6. Execução contratual', [
    ['aeronaveDisp', 615736813, 'Aeronave disponível e em condições?', 'radio', ['Sim', 'Não', 'Não se aplica / não houve voo']], ['instrutorDisp', 430923899, 'Instrutor disponível?', 'radio', SNA],
    ['materialDisp', 1093875843, 'Material e equipamentos disponíveis?', 'radio', SNA], ['conforme', 1367237963, 'Ocorreu integralmente conforme programada?', 'radio', SN],
    ['ocorrencia', 1380681158, 'Houve ocorrência, dificuldade ou irregularidade?', 'radio', NS], ['ocorrDesc', 908197795, 'Se houve, descreva', 'parag']]],
  ['7. Declaração (só aparece se o formulário pedir)', [['declara', 1897421599, 'Declaração', 'caixas', [DECLARA]], ['obsFinais', 1909206995, 'Observações finais', 'parag']]],
];
const PAGS_SEM = [
  ['1. Identificação', [...P1, ['houve', 2144682723, 'Houve atividade de instrução nesta data?', 'radio', SN]]],
  ['Registro de dia sem atividade', [
    ['havia', 1546999021, 'Havia atividade prevista para esta data?', 'radio', ['Sim', 'Não', 'Não sei / não recebi programação']],
    ['motivo', 2008496723, 'Motivo', 'lista', MOTIVOS_FORM], ['motivoDet', 965428647, 'Detalhe do motivo (e, se souber, a hora em que a escola avisou)', 'parag'],
    ['avisou', 1871683887, 'A escola informou previamente?', 'radio', SNA], ['novaPrev', 1399787132, 'Foi apresentada nova previsão?', 'radio', SNA],
    ['novaData', 398598591, 'Nova data prevista', 'data'], ['obsSem', 1298118869, 'Observações', 'parag'], ['declaraSem', 244480337, 'Confirmação', 'caixas', [DECLARA_SEM]]]],
];

// ---------- estado (na memória; a conta fica no aparelho) ----------
const CHAVE = 'hangar-goa-conta';
const lerConta = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch { return {}; } };
const gravarConta = (v) => { try { localStorage.setItem(CHAVE, JSON.stringify(v)); } catch {} };
const est = { diario: '', modo: '', etapa: 'escolha', arqs: [], f: {}, erro: '', duvidas: [], modelo: '', lendo: false };
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

// militar da lista a partir do nome do membro ("Juan Araujo" → CAP ... JUAN CARLOS SILVA DE ARAUJO)
const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
export function militarDoNome(nome) {
  const pal = norm(nome).split(/\s+/).filter((p) => p.length > 2);
  return MILITARES.find((m) => pal.length && pal.every((p) => norm(m).includes(p))) || '';
}

// ---------- conversões ----------
const pad = (n) => String(n).padStart(2, '0');
// "1405", "14:05", "14h05" (Zulu na ficha) → "11:05" local (Piraquara, UTC−3, sem horário de verão)
export function zParaLocal(t) {
  const m = String(t || '').replace(/\D/g, '').match(/^(\d{1,2})(\d{2})$/); if (!m) return '';
  const min = ((+m[1] * 60 + +m[2] - 180) % 1440 + 1440) % 1440;
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}
// "1.0" / "1,3" (horas decimais) ou "1:18" → "01:00:00"
export function duracao(t) {
  const s = String(t || '').trim().replace(',', '.'); if (!s) return '';
  let min;
  if (s.includes(':')) { const [h, m] = s.split(':'); min = (+h || 0) * 60 + (+m || 0); } else if (!isNaN(+s)) min = Math.round(+s * 60); else return '';
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}:00`;
}
const matricula = (t) => { const s = String(t || '').toUpperCase().replace(/[^A-Z]/g, ''); return s.length === 5 ? `${s.slice(0, 2)}-${s.slice(2)}` : String(t || '').toUpperCase(); };
// missão → fase do formulário (padrão aprovado: INCT = Fase 1; o resto segue o bloco da FIP)
export function faseDaMissao(cod) {
  const p = String(cod || '').toUpperCase();
  if (/^(INCT|TMS|TMA)/.test(p)) return FASES[1];
  if (/^PE/.test(p)) return FASES[2];
  if (/^NOT/.test(p)) return 'Voo noturno';
  if (/^SOLO/.test(p)) return 'Voo solo';
  if (/^NV/.test(p)) return 'Navegação';
  return p ? FASES[7] : FASES[1];
}
const BLOCOS = { INCT: 'Introdução ao voo e controle da aeronave', TMS: 'Treinamento de manobras e operação no solo', TMA: 'Treinamento de manobras em voo e aproximações', PE: 'Procedimentos avançados e de emergência', NOT: 'Treinamento de voo noturno', SOLO: 'Treinamento de voo solo', NV: 'Procedimentos de navegação' };
const blocoDe = (cod) => BLOCOS[(String(cod || '').toUpperCase().match(/^[A-Z]+/) || [''])[0]] || '';

// padrões aprovados pelos alunos (14/11/2026) para o que a ficha não traz
function padraoVoo(iso, militar) {
  return { militar, data: iso, houve: 'Sim', tipo: 'Voo de instrução', prevista: 'Sim', hPrev: '', hIni: '', hFim: '', integral: 'Sim', atraso: 'Não', atrasoDesc: '', fase: FASES[1], missao: '', objetivo: '', envolveuVoo: 'Sim',
    modelo: 'R22', matricula: '', instrutor: '', canacInstr: '', saida: 'SISY', destino: 'SISY', hDec: '', hPouso: '', tempo: '', natureza: ['Duplo comando'], decolagens: '', pousos: '', rota: '',
    briefing: 'Sim', debriefing: 'Sim', desempenho: 'Sim', conceito: '', repetir: 'Não', pontos: '',
    aeronaveDisp: 'Sim', instrutorDisp: 'Sim', materialDisp: 'Sim', conforme: 'Sim', ocorrencia: 'Não', ocorrDesc: '', declara: [DECLARA], obsFinais: '' };
}
function padraoSem(iso, militar, motivo = '', detalhe = '') {
  return { militar, data: iso, houve: 'Não', havia: 'Sim', motivo: motivo || MOTIVOS_FORM[0], motivoDet: detalhe, avisou: 'Sim', novaPrev: 'Não', novaData: '', obsSem: '', declaraSem: [DECLARA_SEM] };
}

// ficha lida → campos do formulário
export function fichaParaForm(r, base, instrutores = []) {
  const f = { ...base };
  if (/^\d{4}-\d{2}-\d{2}$/.test(r.data || '')) f.data = r.data;
  const missao = String(r.missao || '').toUpperCase().trim();
  if (missao) { f.missao = missao; f.fase = faseDaMissao(missao); }
  const part = zParaLocal(r.partida), corte = zParaLocal(r.corte);
  if (part) { f.hPrev = part; f.hIni = part; }
  if (corte) f.hFim = corte;
  f.hDec = zParaLocal(r.decolagem); f.hPouso = zParaLocal(r.pouso);
  if (r.modelo) f.modelo = String(r.modelo).toUpperCase().replace(/\s+/g, '');
  f.matricula = matricula(r.matricula);
  // instrutor: se o CANAC lido bate com um instrutor que a pessoa já lançou no Diário, vale o nome de lá
  const canac = String(r.canacInstrutor || '').replace(/\D/g, '');
  const conhecido = instrutores.find((i) => i.canac && i.canac === canac);
  f.instrutor = conhecido?.nome || String(r.instrutor || '').trim(); f.canacInstr = canac;
  const rota = String(r.rotaVoada || r.rotaPrevista || '').toUpperCase().replace(/\s+/g, '');
  if (rota) { f.rota = rota; const ps = rota.split(/[-–/]+/).filter(Boolean); f.saida = ps[0] || f.saida; f.destino = ps[ps.length - 1] || f.destino; }
  f.tempo = duracao(r.totalMissao || r.diurno);
  const n = parseInt(r.pousos, 10); if (n >= 0) { f.pousos = String(n); f.decolagens = String(n); }
  const nat = new Set();
  const tv = String(r.tipoVoo || '').toUpperCase();
  if (tv.includes('SOLO')) nat.add('Solo'); else if (tv.includes('CMD')) nat.add('Piloto em comando'); else nat.add('Duplo comando');
  if (String(r.operacao || '').toUpperCase().includes('NAV')) nat.add('Navegação');
  if (parseFloat(String(r.noturno || '').replace(',', '.')) > 0) nat.add('Noturno');
  f.natureza = [...nat];
  const grau = String(r.grauFinal || '').toUpperCase();
  f.conceito = grau.includes('REPROV') ? 'Reprovado' : grau.includes('APROV') ? 'Aprovado' : '';
  f.repetir = grau.includes('REPROV') ? 'Sim' : 'Não';
  const bloco = blocoDe(missao);
  f.objetivo = [missao && bloco ? `${missao} · ${bloco}` : missao, String(r.manobras || '').trim()].filter(Boolean).join('. ');
  const insat = (r.itensInsatisfatorios || []).filter(Boolean);
  f.pontos = [r.parecer && `Parecer do instrutor: ${String(r.parecer).trim()}`, r.comentarios && `Comentários: ${String(r.comentarios).trim()}`, insat.length && `Itens com grau I: ${insat.join('; ')}`].filter(Boolean).join('\n');
  return f;
}

// ---------- registro do Diário de voo ----------
// Mesmo formato que a tela de voo do Diário grava (diario/{uid}/voos/{id}). Início e fim = partida e corte (hora local),
// que é o tempo que a ficha lança. Diurno/noturno pelo crepúsculo de Piraquara; o total vem do tempo da ficha.
const minDeDuracao = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : 0; };
export function vooDoForm(f) {
  const nat = f.natureza || [];
  const funcao = nat.includes('Solo') ? 'solo' : nat.includes('Piloto em comando') ? 'pic' : 'instrucao';
  const total = minDeDuracao(f.tempo) || ((paraMin(f.hFim) != null && paraMin(f.hIni) != null) ? ((paraMin(f.hFim) - paraMin(f.hIni) + 1440) % 1440) : 0);
  let diurno = total, noturno = 0;
  if (f.hIni && f.hFim && /^\d{4}-\d{2}-\d{2}$/.test(f.data || '')) {
    const r = dividirVoo(f.data, f.hIni, f.hFim, LOCAIS.piraquara);
    if (r) { noturno = Math.min(total, r.noturno); diurno = Math.max(0, total - noturno); }
  }
  const pousos = Math.min(99, Math.max(0, parseInt(f.pousos, 10) || 0));
  const obs = [f.missao && String(f.missao).trim(), f.objetivo && f.objetivo !== f.missao ? String(f.objetivo).replace(/^[A-Z]+-\d+\s*·\s*/, '') : '', f.pontos].filter(Boolean).join('. ').replace(/\s+/g, ' ').slice(0, 1900);
  const noite = noturno > diurno;
  const d = {
    data: f.data || '', modelo: String(f.modelo || 'R22').toUpperCase(), matricula: matricula(f.matricula),
    origem: String(f.saida || 'SISY').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4), destino: String(f.destino || f.saida || 'SISY').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4),
    inicio: /^\d{2}:\d{2}$/.test(f.hIni || '') ? f.hIni : '', fim: /^\d{2}:\d{2}$/.test(f.hFim || '') ? f.hFim : '', diurno, noturno, funcao,
    pousosD: noite ? 0 : pousos, pousosN: noite ? pousos : 0, navegacao: nat.includes('Navegação') ? total : 0, capota: nat.includes('Voo por instrumentos / sob capota') ? total : 0,
    instrutor: String(f.instrutor || '').trim().slice(0, 80), canacInstrutor: String(f.canacInstr || '').replace(/\D/g, '').slice(0, 6), exercicios: [], obs, civ: 'nao',
  };
  const erros = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data)) erros.push('data');
  if (!/^PR-[A-Z]{3}$/.test(d.matricula)) erros.push('matrícula (PR-ABC)');
  if (!/^[A-Z]{4}$/.test(d.origem) || !/^[A-Z]{4}$/.test(d.destino)) erros.push('origem e destino (4 letras)');
  if (d.diurno + d.noturno <= 0) erros.push('tempo de voo');
  if (d.canacInstrutor && d.canacInstrutor.length !== 6) erros.push('CANAC do instrutor (6 dígitos)');
  return { d, erros };
}
const hm = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
const dBR = (iso) => String(iso || '').split('-').reverse().join('/');
function cartaoDiario(voos) {
  const { d, erros } = vooDoForm({ ...est.f });
  const rep = !erros.length && (voos || []).some((v) => v.data === d.data && v.matricula === d.matricula && (v.inicio || '') === d.inicio);
  const estado = est.diario === 'salvo' ? '<p class="goa-ok">✔ Salvo no seu Diário de voo.</p>'
    : rep ? '<p class="sub"><b>Este voo já está no seu Diário</b> (mesma data, aeronave e horário). Não vou lançar de novo.</p>'
    : est.diario === 'nao' ? '<p class="sub">Tudo bem, não lancei no Diário.</p>' : '';
  return `<div class="caixa goa-diario${est.diario === '' ? ' goa-pede' : ''}" id="goaDiarioCx"><div class="rotulo">📒 Diário de voo</div>
    <b>Quer lançar este voo também no seu Diário de voo?</b>
    ${erros.length ? `<p class="pv-alerta">Falta corrigir lá em cima para lançar no Diário: ${esc(erros.join(', '))}.</p>` : `<div class="goa-resumo">${esc(dBR(d.data))} · ${esc(d.modelo)} ${esc(d.matricula)} · ${esc(d.origem)}→${esc(d.destino)} · ${esc(d.inicio)}–${esc(d.fim)} (hora local)<br>Tempo ${hm(d.diurno + d.noturno)} (diurno ${hm(d.diurno)}, noturno ${hm(d.noturno)}) · ${d.pousosD + d.pousosN} pouso(s) · ${esc(d.instrutor || 'sem instrutor')}${d.canacInstrutor ? ' (CANAC ' + esc(d.canacInstrutor) + ')' : ''}<br><span class="sub">Missão no Diário: ${esc((d.obs || '').slice(0, 140))}${(d.obs || '').length > 140 ? '…' : ''}</span></div>`}
    ${estado}
    ${est.diario === 'salvo' || rep ? '<div class="linha-acao"><button data-ir="diario">Ver no Diário de voo</button></div>' : `<div class="linha-acao"><button class="pri" id="goaDiarioSim"${erros.length ? ' disabled' : ''}>Sim, lançar no Diário</button><button id="goaDiarioNao">Não</button></div>`}
  </div>`;
}

// ---------- link pré-preenchido ----------
export function linkForm(f, modo, email) {
  const q = new URLSearchParams({ usp: 'pp_url' });
  if (emailOk(email)) { q.set('authuser', email); q.set('emailAddress', email); }
  for (const [, campos] of modo === 'semvoo' ? PAGS_SEM : PAGS_VOO) for (const [k, id, , tipo] of campos) {
    const v = f[k]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    if (tipo === 'caixas') v.forEach((x) => q.append(`entry.${id}`, x));
    else q.set(`entry.${id}`, String(v));
  }
  return `${FORM}?${q.toString()}`;
}

// ---------- leitura da ficha (Gemini pelo Firebase AI Logic) ----------
const PROMPT = (dicas) => `Você recebe a foto ou o PDF da "Ficha de Avaliação de Voo - Curso Piloto Privado Helicóptero - PPH" da escola EACAR (Piraquara/PR), preenchida à mão. Pode vir a frente e o verso.
Transcreva SÓ o que está escrito. Não invente: o que não der para ler com segurança fica "" e o nome do campo vai para "duvidas".
Responda apenas com este JSON:
{"data":"AAAA-MM-DD (campo DATA no topo ou Data do quadro 19; o ano é 2026 se vier só com 2 dígitos)",
"aluno":"","canacAluno":"","instrutor":"nome do instrutor (cabeçalho, 'Instrutor (a)')","canacInstrutor":"6 dígitos do CANAC do instrutor",
"missao":"campo 5. Missão, ex.: INCT-01","fase":"campo 4","operacao":"NAV ou LOCAL (campo 11, o que estiver marcado)","tipoVoo":"DC, CMD ou SOLO (campo 10, o que estiver marcado)",
"modelo":"campo 7, ex.: R22","matricula":"Marcas da aeronave, ex.: PR-IHH (frota da escola: PR-HNE, PR-HMI, PR-IHH)",
"rotaPrevista":"campo 12","rotaVoada":"Rota Voada do quadro 19, ex.: SISY-SISY",
"partida":"HHMM","decolagem":"HHMM","pouso":"HHMM","corte":"HHMM" (quadro 19, exatamente como escrito, com 4 dígitos; são horas Zulu),
"diurno":"como escrito, ex.: 1.0","noturno":"","totalMissao":"Total da Missão, como escrito, ex.: 1.0","pousos":"Pousos da Missão, só o número",
"metar":"quadro 20","comentarios":"quadro 21","parecer":"quadro 22, o parecer do instrutor por extenso","grauFinal":"APROVADO ou REPROVADO (quadro 24, o que estiver marcado)",
"itensInsatisfatorios":["itens do quadro 26 com grau I"],
"manobras":"uma frase curta em português dizendo o que foi treinado, tirada só do que está escrito nos quadros 21 e 22 (ex.: 'Apresentação dos comandos (pedais, coletivo e cíclico) e voo reto nivelado')",
"duvidas":["campos que você não conseguiu ler com segurança"]}
${dicas.length ? `Instrutores que este aluno já teve (use para reconhecer a letra, sem forçar): ${dicas.join('; ')}.` : ''}`;

// App Check (reCAPTCHA Enterprise / Fraud Defense, chave de site pública, domínio juanian7.github.io): o Firebase AI Logic recusa
// pedido sem token ("401 App Check token is invalid"). Só liga na primeira leitura de ficha; só funciona no domínio do site.
const CHAVE_SITE_RECAPTCHA = '6LcEeCEuAAAAAAsNebP5ijs3X8xT0K-fnKN_JblW';
let appCheckPronto = false;
async function ligarAppCheck(app) {
  if (appCheckPronto) return;
  const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(CHAVE_SITE_RECAPTCHA), isTokenAutoRefreshEnabled: true });
  appCheckPronto = true;
}
async function lerFicha(app, arqs, dicas) {
  await ligarAppCheck(app);
  const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai');
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  let ultimo;
  for (const [modelo, limite] of MODELOS) {
    try {
      const m = getGenerativeModel(ai, { model: modelo, generationConfig: { responseMimeType: 'application/json', temperature: 0 } }, { timeout: limite });
      const r = await m.generateContent([PROMPT(dicas), ...arqs.map((a) => ({ inlineData: { data: a.b64, mimeType: a.mime } }))]);
      const txt = r.response.text().replace(/^```(json)?|```$/g, '').trim();
      return { dados: JSON.parse(txt), modelo };
    } catch (e) {
      ultimo = e;
      if (!/429|404|500|502|503|quota|exhausted|not found|unavailable|overloaded|fetch|timeout|timed out|abort/i.test(String(e?.message || e))) break;
    }
  }
  throw ultimo;
}
function explicarErro(e) {
  const s = String(e?.message || e);
  if (/api-not-enabled|has not been used|is disabled|SERVICE_DISABLED|firebasevertexai|firebaseml/i.test(s)) return 'A leitura automática ainda está sendo ativada no Firebase. Enquanto isso, use "Preencher sem foto" e digite o que está na ficha.';
  if (/app ?check|recaptcha|appcheck/i.test(s)) return 'O Firebase recusou o pedido (App Check). Abra o Hangar pelo endereço juanian7.github.io e tente de novo; se continuar, use "Preencher sem foto".';
  if (/429|quota|exhausted/i.test(s)) return 'A cota gratuita de leitura do dia acabou. Tente mais tarde ou use "Preencher sem foto".';
  if (/timeout|timed out|abort/i.test(s)) return 'A leitura demorou demais e foi cancelada. Tente de novo (às vezes o serviço do Google está lento) ou use "Preencher sem foto".';
  if (/fetch|network|Failed/i.test(s)) return 'Sem conexão com o serviço de leitura agora. Tente de novo ou use "Preencher sem foto".';
  return 'Não deu para ler a ficha (' + s.slice(0, 140) + '). Tente outra foto, mais de perto e com luz, ou use "Preencher sem foto".';
}

// foto: reduz para no máximo 2200 px no lado maior (cabe no 4G e a letra continua legível); PDF vai como está
const b64DeBlob = (b) => new Promise((ok, ruim) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = ruim; r.readAsDataURL(b); });
async function prepararArquivo(file) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    if (file.size > 15e6) throw new Error('PDF maior que 15 MB');
    return { nome: file.name, mime: 'application/pdf', b64: await b64DeBlob(file), pdf: true };
  }
  try {
    const img = await createImageBitmap(file);
    const k = Math.min(1, 2200 / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    const blob = await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.88));
    return { nome: file.name, mime: 'image/jpeg', b64: await b64DeBlob(blob), url: URL.createObjectURL(blob) };
  } catch {
    if (file.size > 15e6) throw new Error('foto maior que 15 MB');
    return { nome: file.name, mime: file.type || 'image/jpeg', b64: await b64DeBlob(file), url: URL.createObjectURL(file) };
  }
}

// ---------- tela ----------
function campoHTML([k, , rot, tipo, opts]) {
  const v = est.f[k] ?? '', duv = est.duvidas.includes(k) ? ' goa-duv' : '';
  if (k === 'militar') return `<div class="goa-campo largo">${esc(rot)}<b>${esc(lerConta().militar || 'escolha lá em cima')}</b></div>`;
  // rádio e caixas ficam num div: botão dentro de <label> pode disparar duas vezes no celular
  const tag = tipo === 'radio' || tipo === 'caixas' ? 'div' : 'label';
  const lab = (inner) => `<${tag} class="goa-campo${tipo === 'parag' || tipo === 'caixas' || tipo === 'radio' ? ' largo' : ''}${duv}">${esc(rot)}${duv ? ' <span class="goa-confira">confira</span>' : ''}${inner}</${tag}>`;
  if (tipo === 'lista') return lab(`<select data-gk="${k}">${opts.map((o) => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`);
  if (tipo === 'radio') return lab(`<span class="chips">${opts.map((o) => `<button type="button" class="chip" data-gr="${k}" data-v="${esc(o)}" aria-pressed="${o === v}">${esc(o)}</button>`).join('')}</span>`);
  if (tipo === 'caixas') return lab(`<span class="goa-caixas">${opts.map((o) => `<span class="goa-cx"><input type="checkbox" data-gc="${k}" value="${esc(o)}"${(v || []).includes(o) ? ' checked' : ''}> ${esc(o)}</span>`).join('')}</span>`);
  if (tipo === 'parag') return lab(`<textarea data-gk="${k}" rows="3">${esc(v)}</textarea>`);
  if (tipo === 'data') return lab(`<input type="date" data-gk="${k}" value="${esc(v)}">`);
  if (tipo === 'hora') return lab(`<input type="time" data-gk="${k}" value="${esc(v)}">`);
  if (tipo === 'dur') return lab(`<input data-gk="${k}" inputmode="numeric" placeholder="01:00:00" value="${esc(v)}">`);
  return lab(`<input data-gk="${k}" value="${esc(v)}">`);
}

export function telaGoa(voos = []) {
  const conta = lerConta();
  const militar = conta.militar || '', email = conta.email || '';
  const contaPronta = militar && emailOk(email);
  const cabConta = `<div class="caixa goa-conta${contaPronta ? '' : ' goa-falta'}">
    <div class="rotulo">Antes de tudo · quem responde</div>
    <div class="form goa-grade">
      <label>Militar (como está na lista do formulário)<select id="goaMilitar"><option value="">— escolha —</option>${MILITARES.map((m) => `<option${m === militar ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
      <label>Conta do Google que vai responder<input id="goaEmail" type="email" inputmode="email" autocomplete="email" placeholder="seu.email@gmail.com" value="${esc(email)}"></label>
    </div>
    <p class="sub">O formulário abre <b>já nesta conta</b> e com o e-mail preenchido. Quem tem mais de uma conta do Google no celular: confira aqui, porque trocar de conta dentro do formulário apaga tudo o que já estava preenchido. Fica guardado só neste aparelho.</p>
    <p class="sub"><b>Atenção:</b> a conta precisa estar conectada neste navegador. Se não estiver, o Google abre calado na conta padrão. Confira o e-mail que aparece no topo do formulário, ao lado de "Mudar de conta": se for outro, feche, entre na conta certa no Google e abra de novo por aqui.</p>
  </div>`;

  if (est.etapa === 'previa') {
    const pags = est.modo === 'semvoo' ? PAGS_SEM : PAGS_VOO;
    const link = linkForm({ ...est.f, militar }, est.modo, email);
    return `<h2>Formulário do GOA pela ficha</h2>${cabConta}
    <div class="caixa destaque"><b>Prévia: confira página por página.</b> ${est.modelo ? `Lido da ficha pelo ${esc(est.modelo)}.` : 'Preenchido com os padrões da turma.'} ${est.duvidas.length ? `<span class="goa-confira">${est.duvidas.length} campo(s) para conferir</span>` : ''}
      <p class="sub">Corrija o que precisar aqui mesmo. Depois toque em "Abrir o formulário preenchido": ele abre no Google já com tudo marcado. Vá passando as páginas com "Avançar" e só toque em <b>Enviar</b> no fim, depois de conferir. Daqui nada é enviado.</p>
      ${est.arqs.length ? `<div class="goa-arqs">${est.arqs.map((a) => a.url ? `<a href="${a.url}" target="_blank" rel="noopener"><img src="${a.url}" alt="ficha"></a>` : `<span class="chip">📄 ${esc(a.nome)}</span>`).join('')}</div>` : ''}</div>
    ${pags.map(([tit, campos]) => `<div class="caixa goa-pag"><div class="rotulo">Página ${esc(tit)}</div>${campos.length ? `<div class="form goa-grade">${campos.map(campoHTML).join('')}</div>` : '<p class="sub">Upload da ficha e do DB: a escola já envia os dois automaticamente. Se quiser anexar mesmo assim, é nesta página do formulário (anexo não dá para pré-preencher).</p>'}</div>`).join('')}
    <div class="caixa goa-fim">
      ${contaPronta ? '' : '<p class="pv-alerta">Escolha o militar e a conta do Google lá em cima antes de abrir.</p>'}
      <div class="linha-acao"><a id="goaAbrir" class="btn pri goa-bt${contaPronta ? '' : ' goa-off'}" href="${contaPronta ? esc(link) : '#'}" target="_blank" rel="noopener">Abrir o formulário preenchido ↗</a><button id="goaCopiar">Copiar o link</button><button id="goaRecomecar" class="fantasma">Outra ficha</button></div>
      <p class="sub">No topo do formulário tem que aparecer <b>${esc(email || 'a sua conta')}</b>. Se aparecer outra, não preencha por lá: entre nessa conta no Google e abra de novo por aqui. Dois voos no mesmo dia = duas respostas: uma ficha de cada vez. Quem voou termina na página "6. Execução contratual", com o botão Enviar.</p></div>
    ${est.modo === 'semvoo' ? '' : cartaoDiario(voos)}`;
  }

  return `<h2>Formulário do GOA pela ficha</h2>
  <p class="intro">Tire a foto da Ficha de Avaliação de Voo (ou escolha o PDF) e o Hangar lê a ficha e monta o formulário do GOA já preenchido, para você só conferir e enviar. Nada é enviado daqui.</p>
  ${cabConta}
  <div class="caixa">
    <div class="rotulo">Hoje teve voo?</div>
    <div class="chips"><button type="button" class="chip" data-gmodo="voo" aria-pressed="${est.modo !== 'semvoo'}">🚁 Teve voo (tenho a ficha)</button><button type="button" class="chip" data-gmodo="semvoo" aria-pressed="${est.modo === 'semvoo'}">Não teve atividade</button></div>
    ${est.modo === 'semvoo' ? `<div class="form goa-grade" style="margin-top:10px">
        <label>Data<input type="date" id="goaDataSem" value="${esc(est.f.data || '')}"></label>
        <label>Motivo<select id="goaMotivoSem">${MOTIVOS_FORM.map((m) => `<option${m === est.f.motivo ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></label></div>
      <div class="linha-acao"><button class="pri" id="goaSemOk">Montar a prévia</button></div>`
    : `<div class="goa-envio">
        <label class="btn pri goa-arq">📷 Tirar foto da ficha<input type="file" id="goaFoto" accept="image/*" capture="environment" hidden></label>
        <label class="btn goa-arq">🖼️ Escolher foto ou PDF<input type="file" id="goaArq" accept="image/*,application/pdf,.pdf" multiple hidden></label>
      </div>
      <p class="sub">Frente e verso: pode mandar as duas fotos juntas. Foto de cima, com luz, a ficha inteira no quadro.</p>
      ${est.arqs.length ? `<div class="goa-arqs">${est.arqs.map((a, i) => `${a.url ? `<img src="${a.url}" alt="ficha ${i + 1}">` : `<span class="chip">📄 ${esc(a.nome)}</span>`}`).join('')}<button class="mini fantasma" id="goaLimpar">limpar</button></div>
        <div class="linha-acao"><button class="pri goa-bt" id="goaLer"${est.lendo ? ' disabled' : ''}>${est.lendo ? 'Lendo a ficha… (uns 20 s)' : '✨ Ler a ficha e preencher'}</button></div>` : ''}
      ${est.erro ? `<p class="pv-alerta">${esc(est.erro)}</p>` : ''}
      <p class="sub"><button class="mini fantasma" id="goaManual">Preencher sem foto</button> abre a prévia só com os padrões da turma, para digitar o resto.</p>`}
  </div>
  <details class="caixa goa-como"><summary>Como funciona e o que é preenchido sozinho</summary><ul>
    <li>Os horários da ficha estão em <b>Zulu</b>; o formulário pede hora local: o Hangar já subtrai 3 h (Piraquara, sem horário de verão).</li>
    <li>Da ficha: data, missão, aeronave, instrutor e CANAC, rota, partida, decolagem, pouso, corte, tempo de voo, pousos, grau final e parecer.</li>
    <li>Padrões combinados pela turma, quando a ficha não diz: horário previsto = partida; briefing, debriefing e desempenho = Sim; aeronave, instrutor e material disponíveis = Sim; sem ocorrência; decolagens = pousos; DC = Duplo comando; INCT, TMS e TMA = Fase 1.</li>
    <li>A foto vai só para a leitura (Gemini, do Google, pelo Firebase do Hangar) e não fica guardada aqui. Quem confere e envia é você.</li></ul></details>`;
}

// começo pelo "Não voou" do Início: já chega com data e motivo
export function prepararSemVoo(iso, motivo, detalhe, nomeMembro) {
  const conta = lerConta();
  Object.assign(est, { modo: 'semvoo', etapa: 'previa', arqs: [], erro: '', duvidas: [], modelo: '', f: padraoSem(iso, conta.militar || militarDoNome(nomeMembro), motivo, detalhe) });
}

export function ligarGoa(c, ctx) {
  const { render, toast, hoje, app, instrutores, nome, salvarVoo, voos, ir } = ctx;
  // primeira vez: sugere o militar pelo nome de quem entrou
  const conta = lerConta();
  if (!conta.militar && militarDoNome(nome())) { gravarConta({ ...conta, militar: militarDoNome(nome()) }); return render(); }
  const contaAtual = () => lerConta();
  const atualizarLink = () => {
    atualizarDiario();
    const a = c.querySelector('#goaAbrir'); if (!a) return;
    const { militar, email } = contaAtual(); const ok = militar && emailOk(email);
    a.classList.toggle('goa-off', !ok); a.href = ok ? linkForm({ ...est.f, militar }, est.modo, email) : '#';
  };
  c.querySelector('#goaMilitar')?.addEventListener('change', (e) => { gravarConta({ ...contaAtual(), militar: e.target.value }); est.f.militar = e.target.value; render(); });
  c.querySelector('#goaEmail')?.addEventListener('change', (e) => { gravarConta({ ...contaAtual(), email: e.target.value.trim() }); render(); });
  c.querySelector('#goaAbrir')?.addEventListener('click', (e) => {
    if (e.currentTarget.classList.contains('goa-off')) { e.preventDefault(); toast('Escolha o militar e a conta do Google primeiro.'); c.querySelector('#goaEmail')?.focus(); return; }
    // o formulário abre em outra guia; ao voltar, a pergunta do Diário já está à vista
    if (est.modo !== 'semvoo') setTimeout(() => c.querySelector('#goaDiarioCx')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 600);
  });
  const ligarDiario = () => {
    c.querySelector('#goaDiarioNao')?.addEventListener('click', () => { est.diario = 'nao'; render(); });
    c.querySelectorAll('#goaDiarioCx [data-ir]').forEach((b) => b.onclick = () => ir(b.dataset.ir));
    c.querySelector('#goaDiarioSim')?.addEventListener('click', async (e) => {
      const { d, erros } = vooDoForm({ ...est.f }); if (erros.length) return;
      e.currentTarget.disabled = true;
      try { await salvarVoo(d); est.diario = 'salvo'; toast('Voo lançado no Diário de voo'); }
      catch (err) { toast('Não salvou no Diário: ' + (err.code || err.message)); e.currentTarget.disabled = false; return; }
      render();
    });
  };
  const atualizarDiario = () => { const cx = c.querySelector('#goaDiarioCx'); if (!cx || est.diario === 'salvo') return; const n = document.createElement('div'); n.innerHTML = cartaoDiario(voos()); cx.replaceWith(n.firstElementChild); ligarDiario(); };
  ligarDiario();

  c.querySelectorAll('[data-gmodo]').forEach((b) => b.onclick = () => {
    est.modo = b.dataset.gmodo; est.erro = '';
    if (est.modo === 'semvoo') est.f = padraoSem(hoje(), contaAtual().militar || '');
    render();
  });
  c.querySelector('#goaSemOk')?.addEventListener('click', () => {
    est.f = padraoSem(c.querySelector('#goaDataSem').value || hoje(), contaAtual().militar || '', c.querySelector('#goaMotivoSem').value);
    est.etapa = 'previa'; est.modelo = ''; est.duvidas = []; render(); window.scrollTo(0, 0);
  });
  const receber = async (files) => {
    est.erro = '';
    try { for (const f of [...files].slice(0, 4)) est.arqs.push(await prepararArquivo(f)); est.arqs = est.arqs.slice(-4); }
    catch (e) { est.erro = 'Não deu para abrir o arquivo: ' + (e.message || e); }
    render();
  };
  c.querySelector('#goaFoto')?.addEventListener('change', (e) => receber(e.target.files));
  c.querySelector('#goaArq')?.addEventListener('change', (e) => receber(e.target.files));
  c.querySelector('#goaLimpar')?.addEventListener('click', () => { est.arqs = []; est.erro = ''; render(); });
  c.querySelector('#goaManual')?.addEventListener('click', () => { est.modo = 'voo'; est.f = padraoVoo(hoje(), contaAtual().militar || ''); est.diario = ''; est.etapa = 'previa'; est.modelo = ''; est.duvidas = []; render(); window.scrollTo(0, 0); });
  c.querySelector('#goaLer')?.addEventListener('click', async () => {
    est.lendo = true; est.erro = ''; render();
    try {
      const ins = instrutores();
      const { dados, modelo } = await lerFicha(app, est.arqs, ins.map((i) => i.canac ? `${i.nome} (CANAC ${i.canac})` : i.nome));
      est.f = fichaParaForm(dados, padraoVoo(hoje(), contaAtual().militar || ''), ins);
      const mapa = { data: 'data', missao: 'missao', instrutor: 'instrutor', canacInstrutor: 'canacInstr', matricula: 'matricula', partida: 'hIni', corte: 'hFim', decolagem: 'hDec', pouso: 'hPouso', totalMissao: 'tempo', pousos: 'pousos', rotaVoada: 'rota', parecer: 'pontos', grauFinal: 'conceito' };
      est.duvidas = (dados.duvidas || []).map((d) => mapa[d] || d);
      // o que ficou vazio também é para conferir
      ['data', 'missao', 'instrutor', 'matricula', 'hIni', 'hFim', 'hDec', 'hPouso', 'tempo', 'pousos'].forEach((k) => { if (!est.f[k] && !est.duvidas.includes(k)) est.duvidas.push(k); });
      est.modelo = modelo; est.etapa = 'previa'; est.modo = 'voo'; est.diario = '';
    } catch (e) { est.erro = explicarErro(e); }
    est.lendo = false; render(); if (est.etapa === 'previa') window.scrollTo(0, 0);
  });

  // prévia editável: grava no estado e atualiza o link sem redesenhar a tela
  c.querySelectorAll('[data-gk]').forEach((el) => el.addEventListener('input', () => { est.f[el.dataset.gk] = el.value; atualizarLink(); }));
  c.querySelectorAll('[data-gr]').forEach((b) => b.onclick = () => {
    est.f[b.dataset.gr] = b.dataset.v;
    c.querySelectorAll(`[data-gr="${b.dataset.gr}"]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); atualizarLink();
  });
  c.querySelectorAll('[data-gc]').forEach((el) => el.addEventListener('change', () => {
    est.f[el.dataset.gc] = [...c.querySelectorAll(`[data-gc="${el.dataset.gc}"]:checked`)].map((x) => x.value); atualizarLink();
  }));
  c.querySelector('#goaCopiar')?.addEventListener('click', () => {
    const { email, militar } = contaAtual(); const l = linkForm({ ...est.f, militar }, est.modo, email);
    navigator.clipboard?.writeText(l).then(() => toast('Link copiado'), () => toast('Não deu para copiar'));
  });
  c.querySelector('#goaRecomecar')?.addEventListener('click', () => { Object.assign(est, { diario: '', modo: '', etapa: 'escolha', arqs: [], f: {}, erro: '', duvidas: [], modelo: '' }); render(); window.scrollTo(0, 0); });
}
