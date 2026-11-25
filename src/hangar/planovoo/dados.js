// Dados da aba "Plano de voo" do Hangar da Turma (grupo Voo).
// Fonte principal: AIC N 34/23 "Circulação visual na Terminal Curitiba" (DECEA, em vigor desde 28/12/2023) e a carta
// CCV REH WT-Curitiba (1:100.000, AISWEB, efetiva 28 DEC 23). Coordenadas = tabela da carta (graus e minutos decimais).
// Rumos e altitudes de cada perna: lidos na carta oficial (rumo magnético da carta, declinação de 2023) e conferidos com o Anexo B da AIC.
// Frequências: AIC N 34/23 e AISWEB (consultado em 25/11/2026). Classe e órgão de cada perna seguem o Anexo B; onde a AIC dá
// duas frequências para o trecho, o ponto exato da troca é estimado (campo "estimado") e deve ser confirmado na carta e com o instrutor.

const gm = (g, m) => -(g + m / 60);   // sul e oeste negativos
// tipo: 'pos' posição/portão da REH; 'ad' aeródromo; 'vac' posição da carta VAC (fora das REH)
export const PTS = {
  sisy: { nome: 'SISY (Piraquara)', curto: 'SISY', tipo: 'ad', lat: -25.450990, lon: -49.142200, icao: 'SISY', dica: 'Base da EACAR. Pista de grama 09/27, elevação 2.895 ft. Pela carta, fica dentro da CTR Curitiba.' },
  sbct: { nome: 'SBCT (Afonso Pena)', curto: 'SBCT', tipo: 'ad', lat: -25.528500, lon: -49.175800, icao: 'SBCT', dica: 'Aeroporto internacional. Torre 118,15 · Solo 121,9 · ATIS 127,8. Helicóptero entra pelos portões Sanepar, Barro Preto ou Guatupê, com autorização da Torre.' },
  sbbi: { nome: 'SBBI (Bacacheri)', curto: 'SBBI', tipo: 'ad', lat: -25.405100, lon: -49.232000, icao: 'SBBI', dica: 'Torre Bacacheri 118,90 (das 07h às 22h locais; à noite o AFIS é prestado pelo Controle). Portões: Atuba, Igreja Santa Cândida, Parque São Lourenço e Presídio Ahu.' },
  guatupe: { nome: 'Guatupê', curto: 'Guatupê', tipo: 'vac', lat: gm(25, 30.25), lon: gm(49, 8.65), dica: 'Través do campo de futebol da Academia Militar do Guatupê. Não faz parte das REH: é posição da carta VAC do SBCT para acesso pelo setor nordeste, só com autorização da Torre Curitiba.' },
  atuba: { nome: 'Atuba', tipo: 'pos', portao: true, lat: gm(25, 23.32), lon: gm(49, 12.33), dica: 'Trevo do Atuba: BR-116 (Régis Bittencourt) com a Estrada da Ribeira. Portão do Bacacheri.' },
  graciosa: { nome: 'Estrada da Graciosa', tipo: 'pos', lat: gm(25, 23.60), lon: gm(49, 10.95), dica: 'Segue a Estrada da Graciosa até a igreja Menonita.' },
  alphaville: { nome: 'Alphaville', tipo: 'pos', lat: gm(25, 23.82), lon: gm(49, 9.67), dica: 'Lago do condomínio Alphaville. Heliponto SDRG à esquerda da rota.' },
  panoramico: { nome: 'Clube Panorâmico', tipo: 'pos', lat: gm(25, 25.27), lon: gm(49, 7.98), dica: 'Panorâmico Parque Clube: conjunto de piscinas e pesqueiros. É o ponto da REH mais perto de SISY (cerca de 1,9 NM ao norte).' },
  trevopiraquara: { nome: 'Trevo Piraquara', tipo: 'pos', lat: gm(25, 27.72), lon: gm(49, 5.33), dica: 'Trevo do Contorno Leste com o acesso a Piraquara. Daqui ao sul, a ECHO passa a ser da Torre Curitiba.' },
  pedagio: { nome: 'Pedágio BR-277', tipo: 'pos', lat: gm(25, 33.10), lon: gm(49, 2.20), dica: 'Praça de pedágio da BR-277. Encontro da ECHO com a ALFA.' },
  gamelas: { nome: 'Igreja Gamelas', tipo: 'pos', lat: gm(25, 35.67), lon: gm(49, 5.75), dica: 'Igreja de Gamelas, na ALFA.' },
  murici: { nome: 'Trevo Colônia Murici', tipo: 'pos', lat: gm(25, 35.37), lon: gm(49, 7.42), dica: 'Trevo da Colônia Murici. Heliponto SIFY à esquerda da rota.' },
  barropreto: { nome: 'Barro Preto', tipo: 'pos', portao: true, lat: gm(25, 35.00), lon: gm(49, 10.60), dica: 'Na BR-376. Portão do Afonso Pena: chamar a Torre Curitiba; circuito a 3.600 ft (VAC).' },
  sanepar: { nome: 'Sanepar', tipo: 'pos', portao: true, lat: gm(25, 33.80), lon: gm(49, 14.73), dica: 'Estação de tratamento de água da Sanepar. Portão do Afonso Pena: chamar a Torre Curitiba; circuito a 3.600 ft (VAC).' },
  garagem: { nome: 'Garagem', tipo: 'pos', lat: gm(25, 32.83), lon: gm(49, 17.37), dica: 'Garagem de ônibus do Umbará, no Contorno Sul. Heliponto SSOF à direita da rota.' },
  exercito: { nome: 'Exército', tipo: 'pos', lat: gm(25, 31.90), lon: gm(49, 18.00), dica: 'BR-116, través do quartel do Exército (campo de futebol). Encontro da ALFA com a BRAVO.' },
  taca: { nome: 'Taça', tipo: 'pos', lat: gm(25, 30.78), lon: gm(49, 17.35), dica: 'BR-116 / Linha Verde, sentido Avenida das Torres.' },
  b1: { nome: 'B1', tipo: 'pos', lat: gm(25, 28.12), lon: gm(49, 15.22), dica: 'BR-116 / Linha Verde.' },
  b2: { nome: 'B2', tipo: 'pos', lat: gm(25, 27.18), lon: gm(49, 14.58), dica: 'BR-116, até o trevo do contorno. Helipontos SJQG e SDKB à direita.' },
  b3: { nome: 'B3', tipo: 'pos', lat: gm(25, 26.53), lon: gm(49, 15.07), dica: 'Avenida das Torres, Rua Sérgio Venci, Viaduto Capanema.' },
  shopping: { nome: 'Shopping Estação', tipo: 'pos', lat: gm(25, 26.28), lon: gm(49, 16.03), dica: 'Shopping Estação. Segue a Av. Sete de Setembro até o Shopping Curitiba.' },
  b4: { nome: 'B4', tipo: 'pos', lat: gm(25, 26.80), lon: gm(49, 17.82), dica: 'Av. Desembargador Motta e Av. do Batel até a Rua Mário Tourinho. Heliponto SJAJ na rota.' },
  barigui: { nome: 'Barigui', tipo: 'pos', portao: true, lat: gm(25, 25.71), lon: gm(49, 18.76), dica: 'Parque Barigui (heliponto SSBP no parque). Encontro das REH ALFA, BRAVO, CHARLIE e DELTA.' },
  museu: { nome: 'Museu do Olho', tipo: 'pos', lat: gm(25, 24.58), lon: gm(49, 16.00), dica: 'Museu Oscar Niemeyer. Antes de seguir para o Presídio Ahu, reportar aqui para entrar no circuito do Bacacheri.' },
  presidio: { nome: 'Presídio Ahu', tipo: 'pos', portao: true, lat: gm(25, 24.30), lon: gm(49, 15.35), dica: 'Antigo Presídio do Ahu. Portão do Bacacheri: chamar a Torre Bacacheri.' },
  tingui: { nome: 'Parque Tingui', tipo: 'pos', lat: gm(25, 23.23), lon: gm(49, 18.27), dica: 'Parque Tingui (Igreja Ucraniana e estátua do índio).' },
  tangua: { nome: 'Parque Tanguá', tipo: 'pos', lat: gm(25, 22.77), lon: gm(49, 17.08), dica: 'Parque Tanguá. Depois, Ópera de Arame.' },
  saolourenco: { nome: 'Parque São Lourenço', tipo: 'pos', portao: true, lat: gm(25, 23.08), lon: gm(49, 15.98), dica: 'Lago do Parque São Lourenço. Entrada do Bacacheri pela FOXTROT: chamar a Torre Bacacheri.' },
  f1: { nome: 'F1', tipo: 'pos', lat: gm(25, 21.60), lon: gm(49, 16.88), dica: 'Fim da Rua Mateus Leme (Barreirinha), início da PR-092.' },
  f2: { nome: 'F2', tipo: 'pos', lat: gm(25, 20.33), lon: gm(49, 17.02), dica: 'PR-092 (Rodovia dos Minérios) à esquerda do piloto.' },
  tamandare: { nome: 'Tamandaré', tipo: 'pos', portao: true, lat: gm(25, 19.24), lon: gm(49, 17.96), dica: 'Lago em Almirante Tamandaré.' },
  stacandida: { nome: 'Igreja Santa Cândida', tipo: 'pos', portao: true, lat: gm(25, 22.40), lon: gm(49, 13.37), dica: 'Igreja de Santa Cândida. Portão do Bacacheri. Heliponto SSJF no início da GOLF.' },
  g1: { nome: 'G1', tipo: 'pos', lat: gm(25, 20.87), lon: gm(49, 13.27), dica: 'PR-417 (Rodovia da Uva) à esquerda.' },
  g2: { nome: 'G2', tipo: 'pos', lat: gm(25, 19.23), lon: gm(49, 13.18), dica: 'PR-417 (Rodovia da Uva) à esquerda.' },
  colombo: { nome: 'Colombo', tipo: 'pos', portao: true, lat: gm(25, 17.53), lon: gm(49, 13.37), dica: 'Igreja Matriz de Colombo, com o cemitério atrás.' },
};

