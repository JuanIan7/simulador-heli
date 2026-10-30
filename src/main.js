// Simulador de Helicóptero para Estudo (PPH/IFR). App shell: telas, loop do jogo, integração das fases.
import { AERONAVES, ORDEM_AERONAVES } from './data/aeronaves.js';
import { FASES, TRILHA_IFR } from './data/fases.js';
import { QUIZ_VOO } from './data/quiz-voo.js';
import { QUIZ_TEORIA, METAR, ALTIMETRO, NAVEGACAO, SIPAER_ORDEM } from './data/quiz-teoria.js';
import { FONIA, TRANSPONDER } from './data/fonia.js';
import { Helicoptero } from './sim/fisica.js';
import { Cena } from './sim/cena.js';
import { Controles, vibrar } from './sim/controles.js';
import { Hud } from './ui/hud.js';
import { MISSOES } from './sim/missoes.js';
import { ROTAS, ROTAS_ORDEM, MissaoRota, prepararRota } from './sim/rotas.js';
import { chao, naAgua } from './sim/terreno.js';
import { PilotoAutomatico, dicaDeAjuda } from './sim/piloto.js';
import { montarQuiz, embaralhar } from './ui/quiz.js';
import { montarIdentificar } from './ui/identificar.js';
import { montarFonia, montarMetar, montarSipaer, exParaQuiz } from './ui/teoria.js';
import { estado } from './estado.js';
import * as nuvem from './nuvem.js';

const $ = (s) => document.querySelector(s);
const telas = $('#telas'), jogo = $('#jogo');
const BANCO = { ...QUIZ_VOO, ...QUIZ_TEORIA };
const estrelasTxt = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

