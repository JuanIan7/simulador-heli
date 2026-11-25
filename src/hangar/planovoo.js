// Aba "Plano de voo" do Hangar da Turma (grupo Voo): monta uma navegação pelas Rotas Especiais de Helicópteros (REH) de Curitiba,
// com navlog, os campos do plano de voo (como no FPL BR), a fonia de cada trecho e um treino rápido de fonia.
// Base: AIC N 34/23 e carta CCV REH WT-Curitiba (DECEA); prazos da ICA 100-11/2017. É material de estudo: quem decide a rota é o instrutor.
import { PTS, ORGAOS, REH, LIGACOES, TRANSPONDER, FONTES, APPS } from './planovoo/dados.js';
import { distNM, proaMagnetica, fmtProa, fmtNM, fmtTempo } from './navegacao.js';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const semAcento = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const pes = (n) => n.toLocaleString('pt-BR');
const r3 = (n) => String(Math.round(n) % 360 || 360).padStart(3, '0') + '°';
const nomeDe = (id) => PTS[id]?.curto || PTS[id]?.nome || id;

// ---------- grafo dos corredores ----------
const PERNAS = [];   // cada perna nos dois sentidos
for (const [reh, r] of Object.entries(REH)) for (const [a, b, ida, volta, max, min, org, est] of r.pernas) {
  PERNAS.push({ a, b, reh, rumo: ida, max, min, org, est: !!est });
  PERNAS.push({ a: b, b: a, reh, rumo: volta, max, min, org, est: !!est });
}
for (const [a, b, org, desc] of LIGACOES) { PERNAS.push({ a, b, lig: true, org, desc }); PERNAS.push({ a: b, b: a, lig: true, org, desc }); }
const pernaEntre = (a, b) => PERNAS.find((p) => p.a === a && p.b === b);
// caminho mais curto pelos corredores; ligações (fora da REH) custam mais; aeródromos só no começo ou no fim
function caminho(de, para) {
  if (de === para) return [de];
  const dist = { [de]: 0 }, ant = {}, feito = new Set();
  while (true) {
    let u = null; for (const k in dist) if (!feito.has(k) && (u === null || dist[k] < dist[u])) u = k;
    if (u === null) return null;
    if (u === para) break;
    feito.add(u);
    if (u !== de && PTS[u].tipo === 'ad' && u !== 'sbbi') continue;   // não atravessa SISY nem SBCT
    for (const p of PERNAS.filter((x) => x.a === u)) {
      const custo = distNM(PTS[p.a], PTS[p.b]) * (p.lig ? 1.3 : 1) * (p.a === 'sbbi' || p.b === 'sbbi' ? (p.b === para || p.a === de ? 1 : 1.6) : 1);
      const n = dist[u] + custo;
      if (dist[p.b] === undefined || n < dist[p.b]) { dist[p.b] = n; ant[p.b] = u; }
    }
  }
  const out = [para]; let x = para; while (x !== de) { x = ant[x]; out.unshift(x); } return out;
}

// ---------- estado (fica no aparelho) ----------
const CFG0 = { mat: 'PR-HMI', eq: 'V/C', kt: 80, hora: '09:00', data: '', aut: '02:00', pob: 2, piloto: '', cor: '' };
let cfg = { ...CFG0 }, rota = ['sisy'], mapa = null, grupoRota = null, ctxEl = null, sorteio = null, mostrar = false;
try { cfg = { ...CFG0, ...JSON.parse(localStorage.getItem('pv-cfg') || '{}') }; const r = JSON.parse(localStorage.getItem('pv-rota') || 'null'); if (Array.isArray(r) && r.length && r.every((x) => PTS[x])) rota = r; } catch {}
const guardar = () => { try { localStorage.setItem('pv-cfg', JSON.stringify(cfg)); localStorage.setItem('pv-rota', JSON.stringify(rota)); } catch {} };
const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

const MODELOS = [
  { id: 'bi', nome: 'SISY → Bacacheri pela ECHO', rota: ['sisy', 'panoramico', 'sbbi'] },
  { id: 'ct', nome: 'SISY → Afonso Pena pelo portão Guatupê', rota: ['sisy', 'guatupe', 'sbct'] },
  { id: 'anel', nome: 'Ida e volta pela ECHO e ALFA até Barro Preto', rota: ['sisy', 'trevopiraquara', 'barropreto', 'sisy'] },
  { id: 'barigui', nome: 'SISY → Barigui → SISY (cruzando o Bacacheri)', rota: ['sisy', 'barigui', 'sisy'] },
];
// expande os pontos escolhidos pelo caminho dos corredores
function expandir(pontos) {
  const out = [pontos[0]];
  for (let i = 1; i < pontos.length; i++) { const c = caminho(out[out.length - 1], pontos[i]); if (!c) return null; out.push(...c.slice(1)); }
  return out;
}

