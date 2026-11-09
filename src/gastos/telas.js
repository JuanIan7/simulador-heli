// Telas da página de gastos: "Meus gastos" (o que é meu: gastei, me devem, devo, histórico) e "Turma" (o coletivo).
// Só monta HTML a partir dos dados; quem liga os botões é main.js (os data-* são os mesmos de antes:
// data-parte (quem recebeu confirma), data-aviso (quem deve avisa), data-quitar/data-informar (acerto inteiro), data-ed (editar)).
import { brl, partes, calcular, pixDe } from './contas.js';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dBR = (iso) => iso ? iso.split('-').reverse().join('/') : '';
const dCurta = (iso) => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
const soma = (l) => l.reduce((s, x) => s + x.v, 0);
const ord = (a, b) => (b.data + (b.criadoMs || 0)).localeCompare(a.data + (a.criadoMs || 0));

// Gasto "só meu": eu paguei e só eu participo. Não entra nas contas da turma.
export const ehPessoal = (g) => !!g.pagoPor && (g.participantes || []).length === 1 && g.participantes[0] === g.pagoPor;
export const coletivos = (gastos) => gastos.filter((g) => !ehPessoal(g));
// quando alguém confirmou o recebimento de uma parte (gastos/{id}.quitadosEm[nome] = 'AAAA-MM-DD')
const quandoQuitou = (g, nome) => g.quitadosEm?.[nome] ? ' em ' + dCurta(g.quitadosEm[nome]) : '';

export const seletor = (visao) => `<div class="seg" role="tablist">
  <button role="tab" aria-selected="${visao === 'meu'}" data-visao="meu">👤 Meus gastos</button>
  <button role="tab" aria-selected="${visao === 'turma'}" data-visao="turma">👥 Turma</button></div>`;

// ---------- o que é meu ----------
export function resumoMeu(eu, gastos) {
  const r = calcular(coletivos(gastos)), p = r.pessoa[eu] || { parte: 0, desembolso: 0 };
  const linhas = []; let soMeus = 0, meDevem = 0, recebi = 0, devo = 0, paguei = 0, avisei = 0, avisaram = 0;
  for (const g of gastos) {
    const ps = partes(g), minha = ps.find((x) => x.nome === eu);
    if (!minha && g.pagoPor !== eu) continue;
    const parte = minha?.valor || 0; let tipo, status, pend = [], ok = [];
    if (ehPessoal(g)) { tipo = 'meu'; status = 'meu'; soMeus += g.valor || 0; }
    else if (g.pagoPor === eu) {
      tipo = 'paguei'; const outros = ps.filter((x) => !x.pagador); pend = outros.filter((x) => !x.quitado); ok = outros.filter((x) => x.quitado);
      pend.forEach((x) => { meDevem += x.valor; if (x.informado) avisaram += x.valor; }); ok.forEach((x) => { recebi += x.valor; });
      status = pend.length ? 'receber' : 'recebido';
    } else if (!g.pagoPor) { tipo = 'cada'; status = 'pago'; }
    else { tipo = 'dividido'; if (minha.quitado) { status = 'paguei'; paguei += parte; } else if (minha.informado) { status = 'avisei'; devo += parte; avisei += parte; } else { status = 'devo'; devo += parte; } }
    linhas.push({ g, ps, parte, tipo, status, pend, ok });
  }
  linhas.sort((a, b) => ord(a.g, b.g));
  return { linhas, gastei: p.parte + soMeus, bolso: p.desembolso + soMeus, soMeus, meDevem, recebi, devo, paguei, avisei, avisaram, acertos: r.acertos };
}

