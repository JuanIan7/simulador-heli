// Aba Contrato do Hangar: o que a turma precisa saber do Contrato 089/2026 (CBMERJ x EACAR) e do Edital/TR da SENASP
// a que ele está vinculado. Cada item cita a cláusula e a página do PDF (pasta do Drive da turma).
// Fonte lida em 10/11/2026: contrato (4 págs.) e "Edital 34 e anexos (destaques)" (114 págs.: edital, TR 24/2025, ETP, IMR, anexos dos cursos).
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// [texto, fonte, página do PDF] — fonte: 'c' contrato, 'e' edital
const ESCOLA = [
  ['Ser CIAC homologado pela ANAC, com os cursos homologados, durante todo o contrato.', 'e', 27, 'TR 5.5.4'],
  ['Cumprir a carga horária exigida pela ANAC. Ground school e exame prático (cheque) do PPH presenciais.', 'e', 27, 'TR 5.5.5–5.5.6'],
  ['Fornecer o material: manuais e checklists da aeronave, cartas aeronáuticas, computador de voo, apostilas de todas as matérias e coletânea de questões.', 'e', 27, 'TR 5.5.7; Anexo 2.1.2.1 e 2.3'],
  ['Pagar as taxas: inscrição na banca teórica da ANAC, exame de proficiência (cheque) e emissão da licença.', 'e', 28, 'TR 5.6.1; Anexo 5.3 (p. 90–91)'],
  ['Cuidar de todo o processo do cheque de PPH junto à ANAC.', 'e', 85, 'Anexo 2.2'],
  ['Entregar, no 1º dia, o cronograma das aulas e a tabela das missões de voo do curso, para acompanharmos as horas.', 'e', 56, 'ETP 4.5.5.3 e 4.7'],
  ['Fazer briefing e debriefing em toda instrução, dizendo em detalhe o nosso desempenho em cada manobra.', 'e', 56, 'ETP 4.5.5.1'],
  ['Trocar em tempo hábil a aeronave que parar para manutenção (ou alugar outra) sem estourar o prazo do curso.', 'e', 54, 'ETP 4.3.6'],
  ['Instrutores com licença e habilitação válidas (INVH) e examinador credenciado na ANAC.', 'e', 57, 'ETP 4.8.1'],
  ['Manter um canal para tirar dúvidas durante todo o curso.', 'e', 60, 'ETP 4.20.5; TR 5.6.8'],
  ['Se prorrogar o cronograma, justificar por escrito o motivo.', 'e', 56, 'ETP 4.5.5.5'],
  ['Atividades de no máximo 8 horas por dia.', 'e', 27, 'TR 5.5.2'],
  ['Avisar o fiscal do contrato de qualquer ocorrência anormal ou acidente em até 24 horas.', 'c', 2, 'Cláusula 9.7'],
  ['Salas climatizadas, biblioteca técnica, helicópteros homologados e heliponto.', 'e', 28, 'TR 5.6.3'],
  ['Dar o certificado a quem concluir com aproveitamento e guardar os registros dos alunos (RBAC 141).', 'e', 56, 'ETP 4.5.5.2 e 4.20.7'],
  ['Proteger os nossos dados pessoais (LGPD).', 'c', 2, 'Cláusula 10'],
];
const NOSSO = [
  ['CMA de 1ª classe válido o curso todo. Entregar cópia na escola no 1º dia útil da parte prática. O custo do CMA é nosso.', 'e', 53, 'ETP 4.1.14 e 4.5.2.2 (p. 55)'],
  ['A parte prática exige aprovação na banca teórica da ANAC, mas as horas em duplo comando podem ser feitas antes.', 'e', 54, 'ETP 4.3 (requisitos do PPH)'],
  ['Reprovou (teórico ou prático)? As despesas da nova avaliação na ANAC são do aluno, e há 30 dias para refazer.', 'e', 55, 'ETP 4.5.1.5–4.5.1.6'],
  ['Desistência ou abandono obrigam a devolver o valor do curso ao erário (parcela única ou desconto em folha, com SELIC). Exceções: lesão incapacitante, perda de membro ou função, deformidade permanente, morte ou falência da escola. O texto é do TR federal: confirme com o GOA como vale para o CBMERJ.', 'e', 55, 'ETP 4.5.1.1–4.5.1.2'],
  ['Diárias, passagens, deslocamento, hospedagem e alimentação não entram no contrato (no TR da SENASP ficam com o aluno/ente de origem).', 'e', 60, 'ETP 4.20.1'],
  ['Preencher todo dia o formulário de acompanhamento do GOA (um por atividade, inclusive dia sem voo). É a base da fiscalização.', '', 0, 'Forms do GOA'],
];
const COBRAR = [
  'Cronograma das aulas e tabela das missões (fases, tempo de cada missão, total previsto).',
  'Briefing antes e debriefing depois de cada voo, com a ficha de avaliação.',
  'As 40 horas completas na distribuição mínima (abaixo).',
  'Simulador só conta (até 5 h) se o CBMERJ autorizar por escrito, por mau tempo.',
  'Aeronave substituta quando a nossa estiver em manutenção.',
  'Material: manuais, checklists, cartas, computador de voo, apostilas.',
  'Palestra de Segurança de Voo com agente credenciado (pelo menos uma por piloto).',
  'Taxas da banca, do cheque e da licença pagas pela escola.',
  'Justificativa por escrito se o cronograma atrasar.',
  'Certificado no fim do curso.',
];
const HORAS = [
  ['40 h', 'de voo por aluno no PPH (instrução e solo)'],
  ['≥ 20 h', 'de instrução em duplo comando'],
  ['≥ 10 h', 'de voo solo diurno, incluindo 5 h de navegação'],
  ['1 navegação', 'de no mínimo 150 NM (270 km) com 2 pousos completos em aeródromos diferentes'],
  ['3 h noturnas', 'com 10 decolagens e 10 pousos completos no circuito'],
  ['≤ 5 h', 'em simulador, só com autorização escrita por mau tempo'],
];
const PRAZOS = [
  ['90 dias úteis', 'prazo máximo do PPH prático (teórico: 70 dias úteis), em turmas de até 25 alunos.', 'e', 52, 'ETP 4.1.6'],
  ['Sáb., dom. e feriados', 'a escola pode marcar aulas práticas conforme a disponibilidade dela e o tempo.', 'e', 53, 'ETP 4.1.10'],
  ['30 dias', 'depois da Ordem de Serviço, para a escola se mobilizar (cronograma, instrutores e aeronaves aprovados pelo fiscal).', 'e', 26, 'TR 5.1.2'],
  ['30 dias', 'para refazer em caso de reprovação.', 'e', 55, 'ETP 4.5.1.6'],
  ['24 horas', 'para a escola comunicar acidente ou ocorrência anormal ao fiscal.', 'c', 2, 'Cláusula 9.7'],
  ['12 meses', 'de vigência a partir da publicação no PNCP. Se o curso não acabar, prorroga automaticamente até concluir.', 'c', 1, 'Cláusula 2'],
];