// Órgãos e frequências (AIC N 34/23, Anexo B; AISWEB 25/11/2026)
export const ORGAOS = {
  fca: { nome: 'Coordenação entre aeronaves (FCA)', chamada: 'Tráfego', freq: '123,45', classe: 'G', obs: 'Espaço classe G: não há controle; avise a sua posição para os outros tráfegos.' },
  app: { nome: 'Controle Curitiba (APP-CT)', chamada: 'Controle Curitiba', freq: '129,55 ou 120,65', classe: 'D', obs: 'Frequências do APP indicadas na AIC para as REH. Na saída de SISY a escola usa 119,95: use a que o órgão ou o instrutor mandar.' },
  twrct: { nome: 'Torre Curitiba (TWR-CT)', chamada: 'Torre Curitiba', freq: '118,15', classe: 'D', obs: 'Autorização obrigatória para os portões Sanepar, Barro Preto e Guatupê.' },
  twrbi: { nome: 'Torre Bacacheri (TWR-BI)', chamada: 'Torre Bacacheri', freq: '118,90', classe: 'D', obs: 'Das 10h às 01h UTC (07h às 22h locais). Fora desse horário o AFIS é prestado pelo Controle Curitiba.' },
  sisy: { nome: 'Coordenação SISY (EACAR)', chamada: 'Coordenação', freq: '130,40', classe: 'G', obs: 'Frequência do circuito de SISY usada pela escola (roteiro de fonia da EACAR).' },
};