// Minha relação com cada pessoa: o que ela me deve (item a item), o que já me pagou, o que eu devo a ela e o que já paguei.
export function porPessoa(eu, gastos) {
  const m = {}, O = (n) => (m[n] ||= { nome: n, meDeve: [], pagou: [], devo: [], paguei: [] });
  for (const g of coletivos(gastos)) {
    if (!g.pagoPor) continue;
    const ps = partes(g);
    if (g.pagoPor === eu) ps.filter((x) => !x.pagador).forEach((x) => (x.quitado ? O(x.nome).pagou : O(x.nome).meDeve).push({ g, v: x.valor, inf: x.informado, nome: x.nome }));
    else { const minha = ps.find((x) => x.nome === eu); if (minha) (minha.quitado ? O(g.pagoPor).paguei : O(g.pagoPor).devo).push({ g, v: minha.valor, inf: minha.informado, nome: eu }); }
  }
  return Object.values(m).map((o) => ({ ...o, saldo: soma(o.meDeve) - soma(o.devo) })).sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo) || a.nome.localeCompare(b.nome));
}

const item = (x, acao) => `<li><span>${esc(x.g.descricao)} <span class="sub">${dCurta(x.g.data)}</span></span><b>${brl(x.v)}</b>${acao || ''}</li>`;
function cartaoPessoa(o, eu, membros) {
  const pix = pixDe(membros, o.nome), aberto = o.meDeve.length || o.devo.length;
  const saldo = o.saldo > 0 ? `<span class="selo ok">te paga ${brl(o.saldo)}</span>` : o.saldo < 0 ? `<span class="selo nao">você paga ${brl(-o.saldo)}</span>` : `<span class="selo cin">em dia</span>`;
  const par = (de, para) => `${esc(de)}|${esc(para)}`;
  return `<details class="pessoa" ${aberto ? 'open' : ''}><summary><b>${esc(o.nome)}</b>${saldo}</summary>
    ${o.meDeve.length ? `<div class="bloco"><div class="rot nao">Falta te pagar · ${brl(soma(o.meDeve))}</div><ul>${o.meDeve.map((x) => item(x, `<button class="mini ${x.inf ? 'pri' : ''}" data-parte="${x.g.id}" data-nome="${esc(x.nome)}">${x.inf ? '💰 avisou · confirmar' : '✓ Recebi'}</button>`)).join('')}</ul></div>` : ''}
    ${o.pagou.length ? `<div class="bloco"><div class="rot ok">Já te pagou · ${brl(soma(o.pagou))}</div><ul>${o.pagou.map((x) => item(x, `<span class="sub">✓${quandoQuitou(x.g, x.nome)}</span>`)).join('')}</ul></div>` : ''}
    ${o.devo.length ? `<div class="bloco"><div class="rot nao">Você deve · ${brl(soma(o.devo))}</div><ul>${o.devo.map((x) => item(x, x.inf ? '<span class="sub">⏳ avisei</span>' : '')).join('')}</ul></div>` : ''}
    ${o.paguei.length ? `<div class="bloco"><div class="rot ok">Você já pagou · ${brl(soma(o.paguei))}</div><ul>${o.paguei.map((x) => item(x, `<span class="sub">✓${quandoQuitou(x.g, eu)}</span>`)).join('')}</ul></div>` : ''}
    ${aberto ? `<div class="linha-acao">${o.saldo > 0 ? `<button class="mini" data-quitar="${par(o.nome, eu)}">✓ Recebi tudo (${brl(o.saldo)})</button>` : ''}
      ${o.saldo < 0 ? `${pix ? `<button class="mini pri" data-pix-copiar="${esc(pix)}">Copiar Pix de ${esc(o.nome)}</button>` : `<span class="sub">${esc(o.nome)} ainda não cadastrou o Pix</span>`}<button class="mini" data-informar="${par(eu, o.nome)}">✓ Já paguei ${brl(-o.saldo)}</button>` : ''}</div>
      ${o.meDeve.length && o.devo.length ? `<p class="sub">Vocês dois se devem: compensando, ${o.saldo > 0 ? `${esc(o.nome)} te paga só a diferença` : `você paga só a diferença`}, ${brl(Math.abs(o.saldo))}.</p>` : ''}` : ''}
  </details>`;
}