function mostrarTela(html, vitrine = false) { telas.hidden = false; telas.innerHTML = html; telas.scrollTop = 0; jogo.hidden = !vitrine; jogo.classList.toggle('vitrine', vitrine); telas.classList.toggle('sobre-3d', vitrine); if (vitrine) ligarVitrine(); else modoVitrine = false; }
let modoVitrine = false, vitrineT = 0;
function garantirCena() { if (!cena) { cena = new Cena($('#canvas3d')); window.__cena = cena; hud = new Hud($('#hud')); ctl = new Controles($('#controles')); window.addEventListener('resize', () => cena.redimensionar()); } }
function ligarVitrine() {
  garantirCena(); const ac = AERONAVES[estado.aeronave];
  if (!cena.ac || cena.ac.id !== ac.id) { cena.criarHeli(ac); cena.limparMarcadores(); }
  cena.redimensionar();
  if (modoVitrine) return; modoVitrine = true; vitrineT = performance.now();
  const passo = (t) => { if (!modoVitrine) return; const dt = Math.min(0.05, (t - vitrineT) / 1000); vitrineT = t; cena.vitrine(dt); cena.render(); requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
}

// ---------- Menu ----------
function menu() {
  const ac = AERONAVES[estado.aeronave];
  mostrarTela(`
    <div class="tela menu">
      <header class="cabecalho"><img src="icons/icon-192.png" alt="" class="logo"><div><h1>Simulador de Helicóptero</h1><div class="sub">Estudo para PPH e IFR · jogo de estudo, não é simulador certificado</div></div></header>
      <section class="cartao">
        <div class="linha"><b>Aeronave:</b> ${ac.nome} <button class="btn btn-cinza" id="btnAeronave">Trocar</button></div>
        <div class="linha"><b>Estrelas:</b> ${estado.totalEstrelas()} de ${FASES.length * 3}</div>
      </section>
      ${cartaoConta()}
      <div class="grade-botoes">
        <button class="btn btn-laranja grande" id="btnFases">🎮 Fases (trilha PPH)</button>
        <button class="btn btn-laranja grande" id="btnSim">🚁 Simulador de voo <span class="sub-btn">voo livre · voo guiado · missões com objetivos</span></button>
        ${nuvem.disponivel() ? '<button class="btn btn-cinza grande" id="btnRank">🏆 Ranking dos pilotos</button>' : ''}
        <button class="btn btn-cinza grande" id="btnAjustes">⚙️ Ajustes e controles</button>
        <button class="btn btn-cinza grande" id="btnCreditos">ℹ️ Sobre e créditos</button>
      </div>
      <footer class="rodape">Desenvolvido por Juan Araujo &amp; Filho · CBMERJ 1856</footer>
    </div>`, true);
  $('#btnAeronave').onclick = telaAeronaves; $('#btnFases').onclick = telaFases; $('#btnSim').onclick = telaSimulador;
  $('#btnAjustes').onclick = telaAjustes; $('#btnCreditos').onclick = telaCreditos;
  ligarCartaoConta(); $('#btnRank')?.addEventListener('click', () => telaRanking('geral'));
}

// ---------- Conta (login Google, apelido, ranking e área do desenvolvedor) ----------
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function cartaoConta() {
  if (!nuvem.disponivel()) return '';
  const c = nuvem.conta;
  if (!c.pronto) return '<section class="cartao conta"><div class="sub">Verificando a sua conta…</div></section>';
  if (!c.user) return `<section class="cartao conta"><div><b>Jogue com a sua conta</b><div class="sub">Entre com o Google para salvar o progresso e aparecer no ranking. Sem entrar, o progresso fica só neste aparelho.</div></div><button class="btn btn-laranja" id="btnEntrar">Entrar com Google</button>${c.erro ? `<div class="sub erro">${esc(c.erro)}</div>` : ''}</section>`;
  return `<section class="cartao conta"><div><b>👤 ${esc(c.perfil?.apelido || c.user.displayName || 'Piloto')}</b><div class="sub">${esc(c.user.email)} · progresso salvo na conta${nuvem.ehAdmin() ? ' · desenvolvedor' : ''}</div></div>
    <div class="linha-botoes"><button class="btn btn-cinza" id="btnApelido">Apelido</button>${nuvem.ehAdmin() ? '<button class="btn btn-cinza" id="btnAdmin">🛠 Jogadores</button>' : ''}<button class="btn btn-cinza" id="btnSair">Sair</button></div>${c.erro ? `<div class="sub erro">${esc(c.erro)}</div>` : ''}</section>`;
}
function ligarCartaoConta() {
  $('#btnEntrar')?.addEventListener('click', async () => { try { await nuvem.entrar(); } catch (e) { alert('Não deu para entrar: ' + (e.code || e.message)); } });
  $('#btnSair')?.addEventListener('click', async () => { if (confirm('Sair da conta? O progresso fica salvo nela e volta quando você entrar de novo.')) { await nuvem.sair(); menu(); } });
  $('#btnApelido')?.addEventListener('click', telaApelido); $('#btnAdmin')?.addEventListener('click', telaAdmin);
}
function telaApelido() {
  const atual = nuvem.conta.perfil?.apelido || '';
  mostrarTela(`<div class="tela"><h2>${atual ? 'Trocar apelido' : 'Bem-vindo, piloto!'}</h2>
    <section class="cartao"><p>${atual ? 'É o nome que aparece no ranking.' : 'Escolha o apelido que vai aparecer no ranking. O seu e-mail não aparece para os outros jogadores.'}</p>
    <input id="apelido" class="campo" maxlength="24" placeholder="Ex.: Cap Juan" value="${esc(atual || (nuvem.conta.user?.displayName || '').split(' ')[0])}"><div class="sub erro" id="apErro"></div></section>
    <div class="grade-botoes"><button class="btn btn-laranja grande" id="apSalvar">Salvar</button>${atual ? '<button class="btn btn-cinza" id="voltar">Voltar</button>' : ''}</div></div>`);
  $('#apSalvar').onclick = async () => { try { await nuvem.definirApelido($('#apelido').value); menu(); } catch (e) { $('#apErro').textContent = e.message; } };
  $('#voltar')?.addEventListener('click', menu);
}
const fmtData = (t) => { const d = t?.toDate ? t.toDate() : t ? new Date(t) : null; return d ? d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'; };
async function telaRanking(aba = 'geral', alvo = '1') {
  if (!nuvem.conta.user) { mostrarTela(`<div class="tela centro"><h2>🏆 Ranking</h2><p>Entre com o Google para ver o ranking e aparecer nele.</p><div class="grade-botoes"><button class="btn btn-laranja grande" id="btnEntrar">Entrar com Google</button><button class="btn btn-cinza" id="voltar">Voltar</button></div></div>`); ligarCartaoConta(); $('#voltar').onclick = menu; return; }
  mostrarTela('<div class="tela centro"><h2>🏆 Ranking</h2><p class="sub">Carregando…</p></div>');
  let js; try { js = (await nuvem.listarJogadores()).filter(j => j.apelido); } catch (e) { mostrarTela(`<div class="tela centro"><h2>🏆 Ranking</h2><p>Não deu para carregar (${esc(e.code || e.message)}).</p><button class="btn btn-cinza" id="voltar">Voltar</button></div>`); $('#voltar').onclick = menu; return; }
  const eu = nuvem.conta.user.uid; let linhas, col;
  if (aba === 'geral') { linhas = js.map(j => ({ j, v: j.pontos || 0, d: `${j.totalFases || 0}★ fases · ${j.totalRotas || 0}★ rotas` })).sort((a, b) => b.v - a.v); col = 'estrelas'; }
  else if (aba === 'ativos') { linhas = js.map(j => ({ j, v: j.jogadas || 0, d: `último: ${fmtData(j.atualizadoEm)}` })).sort((a, b) => b.v - a.v); col = 'jogadas'; }
  else if (aba === 'fase') { linhas = js.map(j => ({ j, v: (j.estrelas || {})[alvo] || 0 })).filter(x => x.v > 0).sort((a, b) => b.v - a.v).map(x => ({ ...x, d: estrelasTxt(x.v) })); col = 'estrelas'; }
  else { linhas = js.map(j => ({ j, r: (j.rotas || {})[alvo] })).filter(x => x.r && x.r.tempo != null).sort((a, b) => b.r.estrelas - a.r.estrelas || a.r.tempo - b.r.tempo).map(x => ({ j: x.j, v: mmss(x.r.tempo), d: estrelasTxt(x.r.estrelas) })); col = 'tempo'; }
  const abas = [['geral', '🏆 Geral'], ['ativos', '🔥 Mais ativos'], ['fase', '🎮 Por fase'], ['rota', '🎯 Por rota']];
  const sel = aba === 'fase' ? `<select id="rkAlvo" class="campo">${FASES.map(f => `<option value="${f.n}" ${String(f.n) === String(alvo) ? 'selected' : ''}>${f.n}. ${f.titulo}</option>`).join('')}</select>`
    : aba === 'rota' ? `<select id="rkAlvo" class="campo">${ROTAS_ORDEM.map(id => `<option value="${id}" ${id === alvo ? 'selected' : ''}>${ROTAS[id].icone} ${ROTAS[id].titulo}</option>`).join('')}</select>` : '';
  mostrarTela(`<div class="tela"><h2>🏆 Ranking dos pilotos</h2><div class="abas">${abas.map(([k, t]) => `<button class="aba ${k === aba ? 'sel' : ''}" data-aba="${k}">${t}</button>`).join('')}</div>${sel}
    <section class="cartao">${linhas.length ? `<ol class="ranking">${linhas.map((x, i) => `<li class="${x.j.uid === eu ? 'eu' : ''}"><span class="pos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1 + 'º'}</span><span class="nome"><b>${esc(x.j.apelido)}</b>${x.d ? `<span class="sub">${x.d}</span>` : ''}</span><span class="val">${x.v}${col === 'jogadas' ? ' <span class="sub">jogadas</span>' : col === 'estrelas' && aba === 'geral' ? ' ★' : ''}</span></li>`).join('')}</ol>` : '<p class="sub">Ninguém pontuou aqui ainda. Seja o primeiro!</p>'}</section>
    <p class="sub">${aba === 'geral' ? 'Soma das melhores estrelas de cada fase e de cada rota.' : aba === 'ativos' ? 'Fases e rotas concluídas, contando as repetições.' : aba === 'rota' ? 'Mais estrelas primeiro; no empate, o menor tempo.' : 'Melhor resultado de cada piloto nesta fase.'}</p>
    <button class="btn btn-cinza" id="voltar">Voltar</button></div>`);
  telas.querySelectorAll('.aba').forEach(b => b.onclick = () => telaRanking(b.dataset.aba, b.dataset.aba === 'rota' ? ROTAS_ORDEM[0] : '1'));
  $('#rkAlvo')?.addEventListener('change', (e) => telaRanking(aba, e.target.value)); $('#voltar').onclick = menu;
}
async function telaAdmin() {
  if (!nuvem.ehAdmin()) return menu();
  mostrarTela('<div class="tela centro"><h2>🛠 Jogadores</h2><p class="sub">Carregando…</p></div>');
  let js, priv; try { [js, priv] = await Promise.all([nuvem.listarJogadores(), nuvem.listarPrivado()]); } catch (e) { mostrarTela(`<div class="tela centro"><h2>🛠 Jogadores</h2><p>Erro: ${esc(e.code || e.message)}</p><button class="btn btn-cinza" id="voltar">Voltar</button></div>`); $('#voltar').onclick = menu; return; }
  const uids = [...new Set([...js.map(j => j.uid), ...Object.keys(priv)])], porUid = Object.fromEntries(js.map(j => [j.uid, j]));
  uids.sort((a, b) => ((porUid[b]?.pontos || 0) - (porUid[a]?.pontos || 0)));
  mostrarTela(`<div class="tela"><h2>🛠 Jogadores (${uids.length})</h2><p class="sub">Só você vê esta tela. "Zerar" apaga estrelas, rotas e provas da pessoa, mas mantém a conta e o apelido. "Apagar" remove o jogador do ranking; se ele entrar de novo, começa do zero.</p>
    ${uids.map(uid => { const j = porUid[uid] || {}, p = priv[uid] || {}; const fases = Object.entries(j.estrelas || {}).sort((a, b) => a[0] - b[0]).map(([n, e]) => `F${n} ${e}★`).join(' · ');
      return `<section class="cartao admin-j"><div><b>${esc(j.apelido || '(sem apelido)')}</b> <span class="sub">${esc(p.email || '')}${p.nome ? ' · ' + esc(p.nome) : ''}</span></div>
      <div class="sub">${j.pontos || 0}★ no total · ${j.jogadas || 0} jogadas${j.melhorProva != null ? ` · melhor prova ${j.melhorProva}%` : ''} · último acesso ${fmtData(p.ultimoAcesso)} · progresso ${fmtData(j.atualizadoEm)}${j.resetEm ? ' · zerado em ' + fmtData(j.resetEm) : ''}</div>
      ${fases ? `<div class="sub">${fases}</div>` : ''}
      <div class="linha-botoes"><button class="btn btn-cinza" data-zerar="${uid}">Zerar progresso</button><button class="btn btn-vermelho" data-apagar="${uid}">Apagar</button></div></section>`; }).join('')}
    <button class="btn btn-cinza" id="voltar">Voltar</button></div>`);
  telas.querySelectorAll('[data-zerar]').forEach(b => b.onclick = async () => { const j = porUid[b.dataset.zerar]; if (!confirm(`Zerar o progresso de ${j?.apelido || 'este jogador'}?`)) return; try { await nuvem.zerarJogador(b.dataset.zerar); telaAdmin(); } catch (e) { alert('Erro: ' + (e.code || e.message)); } });
  telas.querySelectorAll('[data-apagar]').forEach(b => b.onclick = async () => { const j = porUid[b.dataset.apagar]; if (!confirm(`Apagar ${j?.apelido || 'este jogador'} do jogo? Não dá para desfazer.`)) return; try { await nuvem.apagarJogador(b.dataset.apagar); telaAdmin(); } catch (e) { alert('Erro: ' + (e.code || e.message)); } });
  $('#voltar').onclick = menu;
}

// ---------- Simulador de voo: livre, guiado e missões ----------
const mmss = (s) => s == null ? '—' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function telaSimulador() {
  const ac = AERONAVES[estado.aeronave];
  mostrarTela(`<div class="tela menu"><h2>Simulador de voo</h2><div class="sub" style="text-align:center">${ac.nome}</div>
    <div class="grade-botoes">
      <button class="btn btn-laranja grande" id="sLivre">🚁 Voo livre <span class="sub-btn">sem objetivos: decole do aeródromo e explore a lagoa, a cidade, a serra e o litoral</span></button>
      <button class="btn btn-laranja grande" id="sGuiado">🧭 Voo guiado <span class="sub-btn">o instrutor diz o que fazer a cada trecho; o caminho aparece no céu</span></button>
      <button class="btn btn-laranja grande" id="sMissoes">🎯 Missões com objetivos <span class="sub-btn">rotas com anéis, pairado e pouso; ganhe estrelas sozinho, com ajuda ou veja a demonstração</span></button>
      <button class="btn btn-cinza" id="voltar">Voltar</button></div></div>`, true);
  $('#sLivre').onclick = () => iniciarVoo(null); $('#sGuiado').onclick = () => telaRotas('guiado'); $('#sMissoes').onclick = () => telaRotas('missao'); $('#voltar').onclick = menu;
}
function telaRotas(foco) {
  mostrarTela(`<div class="tela"><h2>${foco === 'guiado' ? '🧭 Voo guiado' : '🎯 Missões com objetivos'}</h2>
    <div class="sub">${foco === 'guiado' ? 'Escolha a rota. O instrutor acompanha cada trecho e o comando certo pisca na tela.' : 'Escolha a missão. A seta magenta, o farol e a linha laranja mostram o caminho.'}</div>
    <div class="lista-fases">${ROTAS_ORDEM.map(id => { const r = ROTAS[id], g = estado.rota(id); return `
      <button class="fase-item" data-id="${id}"><span class="fase-ico">${r.icone}</span><span class="fase-txt"><b>${r.titulo}</b><span class="sub">${r.nivel} · ${r.resumo}</span>${g.tempo != null ? `<span class="sub">Melhor tempo ${mmss(g.tempo)}</span>` : ''}</span><span class="estrelas">${estrelasTxt(g.estrelas)}</span></button>`; }).join('')}</div>
    <button class="btn btn-cinza" id="voltar">Voltar</button></div>`);
  telas.querySelectorAll('.fase-item').forEach(b => b.onclick = () => briefingRota(b.dataset.id, foco)); $('#voltar').onclick = telaSimulador;
}
function briefingRota(id, foco = 'missao') {
  const r = ROTAS[id], passos = prepararRota(r);
  const lista = passos.map((p, k) => `<li>${p.tipo === 'decolar' ? 'Decolar' : p.tipo === 'wp' ? `${p.nome}: ${p.altFt} ft` : p.tipo === 'pairar' ? `${p.nome}: pairar ${p.aglFt} ft por ${p.dur} s` : 'Pousar no heliponto'} <span class="sub">— ${p.texto}</span></li>`).join('');
  const bGuiado = `<button class="btn btn-laranja grande" id="rAjuda">🧭 Começar voo guiado <span class="sub-btn">instrutor diz o que fazer · até 2 estrelas</span></button>`;
  const bSozinho = `<button class="btn btn-laranja grande" id="rSo">🎮 Fazer sozinho <span class="sub-btn">só os auxílios de navegação · até 3 estrelas</span></button>`;
  mostrarTela(`<div class="tela"><div class="brief-topo"><span class="fase-ico grande">${r.icone}</span><div><h2>${r.titulo}</h2><div class="sub">${r.nivel} · ${AERONAVES[estado.aeronave].nome} · vento ${r.vento.kt} kt de ${String(r.vento.dir).padStart(3, '0')}°</div></div></div>
    <section class="cartao"><h3>Missão</h3><p>${r.resumo}</p><ol class="revisar">${lista}</ol>
    <p class="sub">A altitude de cada perna já considera o relevo + 500 ft. No painel, o ponteiro magenta da bússola aponta para o próximo ponto e a marca magenta do altímetro mostra a altitude da perna.</p></section>
    <div class="grade-botoes">${foco === 'guiado' ? bGuiado + bSozinho : bSozinho + bGuiado}
      <button class="btn btn-cinza grande" id="rDemo">▶️ Ver demonstração <span class="sub-btn">o piloto automático voa a rota e mostra os comandos</span></button>
      <button class="btn btn-cinza" id="voltar">Voltar</button></div></div>`);
  $('#rAjuda').onclick = () => iniciarVoo('rota:' + id, 'ajuda'); $('#rSo').onclick = () => iniciarVoo('rota:' + id, 'livre'); $('#rDemo').onclick = () => iniciarVoo('rota:' + id, 'auto');
  $('#voltar').onclick = () => telaRotas(foco); focoRota = foco;
}
let focoRota = 'missao';

function telaAeronaves() {
  mostrarTela(`<div class="tela"><h2>Escolha a aeronave</h2><div class="lista-ac">${ORDEM_AERONAVES.map(id => { const a = AERONAVES[id]; return `
    <button class="cartao ac ${estado.aeronave === id ? 'sel' : ''}" data-id="${id}"><div class="ac-cor" style="background:#${a.cores.fuselagem.toString(16).padStart(6, '0')};border-color:#${a.cores.faixa.toString(16).padStart(6, '0')}"></div>
    <div><b>${a.nome}</b><div class="sub">${a.descricao}</div><div class="sub">${a.tipoMotor === 'pistao' ? 'Pistão' : 'Turbina'} · ${a.lugares} lugares · Vne ${a.vneKt} kt · rotor ${a.sentidoRotor === 'antihorario' ? 'anti-horário' : 'horário'}</div></div></button>`; }).join('')}</div>
    <button class="btn btn-cinza" id="voltar">Voltar</button></div>`);
  telas.querySelectorAll('.ac').forEach(b => b.onclick = () => { estado.aeronave = b.dataset.id; menu(); }); $('#voltar').onclick = menu;
}

function telaFases() {
  mostrarTela(`<div class="tela"><h2>Trilha PPH (21 fases)</h2><div class="lista-fases">${FASES.map(f => `
    <button class="fase-item" data-n="${f.n}"><span class="fase-ico">${f.icone}</span><span class="fase-txt"><b>${f.n}. ${f.titulo}</b><span class="sub">${f.conceito}</span></span><span class="estrelas">${estrelasTxt(estado.estrelas(f.n))}</span></button>`).join('')}</div>
    <h3>Trilha IFR (em breve)</h3><div class="sub">${TRILHA_IFR.map(t => `• ${t.titulo}: ${t.mecanica}`).join('<br>')}</div>
    <button class="btn btn-cinza" id="voltar">Voltar</button></div>`);
  telas.querySelectorAll('.fase-item').forEach(b => b.onclick = () => briefing(+b.dataset.n)); $('#voltar').onclick = menu;
}

function briefing(n) {
  const f = FASES[n - 1];
  mostrarTela(`<div class="tela"><div class="brief-topo"><span class="fase-ico grande">${f.icone}</span><div><h2>Fase ${f.n}: ${f.titulo}</h2><div class="sub">${f.conceito} · ${AERONAVES[estado.aeronave].nome}</div></div></div>
    <section class="cartao"><h3>O que fazer</h3><p>${f.briefing}</p></section>
    <section class="cartao"><h3>Teoria (cai na prova)</h3><ul>${f.teoria.map(t => `<li>${t}</li>`).join('')}</ul></section>
    ${f.tipo === 'voo' ? '<section class="cartao sub">Controles: esquerda = coletivo (barra vertical) e pedais (barra horizontal); direita = cíclico (ou inclinação do celular, nos ajustes). No Mac: W/S coletivo, setas cíclico, A/D pedais, C câmera. Durante o voo, o botão 💡 troca o modo (sozinho → com ajuda → demonstração).</section>' : ''}
    <div class="grade-botoes">${f.tipo === 'voo' ? `
      <button class="btn btn-laranja grande" id="comecar">🎮 Fazer sozinho <span class="sub-btn">até 3 estrelas</span></button>
      <button class="btn btn-laranja grande" id="comAjuda">🧑‍✈️ Fazer com ajuda <span class="sub-btn">instrutor diz o que fazer · até 2 estrelas</span></button>
      <button class="btn btn-cinza grande" id="demo">▶️ Ver demonstração <span class="sub-btn">o piloto automático voa e mostra os comandos</span></button>` : '<button class="btn btn-laranja grande" id="comecar">Começar</button>'}
      <button class="btn btn-cinza" id="voltar">Voltar</button></div></div>`);
  $('#voltar').onclick = telaFases;
  if (f.tipo === 'voo') { $('#comAjuda').onclick = () => iniciarVoo(n, 'ajuda'); $('#demo').onclick = () => iniciarVoo(n, 'auto'); }
  $('#comecar').onclick = () => {
    if (f.tipo === 'voo') iniciarVoo(n, 'livre');
    else if (f.tipo === 'identificar') { montarIdentificar(telaAtividade(), (r) => { const p = r.certas / r.total; miniQuiz(n, p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.4 ? 1 : 0, `Peças: ${r.certas} certas de primeira, ${r.aposErro} depois de errar, ${r.consultadas} viu a resposta, ${r.puladas} pulou (de ${r.total}).`); }); }
    else if (f.tipo === 'quiz') quizFase(n);
    else if (f.tipo === 'metar') { montarMetar(telaAtividade(), embaralhar(METAR).slice(0, 6), (r) => resultadoTeoria(n, r)); }
    else if (f.tipo === 'fonia') { montarFonia(telaAtividade(), embaralhar(FONIA).slice(0, 5), (r) => resultadoTeoria(n, r)); }
    else if (f.tipo === 'sipaer') { montarSipaer(telaAtividade(), SIPAER_ORDEM, (r) => resultadoTeoria(n, r, true)); }
    else if (f.tipo === 'prova') prova();
  };
}

// atividades fora do voo (quiz, peças, METAR, fonia, SIPAER, prova): barra fixa com saída para a lista de fases
let pararAtividade = null;
function telaAtividade() {
  pararAtividade = null;
  mostrarTela('<div class="barra-sair"><button class="btn-mini vermelho" id="sairAtv">✕ Sair para as fases</button></div><div class="tela" id="alvo"></div>');
  $('#sairAtv').onclick = () => { if (!confirm('Sair desta fase? O que você fez agora não vale estrelas.')) return; pararAtividade?.(); pararAtividade = null; telaFases(); };
  return $('#alvo');
}

// resumo do quiz: acertos, viu a resposta, pulou e a lista do que revisar
function resumoQuiz(r) {
  const vistas = r.respostas.filter(x => x.consultada), puladas = r.respostas.filter(x => x.pulada), erradas = r.respostas.filter(x => !x.ok && !x.consultada && !x.pulada);
  const rev = [...erradas, ...vistas, ...puladas];
  return `${r.acertos} de ${r.total} certas · ${erradas.length} erradas · ${vistas.length} viu a resposta · ${puladas.length} pulou.` +
    (rev.length ? `<section class="cartao" style="text-align:left"><h3>Para estudar</h3><ul class="revisar">${rev.map(x => `<li><b>${x.q.p}</b> <span class="sub">(${x.consultada ? 'viu a resposta' : x.pulada ? 'pulou' : 'errou'})</span><br>Resposta: ${x.q.o[x.q.r]}. ${x.q.e}</li>`).join('')}</ul></section>` : '');
}
function quizFase(n) {
  let qs = embaralhar(BANCO[n] || []).slice(0, 8);
  if (n === 16) qs = embaralhar([...qs.slice(0, 4), ...ALTIMETRO.map(exParaQuiz)]).slice(0, 10);
  if (n === 17) qs = embaralhar([...qs.slice(0, 4), ...NAVEGACAO.map(exParaQuiz)]).slice(0, 10);
  pararAtividade = montarQuiz(telaAtividade(), qs, { titulo: `Fase ${n}`, aoTerminar: (r) => { const p = r.acertos / r.total; const est = p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.5 ? 1 : 0; estado.gravarEstrelas(n, est); telaResultado(n, est, resumoQuiz(r)); } });
}
function resultadoTeoria(n, r, seguirQuiz = false) {
  const p = r.total ? r.acertos / r.total : 0; const est = p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.5 ? 1 : 0;
  if (seguirQuiz) miniQuiz(n, est, `${r.acertos} de ${r.total} acertos nas ações.`); else { estado.gravarEstrelas(n, est); telaResultado(n, est, `${r.acertos} de ${r.total} acertos.`); }
}
// mini-quiz pós-fase (3 questões); as estrelas finais combinam a prática e o quiz
function miniQuiz(n, estPratica, resumo) {
  const qs = embaralhar(BANCO[n] || []).slice(0, 3);
  if (!qs.length) { estado.gravarEstrelas(n, estPratica); return telaResultado(n, estPratica, resumo); }
  pararAtividade = montarQuiz(telaAtividade(), qs, { titulo: `Mini-quiz da fase ${n}`, aoTerminar: (r) => { const est = Math.max(0, Math.min(3, Math.round((estPratica * 2 + (r.acertos / r.total) * 3) / 3))); estado.gravarEstrelas(n, est); telaResultado(n, est, `${resumo}<br>Mini-quiz: ${resumoQuiz(r)}`); } });
}
function telaResultado(n, est, resumo) {
  const f = FASES[n - 1]; const prox = FASES[n];
  mostrarTela(`<div class="tela centro"><div class="fase-ico grande">${est >= 2 ? '🏅' : est === 1 ? '👍' : '🔁'}</div><h2>Fase ${n}: ${f.titulo}</h2><div class="estrelas grande">${estrelasTxt(est)}</div><p>${resumo}</p>
    <div class="grade-botoes">${prox ? `<button class="btn btn-laranja grande" id="prox">Próxima: ${prox.n}. ${prox.titulo}</button>` : ''}<button class="btn btn-cinza" id="repetir">Repetir</button><button class="btn btn-cinza" id="voltar">Fases</button></div></div>`);
  if (prox) $('#prox').onclick = () => briefing(prox.n); $('#repetir').onclick = () => briefing(n); $('#voltar').onclick = telaFases;
}

function prova() {
  const porMateria = { 'Regulamentos': [18, 19, 20, 7], 'Meteorologia': [14, 15, 16], 'Navegação': [17], 'Teoria de Voo': [2, 3, 4, 5, 11, 12, 13, 10], 'Conh. Técnicos': [1, 6, 8, 9] };
  let qs = [];
  for (const [m, fases] of Object.entries(porMateria)) { const pool = embaralhar(fases.flatMap(n => (BANCO[n] || []).map(q => ({ ...q, m })))); qs.push(...pool.slice(0, 8)); }
  qs = embaralhar([...qs, ...embaralhar(BANCO[21] || []).slice(0, 0)]).slice(0, 40);
  pararAtividade = montarQuiz(telaAtividade(), qs, { titulo: 'Prova ANAC (simulado)', limiteS: 40 * 60, aoTerminar: (r) => {
    const porM = {}; for (const x of r.respostas) { porM[x.q.m] = porM[x.q.m] || { a: 0, t: 0 }; porM[x.q.m].t++; if (x.ok) porM[x.q.m].a++; }
    const p = r.acertos / qs.length; const est = p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.5 ? 1 : 0; estado.gravarEstrelas(21, est); estado.registrarProva({ data: new Date().toISOString(), acertos: r.acertos, total: qs.length });
    telaResultado(21, est, `${r.acertos} de ${qs.length} (${(p * 100).toFixed(0)} %) ${p >= 0.7 ? 'APROVADO' : 'reprovado, mínimo 70 %'}.<br>` + Object.entries(porM).map(([m, v]) => `${m}: ${v.a}/${v.t}`).join(' · ') + '<br>' + resumoQuiz({ ...r, total: qs.length }));
  } });
}

function telaAjustes() {
  mostrarTela(`<div class="tela"><h2>Ajustes</h2>
    <section class="cartao"><h3>Assistência de voo</h3><div class="sub">Quanto o jogo ajuda a nivelar o helicóptero. 0 = realista (instável como o R22), 1 = muito assistido.</div><input type="range" id="assist" min="0" max="1" step="0.1" value="${estado.assist}"><div id="assistV">${estado.assist}</div></section>
    <section class="cartao"><h3>Cíclico pelo giroscópio</h3><div class="sub">Incline o celular para comandar o cíclico (iPhone pede permissão num toque). Ligue dentro do voo, pelo botão 📱.</div><label><input type="checkbox" id="giro" ${estado.giro ? 'checked' : ''}> Usar giroscópio por padrão</label></section>
    <section class="cartao"><h3>Câmera</h3><select id="cam"><option value="atras" ${estado.camera === 'atras' ? 'selected' : ''}>Atrás do helicóptero</option><option value="cabine" ${estado.camera === 'cabine' ? 'selected' : ''}>Cabine</option><option value="externa" ${estado.camera === 'externa' ? 'selected' : ''}>Externa (orbita)</option></select></section>
    <section class="cartao"><h3>Progresso</h3><button class="btn btn-vermelho" id="zerar">Apagar estrelas</button></section>
    <button class="btn btn-cinza" id="voltar">Voltar</button></div>`);
  $('#assist').oninput = (e) => { estado.assist = +e.target.value; $('#assistV').textContent = e.target.value; };
  $('#giro').onchange = (e) => { estado.giro = e.target.checked; }; $('#cam').onchange = (e) => { estado.camera = e.target.value; };
  $('#zerar').onclick = () => { if (confirm(nuvem.conta.user ? 'Apagar todo o progresso? Ele também será apagado da sua conta.' : 'Apagar todo o progresso?')) { estado.zerarLocal(); menu(); } };
  $('#voltar').onclick = menu;
}
function telaCreditos() {
  mostrarTela(`<div class="tela"><h2>Sobre</h2><section class="cartao"><p><b>Simulador de Helicóptero para Estudo</b>, versão ${__APP_VERSION__}.</p><p>Jogo de estudo para a habilitação PPH (e depois IFR). <b>Não é um simulador certificado</b> e não substitui o POH da aeronave, as normas vigentes nem o instrutor.</p>
    <p>Dados das aeronaves: POH/RFM Robinson R22, R44 e R66; TCDS EASA; dados públicos do Esquilo AS350 B2 e B3/H125 (Airbus). Normas: DECEA (ICA 100-12, ICA 100-4, MCA 100-16) e ANAC (RBAC 61, 67, 91). Material do curso CCOA/PPH.</p>
    <p>Motor de voo simplificado, calibrado pelos tetos IGE/OGE publicados. Fraseologia em modelo didático (conferir no AISWEB e com o instrutor).</p></section>
    <section class="cartao"><h3>Créditos dos recursos 3D</h3><ul class="sub">
    <li>Modelo "Robinson R44" por syarifudinirfan701 (Sketchfab), licença CC-BY 4.0. Usado para R22, R44 e R66.</li>
    <li>Modelo "Squirrel Eurocopter AS350 Écureuil" por MonkiFlip Resource (Sketchfab), licença CC-BY 4.0. Usado para os Esquilos.</li>
    <li>Céu HDRI "Kloofendal 48d Partly Cloudy (Pure Sky)", Poly Haven, CC0.</li>
    <li>Texturas Grass004, Asphalt012, Concrete034 e Rock035, ambientCG, CC0.</li>
    <li>Vegetação do "Nature Kit", Kenney (kenney.nl), CC0.</li>
    <li>Fotos da fase 1: R22 N2584F por Acroterion (CC BY-SA 4.0) e cockpit de R22 por NJR ZA (CC BY-SA 3.0), Wikimedia Commons.</li>
    <li>Three.js (MIT). Lista completa em CREDITOS.md no repositório.</li></ul></section>
    <section class="cartao centro"><img src="icons/icon-192.png" class="logo" alt=""><p><b>Desenvolvido por Juan Araujo &amp; Filho</b><br>CBMERJ · 1856</p></section>
    <button class="btn btn-cinza" id="voltar">Voltar</button></div>`);
  $('#voltar').onclick = menu;
}

// ---------- Voo ----------
let cena = null, hud = null, ctl = null, heli = null, missao = null, faseAtual = null, rodando = false, ultimoT = 0, cmdExtra = {};
let modoVoo = 'livre', piloto = null, guiaUltimo = '', rotaId = null, navInfo = null, navT = 0;
const NOME_MODO = { livre: 'Sozinho', ajuda: 'Com ajuda', auto: 'Demonstração' };
const fila = []; let msgTimer = 0;

function iniciarVoo(n, modo = 'livre') {
  faseAtual = n; modoVoo = n ? modo : 'livre'; const ac = AERONAVES[estado.aeronave];
  telas.hidden = true; jogo.hidden = false;
  modoVitrine = false; jogo.classList.remove('vitrine'); telas.classList.remove('sobre-3d'); garantirCena(); cena.redimensionar();
  cena.criarHeli(ac); cena.modoCamera = estado.camera; cena._camPos = null;
  heli = new Helicoptero(ac, { assist: estado.assist });
  ctl.zerar(); cmdExtra = {}; fila.length = 0;
  if (estado.giro) ctl.ligarGiro(); else ctl.desligarGiro();
  rotaId = typeof n === 'string' ? n.slice(5) : null;
  if (rotaId) { missao = new MissaoRota(cena, heli, { id: rotaId }); }
  else if (n && MISSOES[n]) { missao = new MISSOES[n](cena, heli, {}); } else { missao = null; cena.limparMarcadores(); heli.reset({ hpFt: 0, oatC: 25, ventoKt: 5, ventoDirDeg: 360 }); }
  cena.navLigado = estado.nav;
  ctl.coletivo = heli.coletivo; ctl.atualizarVisual(); // missões que começam em voo já vêm com o coletivo no pairado
  piloto = new PilotoAutomatico(heli); piloto.reset(); ctl.externo = modoVoo === 'auto'; guiaUltimo = ''; mostrarGuia(null, []);
  $('#painelTitulo').textContent = rotaId ? `${ROTAS[rotaId].icone} ${ROTAS[rotaId].titulo} · ${NOME_MODO[modoVoo]}` : n ? `Fase ${n}: ${FASES[n - 1].titulo}` : `Voo livre · ${ac.curto}`;
  montarBotoesExtras();
  atualizarPainel(); rodando = true; ultimoT = performance.now(); requestAnimationFrame(loop);
}
function montarBotoesExtras() {
  const box = $('#botoesExtras'); box.innerHTML = '';
  const add = (rot, fn, cls = '') => { const b = document.createElement('button'); b.className = 'btn-mini ' + cls; b.textContent = rot; b.onclick = fn; box.appendChild(b); return b; };
  add('📷', () => { const m = ['atras', 'cabine', 'externa']; cena.modoCamera = m[(m.indexOf(cena.modoCamera) + 1) % 3]; estado.camera = cena.modoCamera; });
  add('📱', async () => { if (ctl.giro) { ctl.desligarGiro(); aviso('Giroscópio desligado'); } else { const ok = await ctl.ligarGiro(); aviso(ok ? 'Giroscópio ligado: segure o celular nivelado e incline para comandar' : 'Giroscópio não disponível neste aparelho/navegador'); } });
  if (missao) add(cena.navLigado ? '🧭' : '🧭✕', () => { cena.navLigado = !cena.navLigado; estado.nav = cena.navLigado; aviso(cena.navLigado ? 'Auxílios de navegação ligados: seta, farol no alvo e ponteiro magenta' : 'Auxílios de navegação desligados'); montarBotoesExtras(); });
  if (!faseAtual) add('MOTOR', () => { cmdExtra.motor = heli.motor === 'on' ? 'off' : 'on'; aviso(cmdExtra.motor === 'off' ? 'Pane de motor simulada' : 'Motor religado'); });
  if (missao) for (const b of missao.botoes) add(b.rotulo, () => { missao.cmdExtra[b.id] = true; }, 'vermelho');
  if (missao) add('💡 ' + NOME_MODO[modoVoo], () => { const seq = ['livre', 'ajuda', 'auto']; modoVoo = seq[(seq.indexOf(modoVoo) + 1) % 3]; ctl.externo = modoVoo === 'auto'; if (modoVoo !== 'auto') { ctl.coletivo = heli.coletivo; } piloto.reset(); aviso('Modo: ' + NOME_MODO[modoVoo]); montarBotoesExtras(); mostrarGuia(null, []); });
  add('↻', () => iniciarVoo(faseAtual, modoVoo));
  add('✕ Sair', sairVoo, 'vermelho');
}
function aviso(txt) { fila.push(txt); }
function mostrarGuia(texto, acoes) {
  const el = $('#guia'); const chave = (texto || '') + '|' + acoes.map(a => a.t).join(',');
  if (chave !== guiaUltimo) {
    guiaUltimo = chave;
    el.hidden = !texto; if (texto) el.innerHTML = `<div class="guia-alvo">${modoVoo === 'auto' ? '▶️ ' : '🧑‍✈️ '}${texto}</div>${acoes.length ? `<div class="guia-acoes">${acoes.map(a => `<span class="chip">${a.t}</span>`).join('')}</div>` : ''}`;
  }
  const usados = new Set(acoes.map(a => a.ctl));
  $('#ctlCol')?.classList.toggle('destaque', usados.has('col')); $('#ctlPed')?.classList.toggle('destaque', usados.has('ped')); $('#ctlCic')?.classList.toggle('destaque', usados.has('cic'));
  $('#botoesExtras')?.classList.toggle('destaque', acoes.some(a => a.ctl === 'botao'));
}
function atualizarPainel() {
  const el = $('#objetivos');
  if (!missao) { el.innerHTML = '<div class="sub">Voo livre. Experimente os comandos.</div>'; return; }
  const nav = navInfo ? `<div class="nav-linha">🧭 ${navInfo.dist >= 1000 ? (navInfo.dist / 1000).toFixed(1).replace('.', ',') + ' km' : navInfo.dist.toFixed(0) + ' m'} · proa ${navInfo.proaDeg.toFixed(0).padStart(3, '0')}°${navInfo.altFt != null ? ` · ${Math.round(navInfo.altFt / 10) * 10} ft ${(() => { const d = navInfo.altFt - heli.pos.y / 0.3048; return Math.abs(d) < 60 ? '✓' : d > 0 ? '▲' + Math.round(d / 10) * 10 : '▼' + Math.round(-d / 10) * 10; })()}` : ''}</div>` : '';
  const lista = rotaId ? missao.objetivos.filter((o, k) => k >= Math.max(0, missao.i - 1) && k <= missao.i + 1) : missao.objetivos;
  el.innerHTML = nav + lista.map(o => `<div class="obj ${o.feito ? 'feito' : ''}">${o.feito ? '✅' : '⬜'} ${o.texto}</div>`).join('');
}
function loop(t) {
  if (!rodando) return;
  const dt = Math.min(0.05, (t - ultimoT) / 1000); ultimoT = t;
  ctl.tick(dt);
  if (ctl.teclas.KeyC) { ctl.teclas.KeyC = false; $('#botoesExtras .btn-mini').click(); }
  let cmd = { ...ctl.comando(), ...cmdExtra, ...(missao ? missao.cmdExtra : {}) };
  const alvo = missao && missao.estado === 'andamento' ? missao.guia() : null; // um cálculo por quadro (serve à navegação e ao piloto automático)
  if (missao && modoVoo !== 'livre' && missao.estado === 'andamento') {
    const cmdAuto = alvo ? piloto.calcular(alvo, dt) : null;
    if (cmdAuto && modoVoo === 'auto') {
      cmd = { ...cmd, coletivo: cmdAuto.coletivo, cicX: cmdAuto.cicX, cicY: cmdAuto.cicY, pedal: cmdAuto.pedal };
      ctl.coletivo = cmd.coletivo; ctl.cicX = cmd.cicX; ctl.cicY = cmd.cicY; ctl.pedal = cmd.pedal; ctl.atualizarVisual();
      if (cmdAuto.extra.cortar) missao.cmdExtra.cortar = true;
      mostrarGuia(alvo.texto, cmdAuto.acoes.length ? cmdAuto.acoes : [{ ctl: null, t: 'Mantendo' }]);
    } else if (cmdAuto && modoVoo === 'ajuda') {
      const d = alvo.botao ? { ctl: 'botao', t: 'Aperte o botão ' + alvo.botao.toUpperCase() } : dicaDeAjuda(cmdAuto, cmd, heli);
      mostrarGuia(alvo.texto, d ? [d] : []);
    }
  }
  // sub-passos para estabilidade numérica; o chão sob o helicóptero vem do relevo (morros, lagoa e mar)
  cmd.alturaSolo = chao(heli.pos.x, heli.pos.z);
  const n = 2; for (let i = 0; i < n; i++) heli.update(dt / n, cmd);
  if (heli.noSolo && !heli.crash && naAgua(heli.pos.x, heli.pos.z)) { heli.crash = { motivo: 'agua', texto: 'Pousou na água. Sobre a água, mantenha altura e escolha antes um local de pouso em terra.' }; heli.evento('crash', heli.crash); }
  if (missao) {
    missao.update(dt);
    for (const m of missao.msgs.splice(0)) fila.push(m);
    if (missao.estado !== 'andamento') { fimMissao(); return; }
  } else if (heli.crash) { aviso(heli.crash.texto); setTimeout(() => iniciarVoo(null), 4000); rodando = false; }
  // mensagens do instrutor
  msgTimer -= dt;
  if (msgTimer <= 0 && fila.length) { const m = fila.shift(); const el = $('#instrutor'); el.textContent = m; el.classList.add('on'); msgTimer = Math.min(8, 3 + m.length / 25); setTimeout(() => el.classList.remove('on'), msgTimer * 1000 - 300); }
  if (heli.buzina && Math.floor(t / 400) % 2 === 0) vibrar(40);
  navInfo = cena.atualizarNav(alvo, heli); navT -= dt; if (navT <= 0 && missao) { navT = 0.25; atualizarPainel(); }
  cena.atualizar(heli, dt); cena.render(); hud.desenhar(heli, heli.ac, { nav: navInfo });
  requestAnimationFrame(loop);
}
function fimMissao() {
  rodando = false; const ok = missao.estado === 'sucesso'; let est = missao.estrelas; const n = faseAtual; const resumo = missao.resumo;
  mostrarGuia(null, []); atualizarPainel();
  if (rotaId) return fimRota(ok, est, resumo);
  if (modoVoo === 'auto') { setTimeout(() => { mostrarTela(`<div class="tela centro"><div class="fase-ico grande">▶️</div><h2>Demonstração ${ok ? 'concluída' : 'interrompida'}</h2><p>${resumo}</p><p class="sub">A demonstração não dá estrelas. Agora é a sua vez.</p><div class="grade-botoes"><button class="btn btn-laranja grande" id="aj">🧑‍✈️ Fazer com ajuda</button><button class="btn btn-laranja grande" id="so">🎮 Fazer sozinho</button><button class="btn btn-cinza" id="rep">▶️ Ver de novo</button><button class="btn btn-cinza" id="voltar">Briefing</button></div></div>`); $('#aj').onclick = () => iniciarVoo(n, 'ajuda'); $('#so').onclick = () => iniciarVoo(n, 'livre'); $('#rep').onclick = () => iniciarVoo(n, 'auto'); $('#voltar').onclick = () => briefing(n); }, 800); return; }
  if (modoVoo === 'ajuda') est = Math.min(est, 2);
  setTimeout(() => { if (ok) miniQuiz(n, est, resumo); else { mostrarTela(`<div class="tela centro"><div class="fase-ico grande">💥</div><h2>Não deu certo</h2><p>${resumo}</p><div class="grade-botoes"><button class="btn btn-laranja grande" id="rep">Tentar de novo</button><button class="btn btn-cinza" id="voltar">Briefing</button></div></div>`); $('#rep').onclick = () => iniciarVoo(n, modoVoo); $('#voltar').onclick = () => briefing(n); } }, ok ? 600 : 1200);
}
function fimRota(ok, est, resumo) {
  const id = rotaId, r = ROTAS[id], modo = modoVoo;
  if (modo === 'ajuda') est = Math.min(est, 2);
  if (ok && modo !== 'auto') estado.gravarRota(id, est, missao.tVoo);
  const ico = !ok ? '💥' : modo === 'auto' ? '▶️' : est >= 2 ? '🏅' : '👍';
  setTimeout(() => {
    mostrarTela(`<div class="tela centro"><div class="fase-ico grande">${ico}</div><h2>${r.titulo}</h2>${ok && modo !== 'auto' ? `<div class="estrelas grande">${estrelasTxt(est)}</div>` : ''}<p>${resumo}</p>
      ${modo === 'auto' ? '<p class="sub">A demonstração não dá estrelas. Agora é a sua vez.</p>' : ''}
      <div class="grade-botoes">${modo !== 'livre' ? '<button class="btn btn-laranja grande" id="so">🎮 Fazer sozinho</button>' : ''}${modo !== 'ajuda' ? '<button class="btn btn-laranja grande" id="aj">🧭 Voo guiado</button>' : ''}
      <button class="btn btn-cinza" id="rep">↻ Repetir (${NOME_MODO[modo]})</button><button class="btn btn-cinza" id="voltar">Outras rotas</button></div></div>`);
    $('#so')?.addEventListener('click', () => iniciarVoo('rota:' + id, 'livre')); $('#aj')?.addEventListener('click', () => iniciarVoo('rota:' + id, 'ajuda'));
    $('#rep').onclick = () => iniciarVoo('rota:' + id, modo); $('#voltar').onclick = () => telaRotas(focoRota);
  }, ok ? 700 : 1200);
}
// sair do voo leva direto à lista de onde veio (fases, rotas ou o menu do simulador)
function sairVoo() { rodando = false; mostrarGuia(null, []); if (rotaId) telaRotas(focoRota); else if (faseAtual) telaFases(); else telaSimulador(); }

// ---------- Início ----------
menu();
// login: quando a conta muda, o menu se atualiza; conta nova pede o apelido antes de tudo
nuvem.aoMudarConta((c) => {
  if (telas.hidden) return; // em voo: não interrompe
  if (c.user && !c.perfil && !c.erro) return telaApelido();
  if ($('#btnFases')) menu();
});
nuvem.iniciarNuvem();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
// evita zoom por duplo toque no iOS
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
