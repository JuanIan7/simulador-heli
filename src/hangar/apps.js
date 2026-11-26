// Aba "Apps de voo" do Hangar (grupo Voo): o que cada app de planejamento faz, grátis × pago, passo a passo e o roteiro de treino.
// Pesquisa de 26/11/2026 nas lojas, sites e centrais de ajuda oficiais. O que a fonte não confirmou está marcado.
// A lista "já tenho" fica só no aparelho (localStorage).

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHAVE = 'apps-tenho';
let tenho = {};
try { tenho = JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch {}

const NC = '<span class="pv2-conf">não confirmado</span>';

export const APPS_VOO = [
  {
    id: 'fplbr', ico: '📨', nome: 'FPL BR', quem: 'DECEA', para: 'Enviar o plano de voo (FPL) e as mensagens DLA, CHG e CNL.',
    plat: 'iPhone e Android · web: PLNI',
    preco: [['Grátis', 'Tudo. Não existe versão paga.']],
    links: [['iPhone', 'https://apps.apple.com/app/id1246453071'], ['Android', 'https://play.google.com/store/apps/details?id=br.com.atech.sigmaandroid'], ['PLNI (navegador)', 'https://sigma.decea.mil.br/plni/loginPage']],
    passos: [
      '<b>Cadastro (faça hoje, a análise demora):</b> na tela de login, toque em algo como "Cadastrar novo usuário", ou peça pelo site PLNI. O login é do SIGMA/PLNI (não é o gov.br) e o perfil é <b>Piloto</b>. Quem analisa é o CGNA, que responde por e-mail ou telefone.',
      'Entre com o login e toque em <b>+</b> para um plano novo: <b>completo</b> ou <b>simplificado</b>.',
      'Preencha aeronave, partida, hora (EOBT), velocidade, nível, rota e destino. Use a aba <b>Plano de voo</b> do Hangar como modelo: ela mostra cada campo da sua rota.',
      'Campos 10A/10B (equipamentos): seta <b>&gt;</b>; verde = tem, vermelho = não tem. Campo 18: <b>+</b> e escolha os itens (DOF, RMK com os corredores). Campo 19: autonomia, pessoas a bordo e equipamentos.',
      'Toque no <b>botão verde</b> para validar. Avisos são só informação; erros precisam ser corrigidos. Toque de novo no verde para enviar.',
      'Acompanhe pela cor: <b>amarelo</b> = enviado, aguardando; <b>verde</b> = aceito (só então pode sair); <b>roxo</b> = recusado (o motivo fica em "informações adicionais").',
      'Mudou algo? Abra a mensagem original e mande <b>DLA</b> (atraso), <b>CHG</b> (alteração) ou <b>CNL</b> (cancelamento).',
    ],
    pegadinhas: ['Os nomes de botão vêm de um manual de 2018; as telas podem ter mudado. Confira no app.', 'Tenha o PLNI no navegador como plano B se o app falhar.', 'Prazos: plano completo até 45 min antes da EOBT (30 min pelo app ou internet); simplificado até 10 min antes. Detalhes na aba Plano de voo.'],
  },
  {
    id: 'efb', ico: '🗂️', nome: 'FPL BR EFB', quem: 'DECEA', para: 'Cartas, AIP, ROTAER, NOTAM e METAR/TAF oficiais, offline.',
    plat: 'iPad e Android (iPhone ' + NC + ')',
    preco: [['Grátis', 'Tudo. Sem compras no app.']],
    links: [['iPhone/iPad', 'https://apps.apple.com/app/id1495251906'], ['Android', 'https://play.google.com/store/apps/details?id=br.gov.decea.fplbr.efb']],
    passos: [
      'Na primeira abertura, <b>baixe as cartas</b> (com Wi-Fi). Depois funciona sem internet.',
      'Procure algo como "Cartas": abra a <b>CCV REH WT-Curitiba</b>, a <b>REA</b> e a <b>WAC</b>. Confira se estão no ciclo AIRAC vigente.',
      'Em "Publicações" ou similar: <b>ROTAER</b> de SISY, SBCT e SBBI (frequências, horários, restrições de pista).',
      'Veja <b>NOTAM</b> e <b>METAR/TAF</b> de SBCT e SBBI.',
      'Dá para carregar a rota em GPX: o arquivo GPX da aba Plano de voo do Hangar serve.',
    ],
    pegadinhas: ['É a fonte oficial e grátis. Os outros apps são apoio.'],
  },
  {
    id: 'nexatlas', ico: '🧭', nome: 'NexAtlas', quem: 'NexAtlas (Brasil)', para: 'Montar a rota VFR no mapa, com os corredores REA/REH guiados, navlog, consumo e W&B.',
    plat: 'iPhone, Android e navegador',
    preco: [['Teste grátis', '30 dias, pela página inicial (um texto em inglês fala em 15). <b>Não existe plano grátis permanente.</b>'], ['Piloto aluno', 'R$ 119,40 por 6 meses (6× R$ 19,90), 50% de desconto, com comprovante.'], ['Profissional', 'R$ 39,90/mês ou R$ 399,90/ano.']],
    links: [['Planos', 'https://nexatlas.com/planos/'], ['iPhone', 'https://apps.apple.com/app/id1562704198'], ['Navegador', 'https://app.nexatlas.com']],
    passos: [
      'Crie a conta e comece o teste. <b>Guarde o teste para a semana em que for treinar de verdade</b>: ele corre mesmo sem uso.',
      '<b>Aeronave:</b> puxe o painel de baixo, toque em "Aeronave" → "+ Cadastrar Aeronave". Nas abas "Geral" e "Performance", use os números do R22 (cruzeiro de 80 a 90 kt e consumo do POH). Helicóptero não aparece nas fontes ' + NC + ': se não tiver R22, faça um perfil genérico.',
      '<b>Rota:</b> "Adicionar partida" (SISY) e "Adicionar destino" (SBBI ou SISY). Pontos no meio: "Adicionar ponto", ou toque e segure no mapa.',
      '<b>Corredores:</b> no celular, "Inserção de Corredores Visuais": escolha a entrada, o corredor e a saída. O app só deixa os sentidos que a carta permite.',
      'Ajuste a <b>altitude</b> em cada ponto e confira na tabela de navegação o rumo, a distância, o tempo e o consumo. Compare com o navlog da aba Plano de voo do Hangar.',
      'Use <b>copiar para o FPL BR</b> e cole no campo de rota do FPL BR. O envio do plano continua sendo no FPL BR.',
      'Peça o <b>desconto de aluno</b> antes de voltar para o seu estado: em nexatlas.com/planos → "Solicitar desconto", com a declaração da EACAR ou o comprovante de matrícula (até 90 dias). Aprovação em até 3 dias úteis, por WhatsApp.',
    ],
    pegadinhas: ['O W&B do NexAtlas pede que você monte o perfil com o envelope; use os números da aba Peso e balanceamento.', 'Os corredores guiados só existem no app de celular ou tablet.'],
  },
  {
    id: 'beyond', ico: '🛩️', nome: 'Beyond EFB', quem: 'Beyond Aero (Brasil)', para: 'EFB completo: rota com vento, ETE, TOC/TOD, consumo e navlog.',
    plat: 'iPhone, iPad e Android',
    preco: [['Básico (grátis para sempre)', 'Offline, dados e cartas do Brasil, estimados, METAR/TAF e NOTAM.'], ['Pro', 'R$ 24,90/mês ou R$ 249/ano: rota automática IFR/VFR (REA/REH), VNAV, terreno, <b>peso e balanceamento</b> e Windy.'], ['Adicionais', 'Países vizinhos e visão 3D, à parte.']],
    links: [['Site', 'https://lp.beyond.aero/pt/efb'], ['iPhone', 'https://apps.apple.com/br/app/id1611404636'], ['Android', 'https://play.google.com/store/apps/details?id=com.beyond.efb']],
    passos: [
      'Crie a conta e baixe os dados do Brasil para usar offline.',
      '<b>Perfil de performance:</b> no menu lateral esquerdo (terceira opção, segundo o guia rápido), cadastre o R22 com cruzeiro e consumo do POH. Helicóptero não aparece nas fontes ' + NC + '.',
      'Monte a rota no mapa ponto a ponto (na versão grátis, a rota automática pelos corredores é Pro). Use os pontos da carta REH.',
      'Informe dia, hora e altitude: o app calcula tempo e consumo com o vento previsto. Compare com o navlog do Hangar.',
      'Copie o código da rota para o FPL BR (um toque) e cole no campo de rota.',
    ],
    pegadinhas: ['No grátis <b>não tem W&B</b>: para isso use o Tool in the Cockpit ou a aba Peso e balanceamento do Hangar.', 'O site fala em acesso grátis para "alunos SAFE"; vale perguntar ao suporte se a EACAR entra ' + NC + '.'],
  },
  {
    id: 'titc', ico: '⚖️', nome: 'Tool in the Cockpit', quem: 'Chopchop Apps', para: 'Peso e balanceamento e desempenho de helicópteros (pairado, altitude-densidade).',
    plat: 'iPhone, iPad e Android',
    preco: [['Grátis para sempre', '<b>R22 e AS350</b> (Esquilo).'], ['Pago', 'R44 ou R66: US$ 17,99/ano cada; tudo liberado: US$ 49,99; mapas de tempo à parte.']],
    links: [['iPhone', 'https://apps.apple.com/app/id6463623450'], ['Site', 'https://chopchopapps.com']],
    passos: [
      'Escolha <b>R22</b> e a variante <b>Beta II</b>.',
      'Digite o peso vazio e o braço da <b>ficha do PR-HNE</b> (887,60 lb e 103,69 in), se o app deixar; senão, ele usa um padrão do modelo.',
      'Digite piloto, passageiro, bagagem e combustível (lb ou kg).',
      'Veja o ponto nos dois envelopes e gere o PDF pelo botão de compartilhar.',
      'Confira o resultado com a aba <b>Peso e balanceamento</b> do Hangar: os dois devem dar o mesmo CG.',
    ],
    pegadinhas: ['O app conhece o modelo, não a sua matrícula: o peso vazio é sempre o da ficha de pesagem.', 'Ocupa cerca de 360 MB.'],
  },
  {
    id: 'rwb', ico: '🤖', nome: 'Robinson Weight & Balance', quem: 'HIZ LLC', para: 'O app Android que o instrutor citou ("Robson W&B" é quase certamente este). Calcula o W&B do R22 Beta II, R44 e R66.',
    plat: 'Só Android',
    preco: [['Grátis', 'Sem anúncios e sem compras (dados de site de terceiro).']],
    links: [['Android', 'https://play.google.com/store/apps/details?id=bs.robinsonwb']],
    passos: [
      'Escolha o R22 Beta II e marque os opcionais (portas, duplo comando).',
      'Digite pesos e combustível e veja os gráficos.',
      'No iPhone, use a aba <b>Peso e balanceamento</b> do Hangar: tem os mesmos dois gráficos e explica cada um.',
    ],
    pegadinhas: ['O próprio app diz "for demonstration purposes only".', 'Confirme o nome com o instrutor; a identificação é dedução pela busca.'],
  },
  {
    id: 'aeromet', ico: '🌦️', nome: 'AeroMet', quem: 'FRESAN', para: 'METAR, TAF, NOTAM, SIGMET, radar e satélite, com cores VFR/IFR.',
    plat: 'iPhone e iPad (Android ' + NC + ')',
    preco: [['Grátis', 'Com anúncios. METAR e TAF ' + NC + '.'], ['Premium', 'US$ 1,99 ou US$ 22,99 (período não informado): alertas de NOTAM e de mudança de METAR, mapas offline, cartas do DECEA no mapa.']],
    links: [['iPhone', 'https://apps.apple.com/app/id1549597697']],
    passos: [
      'Na busca, digite <b>SBCT</b> e <b>SBBI</b> e favorite. SISY não tem METAR: use os dois como referência.',
      'Abra cada um e leia o METAR (cor da categoria) e o TAF decodificado. Confira com a aba <b>Tempo</b> do Hangar.',
      'Veja os NOTAM de SISY, SBCT e SBBI para o horário do voo.',
      'Se quiser, ponha o widget com os favoritos na tela inicial.',
    ],
    pegadinhas: ['Para o briefing oficial, o grátis da REDEMET, do AISWEB e do FPL BR EFB já basta.'],
  },
];

const ROTEIRO = [
  ['🌦️', 'Tempo', 'Véspera e manhã do voo: METAR e TAF de SBCT e SBBI e NOTAM de SISY, SBCT e SBBI (AeroMet, FPL BR EFB ou a aba Tempo). Anote vento, teto, visibilidade, QNH e temperatura.'],
  ['🗺️', 'Rota', 'Monte SISY → corredores → SBBI → SISY na aba Plano de voo do Hangar e repita no NexAtlas (teste) ou no Beyond. Os dois devem dar rumos, distâncias e tempos parecidos.'],
  ['⚖️', 'Peso e balanceamento', 'Aba Peso e balanceamento do Hangar e Tool in the Cockpit, com o peso vazio do PR-HNE. O CG tem que ficar dentro nos dois gráficos, na decolagem e sem combustível.'],
  ['🗂️', 'Cartas e ROTAER', 'FPL BR EFB: confira a carta REH, as frequências e as restrições de pista de SISY e SBBI.'],
  ['📨', 'Plano de voo', 'FPL BR: copie a rota do NexAtlas ou do Beyond (ou digite a da aba Plano de voo), preencha 10, 18 e 19, valide no botão verde e envie.'],
  ['✅', 'Acompanhar', 'Espere o verde. Atrasou: DLA. Mudou: CHG. Cancelou: CNL. Antes de decolar, olhe de novo o METAR e os NOTAM.'],
];

function cartao(a) {
  return `<details class="caixa ap-app" data-ap-card="${a.id}" ${a.id === 'fplbr' ? 'open' : ''}><summary><span class="ap-ico">${a.ico}</span><span class="ap-tit"><b>${esc(a.nome)}</b><span class="sub">${esc(a.quem)} · ${a.plat}</span></span>${tenho[a.id] ? '<span class="ap-ok">✓ instalado</span>' : ''}</summary>
    <p>${a.para}</p>
    <div class="ap-precos">${a.preco.map(([t, d]) => `<div><b>${t}</b><span>${d}</span></div>`).join('')}</div>
    <h4>Passo a passo</h4><ol class="ap-passos">${a.passos.map((p) => `<li>${p}</li>`).join('')}</ol>
    ${a.pegadinhas?.length ? `<h4>Atenção</h4><ul class="ap-peg">${a.pegadinhas.map((p) => `<li>${p}</li>`).join('')}</ul>` : ''}
    <div class="linha-acao">${a.links.map(([t, u]) => `<a class="btn mini" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join('')}</div></details>`;
}
function faltam() {
  const f = APPS_VOO.filter((a) => !tenho[a.id]);
  return f.length ? `Falta instalar: <b>${f.map((a) => esc(a.nome)).join(', ')}</b>.` : '<b>Você já tem todos.</b>';
}
export function telaApps() {
  return `<div class="cab"><h2>Apps de voo</h2><span class="sub">Planejar um voo do começo ao fim</span></div>
  <p class="intro">Os apps que a escola usa: o que cada um faz, o que é grátis e o que é pago, e o passo a passo. Marque o que já está instalado no seu celular. Pesquisa feita em 26/11/2026 nas lojas e nos sites oficiais. Preços mudam: confira na loja.</p>
  <div class="caixa ap-roteiro"><h3>Roteiro de treino: SISY → corredores → SBBI → SISY</h3>
    <ol class="ap-rot">${ROTEIRO.map(([i, t, d]) => `<li><span class="ap-ico">${i}</span><span><b>${t}.</b> ${d}</span></li>`).join('')}</ol>
    <p class="sub">Hoje: peça o cadastro de piloto no FPL BR (a análise demora) e pergunte ao instrutor o nome do app Android de W&B.</p></div>
  <div class="caixa ap-tenhoc"><h3>O que já está no seu celular?</h3><div class="ap-checks">${APPS_VOO.map((a) => `<label class="ap-tenho"><input type="checkbox" data-ap-tenho="${a.id}" ${tenho[a.id] ? 'checked' : ''}> ${a.ico} ${esc(a.nome)}</label>`).join('')}</div><p class="ap-falta" id="apFalta">${faltam()}</p></div>
  <div class="ap-lista">${APPS_VOO.map(cartao).join('')}</div>
  <p class="sub">Nenhum app substitui as publicações oficiais (AIP, ROTAER, cartas, NOTAM) nem o POH. Onde aparece <span class="pv2-conf">não confirmado</span>, a fonte oficial não deixou claro.</p>`;
}
export function ligarApps(c) {
  c.addEventListener('change', (e) => {
    const i = e.target.closest('[data-ap-tenho]'); if (!i) return;
    tenho[i.dataset.apTenho] = i.checked; try { localStorage.setItem(CHAVE, JSON.stringify(tenho)); } catch {}
    const f = c.querySelector('#apFalta'); if (f) f.innerHTML = faltam();
    const s = c.querySelector(`[data-ap-card="${i.dataset.apTenho}"] .ap-ok`);
    if (s) s.hidden = !i.checked; else if (i.checked) c.querySelector(`[data-ap-card="${i.dataset.apTenho}"] summary`)?.insertAdjacentHTML('beforeend', '<span class="ap-ok">✓ instalado</span>');
  });
}