const SELO = { meu: ['cin', 'só meu'], receber: ['nao', 'a receber'], recebido: ['ok', 'recebi tudo'], pago: ['ok', 'cada um o seu'], paguei: ['ok', 'paguei'], avisei: ['lan', '⏳ avisei que paguei'], devo: ['nao', 'devo'] };
const TIPO = { meu: '👤 só meu', paguei: '💳 paguei pela turma', dividido: '👥 dividido', cada: '🍽️ cada um o seu' };
function historico(res, eu, filtroMeu) {
  const l = filtroMeu === 'todos' ? res.linhas : res.linhas.filter((x) => x.tipo === filtroMeu);
  const chips = [['todos', 'Tudo'], ['meu', 'Só meus'], ['paguei', 'Paguei pela turma'], ['dividido', 'Divididos comigo']].map(([k, t]) => `<button class="chip" aria-pressed="${filtroMeu === k}" data-fm="${k}">${t}</button>`).join('');
  return `<section class="cartao"><div class="cab"><h3>Meu histórico</h3><span class="sub">${l.length} lançamento(s)</span></div><div class="chips">${chips}</div>
    ${l.length ? `<div class="hist">${l.map((x) => { const [cls, rot] = SELO[x.status]; return `<div class="hl"><div class="hd"><span class="sub">${dBR(x.g.data)}</span><span class="desc">${esc(x.g.descricao)}</span><span class="sub">${TIPO[x.tipo]}${x.tipo !== 'meu' ? ` · total ${brl(x.g.valor)}` : ''}${x.tipo === 'paguei' && x.pend.length ? ` · faltam ${x.pend.map((p) => esc(p.nome)).join(', ')}` : ''}${x.tipo === 'paguei' && x.ok.length ? ` · ✓ ${x.ok.map((p) => esc(p.nome)).join(', ')}` : ''}${x.tipo === 'dividido' ? ` · pagou ${esc(x.g.pagoPor)}` : ''}</span></div>
      <div class="hv"><b>${brl(x.tipo === 'paguei' ? x.g.valor : x.parte)}</b>${x.tipo === 'paguei' ? `<span class="sub">minha parte ${brl(x.parte)}</span>` : ''}<span class="selo ${cls}">${rot}</span><button class="mini" data-ed="${x.g.id}">✏️</button></div></div>`; }).join('')}</div>` : '<div class="vazio">Nada neste filtro.</div>'}</section>`;
}