export function telaContrato(arq) {
  const lk = (f, pag) => (f && arq[f === 'c' ? 'contrato' : 'edital'] ? `${arq[f === 'c' ? 'contrato' : 'edital']}#page=${pag}` : '');
  const fonte = (f, pag, ref) => { const u = lk(f, pag); return `<span class="ct-ref">${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(ref)} · ${f === 'c' ? 'contrato' : 'edital'} p. ${pag}</a>` : esc(ref)}</span>`; };
  const lista = (l) => `<ul class="ct-lista">${l.map(([t, f, p, ref]) => `<li><span>${esc(t)}</span>${fonte(f, p, ref)}</li>`).join('')}</ul>`;
  return `<div class="cab"><h2>Contrato do curso</h2><span class="selo la">nº 089/2026</span></div>
  <p class="intro">Resumo do que importa para a turma no contrato entre o CBMERJ e a EACAR e no Termo de Referência da SENASP a que ele está vinculado. Cada ponto mostra a cláusula e a página para conferir no original.</p>
  <div class="grade">
    <div class="caixa destaque"><div class="rotulo">O contrato</div>
      <div class="ct-fatos">
        <div><b>Partes</b><span>Estado do RJ (SEDEC/CBMERJ) e EACAR – Escola de Aviação Civil Asas Rotativas Ltda (Piraquara/PR)</span></div>
        <div><b>Base</b><span>Lei 14.133/2021, por adesão à Ata de Registro de Preços 039/2026 (TR 24/2025 da SENASP). Processo SEI-270005/001399/2026. Assinado em 08/09/2026.</span></div>
        <div><b>Objeto</b><span>4 vagas de Piloto Privado de Helicóptero (teórico + prático) a R$ 85.000,00 e 2 vagas de IFR a R$ 64.989,00. Total R$ 469.978,00.</span></div>
        <div><b>Pagamento</b><span>A escola recebe por turma concluída, depois de o fiscal do CBMERJ avaliar o serviço pelo IMR. O que relatamos pesa no pagamento.</span></div>
      </div>
      <div class="linha-acao">${arq.contrato ? `<a class="btn pri" href="${esc(arq.contrato)}" target="_blank" rel="noopener">📄 Contrato 089/2026</a>` : ''}${arq.edital ? `<a class="btn" href="${esc(arq.edital)}" target="_blank" rel="noopener">📄 Edital, TR e anexos</a>` : ''}</div></div>
    <div class="caixa"><div class="rotulo">Horas de voo do PPH</div>
      <div class="ct-horas">${HORAS.map(([n, t]) => `<div><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join('')}</div>
      ${fonte('e', 84, 'Anexo III, 2.1.3')}</div>
  </div>
  <div class="grade">
    <div class="caixa"><h3>O que a escola tem que fazer</h3>${lista(ESCOLA)}</div>
    <div class="caixa"><h3>O que é responsabilidade nossa</h3>${lista(NOSSO)}
      <div class="caixa ct-cobrar"><h3>O que cobrar</h3><ul>${COBRAR.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></div>
  </div>
  <div class="caixa"><h3>Prazos</h3><div class="ct-prazos">${PRAZOS.map(([n, t, f, p, ref]) => `<div><b>${esc(n)}</b><span>${esc(t)} ${fonte(f, p, ref)}</span></div>`).join('')}</div></div>
  <div class="grade">
    <div class="caixa"><h3>Como a escola é fiscalizada (IMR)</h3>
      <p class="sub">Todo mês o fiscal técnico dá uma nota de 350 pontos. Cada ocorrência tira pontos:</p>
      <ul class="ct-lista">
        <li><span><b>−10 por ocorrência (escola):</b> certificado faltando ou vencido, carga horária não cumprida, falta de material ou apostila, atraso no início, equipamento sem condição de uso.</span></li>
        <li><span><b>−20 por ocorrência (serviço):</b> não cumprir rotina diária, controle de frequência errado, não comunicar anormalidade ou risco, perder prazo, serviço fora do padrão e não corrigido, negligência ou falta de urbanidade, não atender notificação do fiscal.</span></li>
        <li><span><b>Desconto no pagamento:</b> 310 a 350 sem desconto; 290 a 309, 5%; abaixo de 290, 10%. Abaixo de 250 pontos, ou mais de 6 descontos de 10%, pode haver rescisão. O 1º mês vale só como aviso.</span></li>
        <li><span><b>Quem relata:</b> o fiscal ou qualquer servidor que viu a ocorrência, por e-mail ao fiscal. Para isso servem os registros do formulário diário do GOA.</span></li>
      </ul>${fonte('e', 78, 'Anexo IMR, 3 a 5 (p. 78–80)')}</div>
    <div class="caixa"><h3>Multas da escola (contrato)</h3>
      <ul class="ct-lista">
        <li><span>Atraso injustificado: 1% por dia útil sobre o saldo não atendido, até 30%.</span>${fonte('c', 3, 'Cláusula 12.3')}</li>
        <li><span>Inexecução parcial: 0,5% a 1,5% do valor anual. Retardar a execução sem motivo: 0,5% a 15%.</span>${fonte('c', 3, 'Cláusula 12.2.2')}</li>
        <li><span>Rescisão por inexecução: multa compensatória de 5% do contrato.</span>${fonte('c', 3, 'Cláusula 12.4')}</li>
        <li><span>O CBMERJ tem 30 dias para decidir qualquer reclamação ou pedido feito por escrito.</span>${fonte('c', 1, 'Cláusula 8.1.10.1')}</li>
      </ul></div>
  </div>
  <p class="sub">O contrato remete ao Termo de Referência e ao Edital para os detalhes do curso. Partes do TR foram escritas para alunos da SENASP (Força Nacional): ressarcimento, despesas e envio do CMA podem seguir regra própria do CBMERJ. Na dúvida, pergunte ao fiscal do contrato ou ao GOA.</p>`;
}