// ---------- cálculos ----------
const faixaAlt = (p) => p.max ? Math.max(p.min, Math.floor((p.min + p.max) / 2 / 100) * 100) : null;
function pernas() {
  const out = []; let t = 0;   // minutos desde a decolagem
  for (let i = 1; i < rota.length; i++) {
    const a = rota[i - 1], b = rota[i], p = pernaEntre(a, b) || { a, b, dct: true };
    const nm = distNM(PTS[a], PTS[b]), tmin = nm / cfg.kt * 60; t += tmin;
    out.push({ ...p, a, b, nm, tmin, acum: t, rumo: p.rumo ?? Math.round(proaMagnetica(PTS[a], PTS[b])), carta: p.rumo != null, alt: faixaAlt(p) });
  }
  // se uma altitude serve para todos os trechos dos corredores, a rota inteira usa essa (menos troca de altitude)
  const fx = out.filter((p) => p.max);
  if (fx.length) { const alto = Math.max(...fx.map((p) => p.min)), baixo = Math.min(...fx.map((p) => p.max)); if (alto <= baixo) fx.forEach((p) => { p.alt = alto; }); }
  return out;
}
const TAXI = 5;   // minutos entre calços fora e decolagem (estimativa)
const minutos = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const hhmm = (min, sep = ':') => { min = ((Math.round(min) % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, '0') + sep + String(min % 60).padStart(2, '0'); };
function coordFpl(p) {   // 2523S04912W (graus e minutos inteiros, como aceita o campo 15)
  const f = (v, g) => { let m = Math.round(Math.abs(v) * 60); return String(Math.floor(m / 60)).padStart(g, '0') + String(m % 60).padStart(2, '0'); };
  return f(p.lat, 2) + (p.lat < 0 ? 'S' : 'N') + f(p.lon, 3) + (p.lon < 0 ? 'W' : 'E');
}
function plano() {
  const ps = pernas(); if (!ps.length) return null;
  const o = PTS[rota[0]], d = PTS[rota[rota.length - 1]];
  const eobtUtc = minutos(cfg.hora) + 180;   // horário de Brasília = UTC−3
  const data = new Date((cfg.data || hojeISO()) + 'T00:00:00Z'); if (eobtUtc >= 1440) data.setUTCDate(data.getUTCDate() + 1);
  const dof = data.toISOString().slice(2, 10).replace(/-/g, '');
  const eet = Math.ceil(ps[ps.length - 1].acum);
  const meio = rota.slice(1, -1).filter((id) => PTS[id].tipo !== 'ad' || id === 'sbbi');
  const rotaTxt = meio.length ? meio.map((id) => 'DCT ' + coordFpl(PTS[id])).join(' ') : 'DCT';
  const comFaixa = ps.filter((p) => p.max);
  const alto = comFaixa.length ? Math.max(...comFaixa.map((p) => p.min)) : 0, baixo = comFaixa.length ? Math.min(...comFaixa.map((p) => p.max)) : 0;
  const nivel = comFaixa.length && alto <= baixo ? 'A' + String(Math.round(alto / 100)).padStart(3, '0') : 'VFR';
  const rehs = [...new Set(ps.filter((p) => p.reh).map((p) => p.reh))];
  const portoes = [...new Set(ps.filter((p) => p.lig && PTS[p.b].tipo === 'ad' && p.b !== 'sisy').map((p) => PTS[p.a].nome))];
  const rmk = [rehs.length ? 'REH ' + rehs.join(' ') : '', portoes.map((n) => 'PORTAO ' + n).join(' ')].filter(Boolean).join(' ');
  const mat = semAcento(cfg.mat || 'PR-HMI').replace(/[^A-Z0-9]/g, '');
  const vel = 'N' + String(Math.round(cfg.kt)).padStart(4, '0');
  const c18 = `DOF/${dof}${rmk ? ' RMK/' + semAcento(rmk) : ''}`;
  const aut = String(cfg.aut || '').replace(':', '').padStart(4, '0');
  const c19 = [`E/${aut}`, `P/${String(cfg.pob || 1).padStart(3, '0')}`, 'R/V', cfg.cor ? `A/${semAcento(cfg.cor)}` : '', cfg.piloto ? `C/${semAcento(cfg.piloto)}` : ''].filter(Boolean).join(' ');
  const msg = `(FPL-${mat}-VG\n-R22/L-${cfg.eq}\n-${o.icao}${hhmm(eobtUtc, '')}\n-${vel}${nivel} ${rotaTxt}\n-${d.icao || 'ZZZZ'}${hhmm(eet, '')}\n-${c18})`;
  return { ps, o, d, eobtUtc, dof, eet, rotaTxt, nivel, rehs, rmk, mat, vel, c18, c19, msg, aut };
}

// ---------- fonia ----------
const org = (k) => ORGAOS[k] || null;
function falaPosicao(ab, p) { return `${ab}, ${p.reh ? 'REH ' + p.reh + ', ' : ''}vertical ${PTS[p.a].nome}, ${pes(p.alt || 3600)} pés, sentido ${PTS[p.b].nome}.`; }
function fonia() {
  const pl = plano(); if (!pl) return [];
  const { ps } = pl, mat = cfg.mat || 'PR-HMI', ab = mat.replace(/[^A-Za-z0-9]/g, '').slice(-3).toUpperCase();
  const out = [], ini = minutos(cfg.hora) + TAXI, hora = (m) => hhmm(ini + m), aos = (m) => `aos ${hhmm(ini + m).slice(3)}`;
  const destino = PTS[rota[rota.length - 1]];
  // saída
  if (rota[0] === 'sisy') {
    out.push({ onde: 'No solo, em SISY', quem: ORGAOS.sisy, falas: [`Para coordenação 130,40, o ${mat} vai decolar de SISY pela cabeceira 27 (ou 09, conforme o vento), saindo para ${PTS[rota[1]].nome}.`, `${ab} decolado, segue para ${PTS[rota[1]].nome}, transfere Controle.`], nota: 'Transponder 0100 até o Controle dar um código (AIC 34/23, 6.7).' });
    const p1 = ps[0], p2 = ps[1];
    const o1 = org(p1.org) || ORGAOS.app;
    out.push({ onde: 'Logo depois de decolar', quem: o1, falas: [`${o1.chamada}, ${mat}.`, `${mat} decolado de SISY aos ${hora(0).slice(3)}, plano notificado para ${destino.curto || destino.nome}, ${p2?.reh ? `ingressando na REH ${p2.reh} pelo ${PTS[p1.b].nome}` : `proa de ${PTS[p1.b].nome}`}, ${pes(p2?.alt || 3600)} pés, estimando ${PTS[p1.b].nome} ${aos(p1.acum)}.`],
      nota: 'Saindo de local sem órgão ATS, informe a hora real da decolagem no primeiro contato: o serviço de alerta só começa com ela (ICA 100-11, 2.2.6). Cote o código que o Controle der.' });
  } else {
    const o1 = org(ps[0].org) || ORGAOS.twrct;
    out.push({ onde: `No solo, em ${PTS[rota[0]].curto}`, quem: o1, falas: [`${o1.chamada}, ${mat}, no pátio, com plano para ${destino.curto || destino.nome}, pronto para decolar.`], nota: 'Com órgão ATS no aeródromo, siga a autorização recebida (Solo, Torre).' });
  }
  // pontos do meio
  for (let i = 1; i < ps.length; i++) {
    const ant = ps[i - 1], p = ps[i], P = PTS[p.a], o = org(p.org), oAnt = org(ant.org);
    const falas = [];
    if (p.lig && PTS[p.b].tipo === 'ad' && p.b !== 'sisy') {
      const cruza = i < ps.length - 1, depois = cruza ? PTS[ps[i + 1].b].nome : '';
      falas.push(`${o.chamada}, ${mat}, vertical ${P.tipo === 'vac' ? 'da posição' : 'do portão'} ${P.nome}, ${pes(ant.alt || 3600)} pés, ${cruza ? `solicita cruzar o ${PTS[p.b].curto} para ${depois}` : `solicita ingresso no circuito para pouso no ${PTS[p.b].curto}`}.`);
      out.push({ onde: `${P.tipo === 'vac' ? 'Posição' : 'Portão'} ${P.nome}`, quem: o, falas, nota: cruza ? 'Cruzar o aeródromo só com autorização da Torre; nunca cruzar o eixo da pista sem ela (AIC 34/23, 6.2).' : P.dica });
      continue;
    }
    if (P.tipo === 'ad') { out.push({ onde: `Cruzando o ${P.curto}`, quem: o, falas: [`${ab} cruzando o ${P.curto}, sentido ${PTS[p.b].nome}.`], nota: 'Siga exatamente o que a Torre autorizou.' }); continue; }
    if (p.b === 'sisy') {
      falas.push(`${oAnt?.chamada || 'Controle Curitiba'}, ${ab} na vertical de ${P.nome}, visual com SISY, solicita deixar a frequência.`, `Para coordenação 130,40, ${ab} se aproximando de SISY pelo ${P.nome}, vai ingressar na perna do vento da pista em uso.`);
      out.push({ onde: P.nome, quem: ORGAOS.sisy, falas, nota: 'Livrando a pista: avise na coordenação.' });
      continue;
    }
    if (o && oAnt && o !== oAnt && oAnt.classe === 'D') falas.push(o.classe === 'G' ? `${oAnt.chamada}, ${ab} chegando a ${P.nome}, deixando o espaço controlado, solicita deixar a frequência.` : `${oAnt.chamada}, ${ab} chegando a ${P.nome}, solicita chamar ${o.chamada}${o.freq ? ' ' + o.freq : ''}.`);
    if (o && o !== oAnt) falas.push(o.chamada === 'Tráfego' ? `Na ${o.freq}: ${falaPosicao(mat, p)}` : `${o.chamada}, ${mat}, ${p.reh ? 'REH ' + p.reh + ', ' : ''}vertical ${P.nome}, ${pes(p.alt || ant.alt || 3600)} pés, sentido ${PTS[p.b].nome}.`);
    else falas.push(o?.chamada === 'Tráfego' ? `Na ${o.freq}: ${falaPosicao(ab, p)}` : falaPosicao(ab, p));
    const notas = [];
    if (p.alt && ant.alt && p.alt !== ant.alt) notas.push(`Muda a altitude aqui, no fixo: de ${pes(ant.alt)} para ${pes(p.alt)} pés (faixa ${pes(p.min)} a ${pes(p.max)}).`);
    if (p.est && o !== oAnt) notas.push('Ponto da troca de órgão estimado pelo desenho da carta: confirme com o instrutor.');
    out.push({ onde: P.nome, quem: o, falas, nota: notas.join(' ') });
  }
  const fim = PTS[rota[rota.length - 1]];
  if (fim.tipo === 'ad' && fim !== PTS.sisy) out.push({ onde: `Pouso em ${fim.curto}`, quem: org(ps[ps.length - 1].org), falas: [`${ab} pousado, livrando a pista.`], nota: 'Transponder em STANDBY depois do pouso.' });
  return out;
}

// ---------- tela ----------
function cartaoConfig() {
  const kts = [70, 80, 90];
  return `<div class="pv2-cfg">
    <div class="rotulo">Rota</div>
    <div class="pv2-rota">${rota.map((id, i) => `<span class="pv2-pt${PTS[id].tipo === 'ad' ? ' ad' : ''}">${i ? '<i>›</i>' : ''}${esc(nomeDe(id))}</span>`).join('')}</div>
    <p class="sub">Toque nos pontos do mapa: o caminho segue sozinho pelos corredores. Para outro começo, escolha a saída.</p>
    <div class="linha-acao"><button class="mini" data-pv-volta>↶ Tirar o último</button><button class="mini fantasma" data-pv-limpar>Recomeçar</button></div>
    <div class="chips" role="group" aria-label="Saída">${['sisy', 'sbbi', 'sbct'].map((k) => `<button type="button" class="chip" data-pv-saida="${k}" aria-pressed="${rota[0] === k}">Sair de ${PTS[k].curto}</button>`).join('')}</div>
    <div class="rotulo" style="margin-top:6px">Modelos para treinar</div>
    <div class="pv2-modelos">${MODELOS.map((m) => `<button type="button" class="mini" data-pv-modelo="${m.id}">${esc(m.nome)}</button>`).join('')}</div>
    <div class="rotulo" style="margin-top:6px">Dados do voo</div>
    <div class="pv2-campos">
      <label>Matrícula<input data-pv-cfg="mat" value="${esc(cfg.mat)}" maxlength="7" autocomplete="off"></label>
      <label>Calços fora (hora local)<input type="time" data-pv-cfg="hora" value="${esc(cfg.hora)}"></label>
      <label>Data<input type="date" data-pv-cfg="data" value="${esc(cfg.data || hojeISO())}"></label>
      <label>Autonomia (h:min)<input data-pv-cfg="aut" value="${esc(cfg.aut)}" maxlength="5" inputmode="numeric"></label>
      <label>Pessoas a bordo<input type="number" min="1" max="2" data-pv-cfg="pob" value="${esc(cfg.pob)}"></label>
      <label>Equipamento<select data-pv-cfg="eq">${[['V/C', 'V/C: rádio VHF e transponder modo C'], ['V/S', 'V/S: rádio VHF e transponder modo S'], ['VG/C', 'VG/C: VHF, GPS e modo C'], ['VG/S', 'VG/S: VHF, GPS e modo S']].map(([v, t]) => `<option value="${v}"${cfg.eq === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Piloto em comando<input data-pv-cfg="piloto" value="${esc(cfg.piloto)}" placeholder="nome no plano" autocomplete="off"></label>
      <label>Cor da aeronave<input data-pv-cfg="cor" value="${esc(cfg.cor)}" placeholder="ex.: branco e vermelho" autocomplete="off"></label>
    </div>
    <div class="chips" role="group" aria-label="Velocidade">${kts.map((v) => `<button type="button" class="chip" data-pv-kt="${v}" aria-pressed="${+cfg.kt === v}">${v} kt</button>`).join('')}<span class="sub">Nas REH, de 70 a 90 kt.</span></div>
  </div>`;
}
function cartaoNavlog() {
  const ps = pernas();
  if (!ps.length) return `<div class="caixa"><h3>Navlog</h3><p class="sub">Escolha um modelo ou toque num ponto do mapa para começar.</p></div>`;
  const ini = minutos(cfg.hora) + TAXI, tot = ps.reduce((t, p) => t + p.nm, 0);
  return `<div class="caixa pv2-navlog"><div class="cab"><h3>Navlog</h3><div class="linha-acao"><button class="mini" data-pv-print>Imprimir</button><button class="mini fantasma" data-pv-gpx>⬇ GPX da rota</button></div></div>
  <div class="nv-rolar"><table class="nv-tab"><thead><tr><th>#</th><th>De → Para</th><th>Via</th><th class="n">Rumo M</th><th class="n">Dist.</th><th class="n">Tempo</th><th class="n">Chega</th><th>Altitude</th><th>Fala com</th></tr></thead><tbody>
  ${ps.map((p, i) => { const o = org(p.org); return `<tr><td>${i + 1}</td><td><b>${esc(nomeDe(p.a))}</b> → <b>${esc(nomeDe(p.b))}</b></td>
    <td>${p.reh ? `<span class="pv2-tag" style="--c:${REH[p.reh].cor}">${p.reh}</span>` : p.lig ? '<span class="sub">ligação</span>' : '<span class="sub">direto</span>'}</td>
    <td class="n"><b>${r3(p.rumo)}</b>${p.carta ? '' : '<sup title="calculado (fora da carta)">*</sup>'}</td><td class="n">${fmtNM(p.nm)}</td><td class="n">${fmtTempo(p.nm, cfg.kt)}</td><td class="n">${hhmm(ini + p.acum)}</td>
    <td>${p.max ? `${pes(p.min)} a ${pes(p.max)} ft` : '<span class="sub">conforme instrução</span>'}</td>
    <td>${o ? `${esc(o.chamada === 'Tráfego' ? 'Coordenação' : o.chamada)} <span class="mono">${esc(o.freq)}</span> <span class="sub">classe ${o.classe}</span>${p.est ? ' <span class="pv2-conf" title="Troca estimada pela carta">confirmar</span>' : ''}` : '<span class="sub">—</span>'}</td></tr>`; }).join('')}
  </tbody><tfoot><tr><td colspan="4">Total · calços ${esc(cfg.hora)} local (${hhmm(minutos(cfg.hora) + 180)} Z), decolagem ${hhmm(ini)}</td><td class="n"><b>${fmtNM(tot)}</b></td><td class="n"><b>${fmtTempo(tot, cfg.kt)}</b></td><td class="n"><b>${hhmm(ini + ps[ps.length - 1].acum)}</b></td><td colspan="2"></td></tr></tfoot></table></div>
  <p class="sub">Rumo e altitudes da carta oficial (rumo magnético de 2023; a variação é de 7′ por ano para oeste). * Rumo calculado com declinação de 20° W, fora da carta. Vento não considerado. Mantenha-se à direita do eixo, com a referência à esquerda (AIC 34/23, 3.4).</p></div>`;
}
function cartaoPlano() {
  const pl = plano(); if (!pl) return '';
  const linhas = [
    ['7', 'Identificação', pl.mat, 'Matrícula sem hífen.'],
    ['8', 'Regras e tipo de voo', 'V · G', 'V = visual. G = aviação geral (instrução entra aqui).'],
    ['9', 'Aeronave e esteira', 'R22 / L', 'Designativo ICAO do Robinson R22; esteira leve.'],
    ['10', 'Equipamento', cfg.eq, 'Antes da barra: comunicação e navegação (V = VHF, G = GPS). Depois: transponder (C = modo C, S = modo S). Confira o da aeronave.'],
    ['13', 'Saída e hora (UTC)', `${pl.o.icao} ${hhmm(pl.eobtUtc, '')}`, `Calços fora em UTC: ${cfg.hora} local + 3 h.`],
    ['15', 'Velocidade, altitude e rota', `${pl.vel} ${pl.nivel} ${pl.rotaTxt}`, `Rota com as COORDENADAS das posições, porque o sistema não aceita os nomes (AIC 34/23, 3.7). ${pl.nivel === 'VFR' ? 'Altitude VFR: muda de trecho a trecho, conforme a carta.' : 'Uma altitude que serve para todos os trechos.'}`],
    ['16', 'Destino e duração (EET)', `${pl.d.icao || 'ZZZZ'} ${hhmm(pl.eet, '')}`, 'Tempo total previsto, sem vento.'],
    ['18', 'Outras informações', pl.c18, 'DOF = data do voo (AAMMDD, em UTC). Em RMK, os NOMES dos corredores (AIC 34/23, 3.7).'],
    ['19', 'Suplementares', pl.c19, 'E/ autonomia · P/ pessoas a bordo · R/V rádio VHF · A/ cor · C/ piloto em comando.'],
  ];
  return `<div class="caixa pv2-plano"><div class="cab"><h3>Plano de voo desta rota</h3><button class="mini" data-pv-copiar>Copiar mensagem</button></div>
    <p class="pv2-tipo"><b>Simplificado (PVS) ou completo (PVC)?</b> Toda rota montada aqui fica dentro da TMA Curitiba, então cabe o <b>PVS</b> (ICA 100-11, 5.1), apresentado com pelo menos <b>10 min</b> de antecedência. Se pedirem o completo, ele vai com <b>45 min</b> (ou <b>30 min</b> pela internet e pelo app). As regras são da ICA 100-11/2017; a nova edição vale a partir de 26/11/2026: confira se algo mudou.</p>
    <div class="nv-rolar"><table class="nv-tab pv2-campos-fpl"><thead><tr><th>Campo</th><th>O que é</th><th>Nesta rota</th><th>Por quê</th></tr></thead><tbody>
    ${linhas.map(([n, q, v, d]) => `<tr><td class="n"><b>${n}</b></td><td>${esc(q)}</td><td class="mono"><b>${esc(v)}</b></td><td class="sub">${esc(d)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="rotulo" style="margin-top:8px">Mensagem no formato ICAO (para conferir)</div><pre class="pv2-msg">${esc(pl.msg)}</pre>
    <p class="sub">No FPL BR os campos aparecem um a um, com estes mesmos dados. O código ANAC do piloto vem do cadastro. O plano vale até 45 min depois da hora de calços; atraso ou mudança, até 35 min depois (ICA 100-11, 2.4 e 3.2.3).</p></div>`;
}
function cartaoFonia() {
  const f = fonia(); if (!f.length) return '';
  return `<div class="caixa pv2-fonia"><div class="cab"><h3>Fonia desta rota</h3><span class="sub">matrícula, corredor, posição, altitude e sentido (AIC 34/23, 6.9)</span></div>
  <ol class="pv2-falas">${f.map((x) => `<li><div class="pv2-onde"><b>${esc(x.onde)}</b>${x.quem ? `<span class="pv2-org">${esc(x.quem.nome)} · <span class="mono">${esc(x.quem.freq)}</span></span>` : ''}</div>${x.falas.map((t) => `<p class="pv2-fala">“${esc(t)}”</p>`).join('')}${x.nota ? `<p class="sub">${esc(x.nota)}</p>` : ''}</li>`).join('')}</ol>
  <p class="sub">Modelo para estudo, no padrão do roteiro de fonia da EACAR. No ar, responda ao que o órgão disser: ele pode mandar esperar, mudar a altitude ou sair do corredor.</p></div>`;
}
function cartaoTreino() {
  const s = sorteio;
  return `<div class="caixa pv2-treino"><div class="cab"><h3>Treino rápido de fonia</h3><button class="mini pri" data-pv-sortear>${s ? 'Outra situação' : 'Sortear situação'}</button></div>
  ${s ? `<p class="pv2-sit">Você está na <b>vertical de ${esc(PTS[s.a].nome)}</b>, voando a <b>REH ${s.reh}</b> sentido <b>${esc(PTS[s.b].nome)}</b>. Qual o rumo, a altitude e com quem você fala? Diga a chamada em voz alta.</p>
    ${mostrar ? `<div class="pv2-resp"><p><b>Rumo ${r3(s.rumo)}</b> · altitude entre ${pes(s.min)} e ${pes(s.max)} ft (diga ${pes(faixaAlt(s))}) · ${esc(org(s.org).nome)} <span class="mono">${esc(org(s.org).freq)}</span>${s.est ? ' <span class="pv2-conf">confirmar</span>' : ''}</p>
      <p class="pv2-fala">“${esc(org(s.org).chamada === 'Tráfego' ? `Na ${org(s.org).freq}: ` : org(s.org).chamada + ', ')}${esc(cfg.mat || 'PR-HMI')}, REH ${s.reh}, vertical ${esc(PTS[s.a].nome)}, ${pes(faixaAlt(s))} pés, sentido ${esc(PTS[s.b].nome)}.”</p>
      <p class="sub">O que procurar: ${esc(PTS[s.a].dica)} Mantenha a referência à sua esquerda.</p></div>` : `<button class="mini" data-pv-mostrar>Ver resposta</button>`}`
  : '<p class="sub">Sorteia um ponto e um sentido em qualquer corredor de helicóptero de Curitiba. Bom para decorar as referências e as frequências.</p>'}</div>`;
}
function cartaoRegras() {
  const freq = [['Torre Curitiba (SBCT)', '118,15'], ['Solo Curitiba', '121,9'], ['ATIS Curitiba', '127,8'], ['Controle Curitiba nas REH', '129,55 · 120,65'], ['Controle Curitiba (saída de SISY, pela escola)', '119,95'], ['Torre Bacacheri (SBBI)', '118,90'], ['Coordenação entre aeronaves (classe G)', '123,45'], ['Coordenação SISY (EACAR)', '130,40'], ['Emergência', '121,5']];
  return `<details class="caixa pv2-det" open><summary><h3>Quando o plano de voo é obrigatório</h3></summary>
    <p>É obrigatório apresentar plano quando o voo, ou parte dele, for <b>por instrumentos</b>; <b>visual sujeito a controle</b> de tráfego; em <b>aeródromo com órgão ATS</b>; onde a publicação exigir; ou em ZIDA (ICA 100-11, 2.3.1).</p>
    <p>O voo visual só fica dispensado se cumprir <b>as três</b> condições: fora de ZIDA, <b>só em espaço não controlado</b> e <b>sem órgão ATS na origem e no destino</b> (AIC N 16/17, 2.3).</p>
    <p class="pv2-dest"><b>Na nossa navegação:</b> SISY fica dentro da CTR Curitiba (classe D) e os corredores passam pela CTR e pelos portões do Bacacheri e do Afonso Pena. Então a navegação pede plano. Como tudo fica dentro da TMA Curitiba, serve o <b>simplificado (PVS)</b>: é o "notificado" da fonia da escola.</p></details>
  <details class="caixa pv2-det"><summary><h3>Como apresentar e prazos</h3></summary>
    <ul><li><b>Onde:</b> pelo app <b>FPL BR</b>, pela internet ou por telefone ao C-AIS (21) 2174-7510. O cadastro no SIGMA é feito pelo (21) 2101-6680 (dados do ROTAER do SBCT e do SBBI).</li>
    <li><b>PVS:</b> pelo menos 10 min antes da hora de calços. <b>PVC:</b> 45 min antes, ou 30 min pela internet e pelo app; no máximo 120 h antes.</li>
    <li><b>Validade:</b> até 45 min depois da hora de calços. Atraso (DLA) ou mudança (CHG): até 35 min depois.</li>
    <li><b>Depois de enviar:</b> confira se foi aceito (status no app ou e-mail). Enviar não é o mesmo que ser aceito.</li>
    <li><b>Saindo de SISY</b> (sem órgão ATS): no primeiro contato, informe a <b>hora real da decolagem</b>. O serviço de alerta começa com ela.</li>
    <li><b>Antes:</b> o piloto em comando confere tempo (METAR, TAF), combustível, altitude certa para a rota, plano alternativo, NOTAM e ROTAER (ICA 100-11, 2.2.4).</li></ul>
    <p class="sub">Prazos da ICA 100-11/2017. A AIC N 31/26 avisa que a nova ICA 100-11 (a partir de 26/11/2026) junta num só lugar o manual de preenchimento e as regras de quando apresentar.</p></details>
  <details class="caixa pv2-det"><summary><h3>Regras das REH de Curitiba</h3></summary>
    <ul><li>Corredor de <b>1 NM</b> de largura (0,5 NM para cada lado do eixo). Margem de obstáculos de 300 ft.</li>
    <li><b>Direita do eixo</b>, com a rodovia, a avenida ou a referência <b>à esquerda</b> do piloto.</li>
    <li>Velocidade entre <b>70 e 90 kt</b>. Faróis acesos recomendados. Transponder sempre ligado.</li>
    <li>Mudança de altitude <b>nos fixos</b>, só em condições visuais.</li>
    <li>Para entrar na CTR, chamar <b>antes</b>. Saindo de helipontos da CTR, contato ainda no solo ou até 50 ft no pairado.</li>
    <li>Do heliponto à REH mais próxima pelo caminho mais curto. <b>Nunca cruzar o eixo das pistas</b> do Afonso Pena e do Bacacheri nem as trajetórias IFR sem autorização.</li>
    <li>Fonia breve: <b>matrícula, corredor, posição, altitude e sentido</b>.</li>
    <li>Plano: no <b>campo 15</b>, as coordenadas das posições; no <b>campo 18 (RMK)</b>, os nomes dos corredores.</li>
    <li>DELTA: só voo panorâmico autorizado. Portão Guatupê: posição da VAC do SBCT, fora das REH, só com autorização da Torre.</li>
    <li>Se não der para seguir visual: voltar e pousar, pedir VFR especial, mudar para IFR (se habilitado) ou pedir para sair do corredor.</li></ul></details>
  <details class="caixa pv2-det"><summary><h3>Frequências e transponder</h3></summary>
    <table class="nv-tab"><tbody>${freq.map(([a, b]) => `<tr><td>${esc(a)}</td><td class="n mono"><b>${esc(b)}</b></td></tr>`).join('')}</tbody></table>
    <table class="nv-tab" style="margin-top:10px"><tbody>${TRANSPONDER.map(([c, t]) => `<tr><td class="mono"><b>${esc(c)}</b></td><td>${esc(t)}</td></tr>`).join('')}</tbody></table>
    <p class="sub">AIC N 34/23 e ROTAER (AISWEB, 25/11/2026). Confira no AISWEB e nos NOTAM antes do voo.</p></details>
  <details class="caixa pv2-det"><summary><h3>Aplicativos e cartas oficiais</h3></summary>
    <ul>${APPS.map(([n, t, u]) => `<li><b>${u ? `<a href="${u}" target="_blank" rel="noopener">${esc(n)} ↗</a>` : esc(n)}</b>: ${esc(t)}</li>`).join('')}</ul>
    <div class="rotulo" style="margin-top:8px">Cartas e normas (DECEA)</div>
    <ul>${FONTES.map(([n, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(n)} ↗</a></li>`).join('')}</ul></details>`;
}
export function telaPlanoVoo() {
  return `<div class="cab"><h2>Plano de voo</h2><span class="sub">Corredores de helicóptero de Curitiba · AIC N 34/23</span></div>
  <p class="intro">Monte uma navegação pelos corredores de helicóptero (REH) de Curitiba e veja o navlog, os campos do plano de voo como no <b>FPL BR</b> e a fonia de cada trecho. Rumos, altitudes e frequências vêm da carta e da AIC oficiais do DECEA. É para estudar em solo; quem decide a rota é o instrutor.</p>
  <div class="pv2-grade"><div class="caixa nv-mapa-caixa"><div id="pvMapa" class="nv-mapa" role="application" aria-label="Mapa dos corredores de helicóptero"></div>
    <p class="sub nv-legenda">${Object.entries(REH).map(([k, r]) => `<span class="pv2-tag" style="--c:${r.cor}">${k}</span>`).join(' ')} · <span class="pv2-tri"></span> posição · <span class="nv-pt t-aerodromo"></span> aeródromo · tracejado: ligação fora da REH</p></div>
    <div class="caixa" id="pvCfg">${cartaoConfig()}</div></div>
  <div id="pvNavlog">${cartaoNavlog()}</div>
  <div class="pv2-duas"><div id="pvPlano">${cartaoPlano()}</div><div id="pvFonia">${cartaoFonia()}</div></div>
  <div id="pvTreino">${cartaoTreino()}</div>
  ${cartaoRegras()}
  <p class="sub">Fontes: AIC N 34/23 (Circulação visual na Terminal Curitiba) e carta CCV REH WT-Curitiba, efetivas desde 28/12/2023; ICA 100-11/2017 e AIC N 16/17 e N 31/26; ROTAER do AISWEB (25/11/2026). Fonia de SISY: roteiro da EACAR. Onde a AIC dá dois órgãos no mesmo trecho, o ponto da troca foi estimado pela carta e aparece como "confirmar".</p>`;
}

// ---------- mapa ----------
let leafletPronto = null;
function carregarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPronto) return leafletPronto;
  leafletPronto = new Promise((ok, erro) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = () => ok(window.L); s.onerror = () => { leafletPronto = null; erro(new Error('mapa')); }; document.head.appendChild(s);
  });
  return leafletPronto;
}
function desenharBase(L) {
  const g = L.layerGroup().addTo(mapa);
  for (const [a, b] of LIGACOES) L.polyline([[PTS[a].lat, PTS[a].lon], [PTS[b].lat, PTS[b].lon]], { color: '#fff', weight: 2, opacity: .8, dashArray: '4 6' }).addTo(g);
  for (const [k, r] of Object.entries(REH)) {
    for (const [a, b] of r.pernas) L.polyline([[PTS[a].lat, PTS[a].lon], [PTS[b].lat, PTS[b].lon]], { color: r.cor, weight: 9, opacity: .55, lineCap: 'round' }).addTo(g);
    const [a, b] = r.pernas[Math.floor(r.pernas.length / 2)];
    L.marker([(PTS[a].lat + PTS[b].lat) / 2, (PTS[a].lon + PTS[b].lon) / 2], { icon: L.divIcon({ className: 'nv-ico', iconSize: [1, 1], html: `<span class="pv2-rotreh" style="--c:${r.cor}">${k}</span>` }), interactive: false }).addTo(g);
  }
  for (const [id, p] of Object.entries(PTS)) {
    const m = L.marker([p.lat, p.lon], { icon: L.divIcon({ className: 'nv-ico', iconSize: [1, 1], html: `<span class="pv2-pino t-${p.tipo}${p.portao ? ' portao' : ''}"></span><span class="nv-rot pv2-rot t-${p.tipo}">${esc(nomeDe(id))}</span>` }), keyboard: false }).addTo(g);
    m.bindTooltip(`<div class="nv-tip"><b>${esc(p.nome)}</b><span>${p.tipo === 'ad' ? 'Aeródromo' : p.tipo === 'vac' ? 'Posição da carta VAC' : p.portao ? 'Portão / posição da REH' : 'Posição da REH'}</span><small>${esc(p.dica)}</small><small><i>Toque para pôr na rota.</i></small></div>`, { direction: 'top', offset: [0, -10], opacity: 1, className: 'nv-tip-caixa' });
    m.on('click', () => adicionar(id));
  }
}
function desenharRota(L) {
  if (grupoRota) grupoRota.clearLayers(); else grupoRota = L.layerGroup().addTo(mapa);
  if (rota.length > 1) L.polyline(rota.map((id) => [PTS[id].lat, PTS[id].lon]), { color: '#E8600A', weight: 4, dashArray: '10 6' }).addTo(grupoRota);
  rota.forEach((id, i) => L.marker([PTS[id].lat, PTS[id].lon], { icon: L.divIcon({ className: 'nv-ico', iconSize: [1, 1], html: `<span class="pv2-num">${i || '▶'}</span>` }), interactive: false, zIndexOffset: 800 }).addTo(grupoRota));
}
async function montarMapa(c) {
  const el = c.querySelector('#pvMapa'); if (!el) return;
  try {
    const L = await carregarLeaflet(); if (!c.isConnected) return;
    mapa = L.map(el, { scrollWheelZoom: false });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, attribution: 'Imagens: Esri, Maxar, Earthstar Geographics' }).addTo(mapa);
    desenharBase(L); desenharRota(L);
    mapa.fitBounds(L.latLngBounds(Object.values(PTS).map((p) => [p.lat, p.lon])), { padding: [16, 16] });
    const rot = () => el.classList.toggle('pv2-longe', mapa.getZoom() < 12); mapa.on('zoomend', rot); rot();
  } catch { el.innerHTML = '<p class="sub" style="padding:16px">O mapa não carregou (sem internet ou bloqueado). Os modelos e as tabelas continuam funcionando.</p>'; }
}

// ---------- ações ----------
function atualizar(soTabelas) {
  const c = ctxEl; if (!c) return; guardar();
  if (!soTabelas) c.querySelector('#pvCfg').innerHTML = cartaoConfig();
  c.querySelector('#pvNavlog').innerHTML = cartaoNavlog();
  c.querySelector('#pvPlano').innerHTML = cartaoPlano();
  c.querySelector('#pvFonia').innerHTML = cartaoFonia();
  c.querySelector('#pvTreino').innerHTML = cartaoTreino();
  if (mapa && window.L) desenharRota(window.L);
}
function adicionar(id) {
  const ult = rota[rota.length - 1]; if (id === ult) return;
  const c = caminho(ult, id);
  if (!c) return ctxEl && window.__pvToast?.('Não há caminho pelos corredores até esse ponto.');
  if (rota.length + c.length > 30) return window.__pvToast?.('A rota já está longa demais.');
  rota.push(...c.slice(1)); atualizar();
}
const xml = (t) => String(t).replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]));
function gpxRota() {
  const pts = rota.map((id) => PTS[id]);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Hangar da Turma" xmlns="http://www.topografix.com/GPX/1/1">\n${pts.map((p) => `<wpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><name>${xml(p.curto || p.nome)}</name><desc>${xml(p.dica)}</desc></wpt>`).join('\n')}\n<rte><name>Plano de voo ${xml(rota.map(nomeDe).join(' - '))}</name>\n${pts.map((p) => `<rtept lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><name>${xml(p.curto || p.nome)}</name></rtept>`).join('\n')}\n</rte>\n</gpx>\n`;
}
function baixar(nome, texto, mime) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: mime })); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
export const digitandoPlanoVoo = () => !!document.activeElement?.closest?.('[data-pv-cfg]');
export function ligarPlanoVoo(c, { toast } = {}) {
  ctxEl = c; mapa = null; grupoRota = null; window.__pvToast = toast;
  montarMapa(c);
  c.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pv-saida],[data-pv-modelo],[data-pv-volta],[data-pv-limpar],[data-pv-kt],[data-pv-print],[data-pv-gpx],[data-pv-copiar],[data-pv-sortear],[data-pv-mostrar]');
    if (!b) return;
    if (b.dataset.pvSaida) { rota = [b.dataset.pvSaida]; atualizar(); }
    else if (b.dataset.pvModelo) { const m = MODELOS.find((x) => x.id === b.dataset.pvModelo); const r = m && expandir(m.rota); if (r) { rota = r; atualizar(); toast?.('Rota do modelo montada.'); } }
    else if (b.hasAttribute('data-pv-volta')) { if (rota.length > 1) { rota.pop(); atualizar(); } }
    else if (b.hasAttribute('data-pv-limpar')) { rota = [rota[0]]; atualizar(); }
    else if (b.dataset.pvKt) { cfg.kt = +b.dataset.pvKt; atualizar(); }
    else if (b.hasAttribute('data-pv-print')) { document.body.classList.add('pv2-imprimindo'); window.print(); setTimeout(() => document.body.classList.remove('pv2-imprimindo'), 1000); }
    else if (b.hasAttribute('data-pv-gpx')) baixar('plano-de-voo-rota.gpx', gpxRota(), 'application/gpx+xml');
    else if (b.hasAttribute('data-pv-copiar')) { const pl = plano(); if (!pl) return; try { await navigator.clipboard.writeText(pl.msg); toast?.('Mensagem copiada.'); } catch { toast?.('Não deu para copiar: selecione o texto.'); } }
    else if (b.hasAttribute('data-pv-sortear')) { const reh = PERNAS.filter((p) => p.reh); sorteio = reh[Math.floor(Math.random() * reh.length)]; mostrar = false; c.querySelector('#pvTreino').innerHTML = cartaoTreino(); }
    else if (b.hasAttribute('data-pv-mostrar')) { mostrar = true; c.querySelector('#pvTreino').innerHTML = cartaoTreino(); }
  });
  c.addEventListener('change', (e) => {
    const i = e.target.closest('[data-pv-cfg]'); if (!i) return;
    const k = i.dataset.pvCfg; cfg[k] = k === 'pob' ? Math.max(1, Math.min(9, +i.value || 1)) : k === 'mat' ? i.value.toUpperCase().trim() : i.value;
    atualizar(true);
  });
}
// para o atendente de dúvidas e para testes
export const _teste = { caminho, expandir, plano: () => plano(), fonia: () => fonia(), set: (r, c) => { rota = r; if (c) cfg = { ...cfg, ...c }; }, PERNAS };