export function telaMeu(ctx) {
  const { eu, gastos, membros, filtroMeu = 'todos' } = ctx, res = resumoMeu(eu, gastos), pes = porPessoa(eu, gastos);
  const devem = pes.filter((o) => o.saldo > 0), devo = pes.filter((o) => o.saldo < 0), emDia = pes.filter((o) => !o.saldo);
  // nos cartões vai o líquido (já compensando quem deve para quem), igual ao que cada um de fato paga
  const liqDevem = devem.reduce((s, o) => s + o.saldo, 0), liqDevo = -devo.reduce((s, o) => s + o.saldo, 0);
  return `<section class="cartao"><div class="cab"><div><h2>Olá, ${esc(eu)}</h2><div class="sub">o que você gastou no curso até agora</div></div><div class="linha-acao"><button class="pri" id="btFalar">🎤 Falar gasto</button><button id="btNovo">+ Novo gasto</button><button id="btNovoMeu">+ Só meu</button></div></div>
    <div class="totais">
      <div class="tot dest"><span>Gastei</span><b>${brl(res.gastei)}</b><span>minha parte em tudo${res.soMeus ? ` · ${brl(res.soMeus)} só meus` : ''}</span></div>
      <div class="tot"><span>Saiu do meu bolso</span><b>${brl(res.bolso)}</b><span>${res.bolso > res.gastei ? 'adiantei ' + brl(res.bolso - res.gastei) + ' pela turma' : res.bolso < res.gastei ? 'a turma adiantou ' + brl(res.gastei - res.bolso) : 'tudo acertado'}</span></div>
      <div class="tot"><span>Me devem</span><b class="${liqDevem ? 'neg' : ''}">${brl(liqDevem)}</b><span>${res.avisaram ? `💰 ${brl(res.avisaram)} avisaram que pagaram` : `já recebi ${brl(res.recebi)}`}</span></div>
      <div class="tot"><span>Eu devo</span><b class="${liqDevo ? 'neg' : ''}">${brl(liqDevo)}</b><span>${res.avisei ? `⏳ ${brl(res.avisei)} avisei que paguei` : res.devo > liqDevo ? `${brl(res.devo - liqDevo)} já descontados de quem me deve` : `já paguei ${brl(res.paguei)}`}</span></div>
    </div></section>
  ${devem.length ? `<section class="cartao"><div class="cab"><h3>Quem me deve</h3><b class="v">${brl(devem.reduce((s, o) => s + o.saldo, 0))}</b></div>${devem.map((o) => cartaoPessoa(o, eu, membros)).join('')}
    <p class="dica">Toque em <b>✓ Recebi</b> no item que caiu na sua conta (ou em <b>Recebi tudo</b>). Quem deve só avisa; quem confirma é você.</p></section>` : ''}
  ${devo.length ? `<section class="cartao"><div class="cab"><h3>A quem eu devo</h3><b class="v">${brl(-devo.reduce((s, o) => s + o.saldo, 0))}</b></div>${devo.map((o) => cartaoPessoa(o, eu, membros)).join('')}</section>` : ''}
  ${!devem.length && !devo.length ? '<section class="cartao"><div class="vazio">✓ Você não deve nada a ninguém, e ninguém te deve.</div></section>' : ''}
  ${emDia.length ? `<section class="cartao"><h3>Em dia</h3>${emDia.map((o) => cartaoPessoa(o, eu, membros)).join('')}</section>` : ''}
  ${graficos(res.linhas.map((x) => ({ data: x.g.data, valor: x.parte, categoria: x.g.categoria })), { titulo: 'Meus gastos', hoje: ctx.hoje, CATEGORIAS: ctx.CATEGORIAS, nota: 'Só a sua parte em cada gasto (e os gastos só seus inteiros), não o que você adiantou pela turma.' })}
  ${historico(res, eu, filtroMeu)}`;
}