// Corredores (REH). Cada perna: [de, para, rumo magnético de ida, rumo de volta, altitude máxima, altitude mínima, órgão, estimado?]
// "estimado": a AIC dá dois órgãos para o trecho e a troca foi posta neste ponto pelo desenho da carta (confirmar).
export const REH = {
  ALFA: { cor: '#C2410C', pernas: [
    ['barigui', 'exercito', 194, 14, 3800, 3600, 'fca', 1], ['exercito', 'garagem', 170, 350, 3700, 3500, 'app', 1], ['garagem', 'sanepar', 132, 312, 3700, 3500, 'app'],
    ['sanepar', 'barropreto', 128, 308, 3700, 3500, 'app'], ['barropreto', 'murici', 118, 298, 3700, 3500, 'twrct'], ['murici', 'gamelas', 121, 301, 3700, 3500, 'twrct'],
    ['gamelas', 'pedagio', 72, 252, 3800, 3600, 'twrct']] },
  BRAVO: { cor: '#B45309', pernas: [
    ['exercito', 'taca', 48, 228, 3800, 3600, 'fca', 1], ['taca', 'b1', 56, 236, 3800, 3600, 'twrct', 1], ['b1', 'b2', 51, 231, 3800, 3600, 'twrct'], ['b2', 'b3', 347, 167, 3800, 3600, 'twrct'],
    ['b3', 'shopping', 307, 127, 3800, 3700, 'app', 1], ['shopping', 'b4', 272, 92, 3800, 3700, 'app'], ['b4', 'barigui', 342, 162, 3800, 3700, 'fca', 1]] },
  CHARLIE: { cor: '#7C3AED', pernas: [['barigui', 'museu', 86, 266, 3900, 3800, 'fca', 1], ['museu', 'presidio', 84, 264, 3800, 3700, 'twrbi', 1]] },
  DELTA: { cor: '#BE185D', aviso: 'Uso exclusivo de voo panorâmico, sujeito a autorização ou Carta de Acordo Operacional.', pernas: [
    ['barigui', 'tingui', 31, 211, 3800, 3600, 'fca', 1], ['tingui', 'tangua', 86, 266, 3900, 3700, 'fca', 1], ['tangua', 'museu', 172, 352, 4000, 3900, 'twrbi', 1], ['museu', 'shopping', 201, 21, 3900, 3700, 'twrbi', 1]] },
  ECHO: { cor: '#0F766E', pernas: [
    ['atuba', 'graciosa', 122, 302, 3700, 3500, 'twrbi'], ['graciosa', 'alphaville', 121, 301, 3700, 3600, 'twrbi', 1], ['alphaville', 'panoramico', 153, 333, 3700, 3600, 'app', 1],
    ['panoramico', 'trevopiraquara', 156, 336, 3700, 3500, 'app'], ['trevopiraquara', 'pedagio', 172, 352, 3800, 3600, 'twrct']] },
  FOXTROT: { cor: '#1D4ED8', pernas: [['saolourenco', 'f1', 351, 171, 3900, 3700, 'twrbi'], ['f1', 'f2', 15, 195, 3900, 3700, 'twrbi'], ['f2', 'tamandare', 342, 162, 3900, 3800, 'twrbi']] },
  GOLF: { cor: '#4D7C0F', pernas: [['stacandida', 'g1', 23, 203, 3900, 3700, 'twrbi'], ['g1', 'g2', 23, 203, 3900, 3700, 'twrbi'], ['g2', 'colombo', 15, 195, 4100, 3900, 'twrbi']] },
};

