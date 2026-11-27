// Quem entra num aviso de pagamento e quem entra num acerto. Sem Firebase: é a regra pura, para dar para testar.
//
// O acerto tem dois passos e dois donos diferentes:
//   1. QUEM DEVE avisa que pagou  -> informados[]  (partesParaAvisar)
//   2. QUEM RECEBE confirma       -> quitados[]    (partesParaQuitar)
// O aviso é de mão única: marcar o sentido contrário faria o pagador aparecer, na própria tela,
// como se o outro tivesse avisado que pagou a ele — e aí ele mesmo poderia "confirmar o recebimento".

const deve = (g, nome) => (g.participantes || []).includes(nome) && !(g.quitados || []).includes(nome);

// Partes que `de` deve a `para`: só os gastos que `para` pagou. Nunca o sentido contrário.
export function partesParaAvisar(gastos, de, para) {
  return (gastos || []).filter((g) => g.pagoPor === para && deve(g, de));
}

// Partes que um acerto entre `a` e `b` quita: os dois sentidos, porque o acerto é a diferença.
export function partesParaQuitar(gastos, a, b) {
  const r = [];
  for (const g of gastos || []) {
    const devedor = g.pagoPor === b ? a : g.pagoPor === a ? b : null;
    if (devedor && deve(g, devedor)) r.push({ g, devedor });
  }
  return r;
}

// Partes que um acerto entre `a` e `b` quitou no dia `dia` (AAAA-MM-DD), nos dois sentidos, como o partesParaQuitar.
// Serve para desfazer um "Recebi" marcado por engano. Sem `dia`, pega tudo o que está quitado entre os dois.
export function partesQuitadasEm(gastos, a, b, dia) {
  const r = [];
  for (const g of gastos || []) {
    const devedor = g.pagoPor === b ? a : g.pagoPor === a ? b : null;
    if (devedor && (g.participantes || []).includes(devedor) && (g.quitados || []).includes(devedor) && (!dia || g.quitadosEm?.[devedor] === dia)) r.push({ g, devedor });
  }
  return r;
}

// Acertos que `eu` confirmou (recebi) nos últimos `dias`: um por pessoa e por dia, com o valor líquido que entrou.
export function confirmadosRecentes(gastos, eu, parteDe, hoje, dias = 14) {
  const lim = new Date(hoje + 'T12:00:00'); lim.setDate(lim.getDate() - dias); const corte = lim.toISOString().slice(0, 10);
  const m = {};
  for (const g of gastos || []) {
    for (const [nome, dia] of Object.entries(g.quitadosEm || {})) {
      if (!dia || dia < corte || !(g.quitados || []).includes(nome) || !(g.participantes || []).includes(nome)) continue;
      const outro = g.pagoPor === eu ? nome : nome === eu ? g.pagoPor : null;
      if (!outro || outro === eu) continue;
      const k = outro + '|' + dia, v = parteDe(g, nome);
      (m[k] ||= { outro, dia, valor: 0 }).valor += g.pagoPor === eu ? v : -v;
    }
  }
  return Object.values(m).filter((x) => x.valor > 0).sort((x, y) => y.dia.localeCompare(x.dia));
}