// ---------- gráficos (por dia, por semana e por categoria), só SVG ----------
const dDia = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const brlCurto = (c) => { const v = c / 100; return v >= 1000 ? 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : 'R$ ' + Math.round(v).toLocaleString('pt-BR'); };
// itens: [{ data, valor, categoria }] (para a turma, o total de cada gasto; para mim, só a minha parte)
export function graficos(itens, { titulo, hoje, CATEGORIAS, nota }) {
  const porDia = {}, porCat = {}; let total = 0;
  itens.forEach((x) => { porDia[x.data] = (porDia[x.data] || 0) + x.valor; porCat[x.categoria] = (porCat[x.categoria] || 0) + x.valor; total += x.valor; });
  const dias = Object.keys(porDia).sort(); if (!dias.length || !total) return '';
  const fim = hoje > dias[dias.length - 1] ? hoje : dias[dias.length - 1];
  const todos = []; for (let d = dias[0]; d <= fim && todos.length < 120; d = addDias(d, 1)) todos.push(d);
  const max = Math.max(...Object.values(porDia)), topo = dias.reduce((a, b) => porDia[a] >= porDia[b] ? a : b);
  const semana = (iso) => { const d = new Date(iso + 'T12:00:00'); return addDias(iso, -((d.getDay() + 6) % 7)); };
  const semanas = {}; todos.forEach((d) => { const k = semana(d); (semanas[k] ||= { de: k, ate: addDias(k, 6), total: 0, n: 0 }); if (porDia[d]) { semanas[k].total += porDia[d]; semanas[k].n++; } });
  const sem = Object.values(semanas), semTopo = sem.reduce((a, b) => a.total >= b.total ? a : b);
  const W = 640, H = 190, ml = 8, mr = 8, mt = 22, mb = 34, lw = (W - ml - mr) / todos.length, bw = Math.max(3, Math.min(26, lw * 0.64)), ph = H - mt - mb;
  const y = (v) => mt + ph - (max ? v / max * ph : 0);
  const barras = todos.map((d, i) => { const v = porDia[d] || 0, x = ml + i * lw + (lw - bw) / 2, h = v ? Math.max(3, ph - (y(v) - mt)) : 0;
    return `<g><title>${dBR(d)}: ${brl(v)}</title><rect x="${x.toFixed(1)}" y="${(mt + ph - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, bw / 2)}" fill="${d === topo ? 'var(--lar-esc)' : 'var(--lar)'}" opacity="${v ? 1 : 0}"/>
      ${d === topo ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(mt + ph - h - 6).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--pre)">${esc(brlCurto(v))}</text>` : ''}
      ${(todos.length <= 14 || i % 7 === 0 || d === todos[todos.length - 1]) ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H - mb + 16}" text-anchor="middle" font-size="11" fill="var(--cin)">${dDia(d)}</text>` : ''}</g>`; }).join('');
  const divisores = todos.map((d, i) => i && semana(d) === d ? `<line x1="${(ml + i * lw).toFixed(1)}" x2="${(ml + i * lw).toFixed(1)}" y1="${mt - 4}" y2="${mt + ph}" stroke="var(--cin2)" stroke-dasharray="3 3"/>` : '').join('');
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]), maxCat = cats[0]?.[1] || 1;
  return `<section class="cartao"><div class="cab"><h3>${esc(titulo)} por dia</h3><span class="sub">${todos.length} dia(s) · maior: <b>${dBR(topo)}</b>, ${brl(porDia[topo])}</span></div>
    <div class="grafico"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titulo)} por dia">${divisores}<line x1="${ml}" x2="${W - mr}" y1="${mt + ph}" y2="${mt + ph}" stroke="var(--cin2)"/>${barras}</svg></div>
    <div class="semanas">${sem.map((s) => `<div class="semana ${s === semTopo ? 'dest' : ''}"><span>Semana ${dDia(s.de)} a ${dDia(s.ate)}</span><b>${brl(s.total)}</b><span class="sub">${s.n ? s.n + ' dia(s) com gasto' : 'sem gasto'}${s === semTopo && sem.length > 1 ? ' · a mais cara' : ''}</span></div>`).join('')}</div>
    <h3 style="margin-top:6px">${esc(titulo)} por categoria</h3>
    <div class="cats">${cats.map(([k, v]) => `<div class="cat"><div class="cab"><span>${esc((CATEGORIAS[k] || 'Outros').split(' (')[0])}</span><b>${brl(v)} <span class="sub">${Math.round(v / total * 100)}%</span></b></div><div class="barra"><i style="width:${(v / maxCat * 100).toFixed(1)}%"></i></div></div>`).join('')}</div>
    ${nota ? `<p class="sub">${nota}</p>` : ''}</section>`;
}