// Ligações fora das REH: saída/chegada de SISY pelo caminho mais curto até a REH (AIC 6.2) e portões dos aeródromos.
// custo extra: preferir os corredores; o cruzamento do Bacacheri só com autorização da Torre.
export const LIGACOES = [
  ['sisy', 'panoramico', 'app', 'Saída de SISY para a ECHO pelo caminho mais curto (AIC 34/23, 6.2).'],
  ['sisy', 'trevopiraquara', 'app', 'Saída de SISY para a ECHO no Trevo Piraquara.'],
  ['sisy', 'guatupe', 'app', 'De SISY ao portão Guatupê (posição da VAC do SBCT).'],
  ['guatupe', 'sbct', 'twrct', 'Portão Guatupê: ingresso no Afonso Pena pelo setor nordeste, com autorização da Torre.'],
  ['sanepar', 'sbct', 'twrct', 'Portão Sanepar: circuito do Afonso Pena a 3.600 ft (VAC).'],
  ['barropreto', 'sbct', 'twrct', 'Portão Barro Preto: circuito do Afonso Pena a 3.600 ft (VAC).'],
  ['atuba', 'sbbi', 'twrbi', 'Portão Atuba (Bacacheri). Circuito de asa fixa pelo leste a 4.000 ft.'],
  ['stacandida', 'sbbi', 'twrbi', 'Portão Igreja Santa Cândida (Bacacheri).'],
  ['saolourenco', 'sbbi', 'twrbi', 'Posição Parque São Lourenço (Bacacheri).'],
  ['presidio', 'sbbi', 'twrbi', 'Portão Presídio Ahu (Bacacheri). Reportar o Museu do Olho antes.'],
];

