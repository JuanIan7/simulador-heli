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