// ---------- a turma ----------
// Cartão de um gasto com "quem já pagou" e "quem falta" em linhas separadas, em vez de uma fileira de chips.
export function cartaoGasto(g, eu, admin, CATEGORIAS) {
  const ps = partes(g), outros = ps.filter((p) => !p.pagador);
  const pagos = outros.filter((p) => p.quitado), faltam = outros.filter((p) => !p.quitado), souPagador = g.pagoPor === eu || admin;
  const chip = (p) => {
    const rot = `${esc(p.nome)} ${brl(p.valor)}`;
    if (!g.pagoPor) return `<span class="parte pago">✓ ${rot}</span>`;
    if (p.quitado) return souPagador ? `<button class="parte pago" data-parte="${g.id}" data-nome="${esc(p.nome)}" title="Toque para voltar para pendente">✓ ${rot}${quandoQuitou(g, p.nome)}</button>` : `<span class="parte pago">✓ ${rot}${quandoQuitou(g, p.nome)}</span>`;
    if (souPagador) return `<button class="parte ${p.informado ? 'aviso' : 'deve'}" data-parte="${g.id}" data-nome="${esc(p.nome)}" title="Toque para confirmar que recebeu">${rot}${p.informado ? ' · 💰 avisou, confirmar' : ''}</button>`;
    if (p.nome === eu) return `<button class="parte ${p.informado ? 'aviso' : 'deve'}" data-aviso="${g.id}" data-nome="${esc(p.nome)}">${rot}${p.informado ? ' · ⏳ avisei' : ' · ✓ já paguei?'}</button>`;
    return `<span class="parte ${p.informado ? 'aviso' : 'deve'}">${rot}${p.informado ? ' · avisou' : ''}</span>`;
  };
  const estado = !g.pagoPor ? '<span class="selo ok">cada um pagou o seu</span>' : !faltam.length ? '<span class="selo ok">✓ tudo acertado</span>' : `<span class="selo nao">faltam ${faltam.length} de ${outros.length}</span>`;
  return `<div class="gasto ${g.pagoPor === eu ? 'meu-pag' : ''}"><div class="linha1"><span class="desc">${esc(g.descricao)}</span><span class="valor">${brl(g.valor)}</span></div>
    <div class="sub">${dBR(g.data)} · ${esc((CATEGORIAS[g.categoria] || 'Outros').split(' (')[0])} · ${g.pagoPor ? `pago por <b class="${g.pagoPor === eu ? 'eu' : ''}">${esc(g.pagoPor === eu ? 'você' : g.pagoPor)}</b>` : 'cada um pagou a sua parte'} · ${ps.length} pessoa(s)${ps.length ? ', ' + brl(ps[0].valor) + ' cada' : ''}${g.obs ? ' · ' + esc(g.obs) : ''} ${estado}</div>
    ${g.pagoPor && faltam.length ? `<div class="quem"><span class="rot nao">Faltam</span><span class="chips">${faltam.map(chip).join('')}</span></div>` : ''}
    ${g.pagoPor && pagos.length ? `<div class="quem"><span class="rot ok">Pagaram</span><span class="chips">${pagos.map(chip).join('')}</span></div>` : ''}
    ${!g.pagoPor ? `<div class="chips">${ps.map(chip).join('')}</div>` : ''}
    <div class="linha-acao"><button class="mini" data-ed="${g.id}">✏️ Editar</button></div></div>`;
}