// Transponder (AIC 34/23, 6.6 a 6.8)
export const TRANSPONDER = [
  ['0100', 'Helicóptero decolando de local sem órgão ATS, em classe G sob a TMA, ou antes do contato com o Controle.'],
  ['0101 a 0113', 'Código próprio que o Controle Curitiba dá ao helicóptero nas REH (a escola recebe, por exemplo, 0340: vale o que o órgão mandar).'],
  ['STANDBY', 'Pousado em heliponto da CTR. Volta para NORMAL logo depois de decolar.'],
];

export const FONTES = [
  ['AIC N 34/23: Circulação visual na Terminal Curitiba (regras, portões e descrição das REH)', 'https://publicacoes.decea.mil.br/publicacao/aic-n-34-23'],
  ['Carta CCV REH WT-Curitiba (rotas de helicópteros, 1:100.000)', 'https://aisweb.decea.mil.br/cartas/visuais/reh/ccv-reh-wt-curitiba_reh_20231228.pdf'],
  ['Carta CCV REA WT-Curitiba (corredores da TMA, 1:350.000)', 'https://aisweb.decea.mil.br/cartas/visuais/rea/ccv-rea-wt-curitiba_rea_20231228.pdf'],
  ['Carta WAC Curitiba', 'https://aisweb.decea.mil.br/cartas/visuais/wac/curitiba_wac_20261029.pdf'],
  ['Todas as cartas visuais (AISWEB)', 'https://aisweb.decea.mil.br/?i=cartas&p=visuais'],
  ['ICA 100-11: Plano de voo (nova edição a partir de 26/11/2026)', 'https://publicacoes.decea.mil.br/publicacao/ica-100-11'],
  ['AIC N 31/26: modernização das normas de plano de voo', 'https://publicacoes.decea.mil.br/publicacao/aic-n-3126'],
];

export const APPS = [
  ['FPL BR', 'Aplicativo oficial do DECEA (Android e iPhone). Monta, confere, envia e atualiza o plano de voo; pede cadastro no SIGMA.', 'https://www.gov.br/pt-br/apps/fpl-br'],
  ['AISWEB', 'Site e aplicativo do DECEA: ROTAER de cada aeródromo, NOTAM, cartas, METAR e TAF. Consulta obrigatória antes do voo.', 'https://aisweb.decea.mil.br/'],
  ['REDEMET', 'Meteorologia oficial (METAR, TAF, imagens). No Hangar, a aba Tempo já mostra METAR e TAF.', 'https://redemet.decea.mil.br/'],
  ['Mapa no celular', 'O botão GPX desta aba baixa os pontos da sua rota para qualquer aplicativo de mapa ou GPS. Serve para estudar; no ar, a referência é o terreno.', ''],
];