export function telaTurma(ctx) {
  const { eu, gastos, membros, grupo, CATEGORIAS, admin, filtro = 'todos', hoje } = ctx;
  const col = coletivos(gastos), r = calcular(col);
  const pessoas = [...new Set([...(grupo.pessoas || []), ...Object.keys(r.pessoa)])], entrou = new Set(membros.map((m) => m.nome));
  const lista = (filtro === 'pendentes' ? col.filter((g) => partes(g).some((p) => !p.quitado)) : filtro === 'todos' ? col : col.filter((g) => g.categoria === filtro)).sort(ord);
  return `<section class="cartao"><div class="cab"><div><h2>${esc(grupo.grupo)}</h2><div class="sub">${pessoas.length} pessoa(s) · ${col.length} gasto(s) em comum</div></div><button class="pri" id="btNovo">+ Novo gasto</button></div>
    <div class="totais">
      <div class="tot dest"><span>Total da turma</span><b>${brl(r.total)}</b><span>todos juntos</span></div>
      <div class="tot"><span>Por pessoa</span><b>${brl(pessoas.length ? r.total / pessoas.length : 0)}</b><span>média</span></div>
      <div class="tot"><span>Em aberto</span><b class="${r.pendente ? 'neg' : ''}">${brl(r.pendente)}</b><span>${r.acertos.length} acerto(s) pendente(s)</span></div>
    </div></section>
  <section class="cartao"><h3>Quem deve para quem</h3>
    ${r.acertos.length ? r.acertos.map((a) => { const par = `${esc(a.de)}|${esc(a.para)}`, pix = pixDe(membros, a.para);
      const acao = a.de === eu ? (a.inf ? `<span class="selo lan">⏳ você avisou que pagou</span><button class="mini" data-desinformar="${par}">Desfazer</button>` : `${pix ? `<button class="mini" data-pix-copiar="${esc(pix)}">Copiar Pix</button>` : ''}<button class="mini" data-informar="${par}">✓ Já paguei</button>`)
        : a.para === eu ? (a.inf ? `<span class="selo lan">💰 avisou que pagou</span><button class="mini pri" data-quitar="${par}">✓ Recebi, confirmar</button>` : `<button class="mini" data-quitar="${par}">✓ Já recebi</button>`)
        : `${a.inf ? '<span class="selo lan">⏳ aguardando confirmação</span>' : ''}${admin ? `<button class="mini" data-quitar="${par}">✓ Pago</button>` : ''}`;
      return `<div class="acerto"><span><b class="${a.de === eu ? 'eu' : ''}">${esc(a.de === eu ? 'Você' : a.de)}</b> deve <b class="v">${brl(a.valor)}</b> a <b class="${a.para === eu ? 'eu' : ''}">${esc(a.para === eu ? 'você' : a.para)}</b></span><span class="linha-acao">${acao}</span></div>`; }).join('')
      : '<div class="vazio">Ninguém deve nada a ninguém. Tudo acertado.</div>'}
    ${r.acertos.length ? '<div class="dica">Já compensa o que um deve ao outro. Quem deve paga pelo Pix e toca em "✓ Já paguei"; só sai da lista quando quem recebe confirma. O detalhe item a item está em <b>Meus gastos</b>.</div>' : ''}</section>
  ${graficos(col.map((g) => ({ data: g.data, valor: g.valor || 0, categoria: g.categoria })), { titulo: 'Gastos da turma', hoje, CATEGORIAS, nota: 'Soma do que a turma gastou junto, sem descontar quem pagou. Cada gasto tem sua categoria, que dá para trocar em "✏️ Editar".' })}
  <section class="cartao"><div class="cab"><h2>Gastos em comum</h2></div>
    <div class="chips"><button class="chip" aria-pressed="${filtro === 'todos'}" data-f="todos">Todos</button><button class="chip" aria-pressed="${filtro === 'pendentes'}" data-f="pendentes">Com pendência</button>${Object.entries(CATEGORIAS).filter(([k]) => r.porCat[k]).map(([k, t]) => `<button class="chip" aria-pressed="${filtro === k}" data-f="${k}">${esc(t.split(' (')[0])}</button>`).join('')}</div>
    ${lista.length ? `<div>${lista.map((g) => cartaoGasto(g, eu, admin, CATEGORIAS)).join('')}</div>` : `<div class="vazio">${col.length ? 'Nenhum gasto neste filtro.' : 'Nenhum gasto lançado ainda. Toque em <b>+ Novo gasto</b>.'}</div>`}
    ${col.length ? '<div class="linha-acao"><button id="btCsv">Baixar planilha (CSV)</button><button id="btCopiar">Copiar resumo</button></div>' : ''}</section>
  <section class="cartao"><h3>Por pessoa</h3>
    <div class="tabela"><table><thead><tr><th>Pessoa</th><th class="n">Parte</th><th class="n">Saiu do bolso</th><th class="n">Deve</th><th class="n">A receber</th></tr></thead><tbody>
      ${pessoas.map((n) => { const p = r.pessoa[n] || { parte: 0, desembolso: 0, deve: 0, receber: 0 }; return `<tr><td><b class="${n === eu ? 'eu' : ''}">${esc(n)}</b>${entrou.has(n) ? '' : ' <span class="sub">(não entrou)</span>'}</td><td class="n">${brl(p.parte)}</td><td class="n">${brl(p.desembolso)}</td><td class="n ${p.deve ? 'neg' : ''}">${brl(p.deve)}</td><td class="n ${p.receber ? 'pos' : ''}">${brl(p.receber)}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="sub">"Saiu do bolso" é o dinheiro que a pessoa de fato desembolsou até agora, descontado o que já recebeu. Quando tudo for acertado, fica igual à parte.</p></section>`;
}
