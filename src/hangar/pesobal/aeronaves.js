// Dados de peso e balanceamento por aeronave, para a aba "Peso e balanceamento" do Hangar.
// Cada envelope vem do manual do fabricante ou da ficha de certificação (TCDS); a fonte de cada número está ao lado.
// Para incluir outra aeronave (R44, R66...), copie um bloco, troque os números pela fonte oficial e cite a página.
//
// Convenções
// - long: braço longitudinal a partir do datum (para trás é positivo).
// - lat:  braço lateral a partir da linha de centro (direita +, esquerda −).
// - env.long.poly: pontos [CG longitudinal, peso] do envelope, em sentido horário.
// - env.lat: gráfico lateral. eixoX/eixoY dizem o que vai em cada eixo ('long', 'lat' ou 'peso').
// - itens: o que se carrega. 'kg' = a pessoa digita em quilos; o cálculo converte para a unidade da aeronave.
// - comb: tanques; a pessoa digita em litros.

export const AERONAVES = {
  r22: {
    nome: 'Robinson R22 Beta II',
    curto: 'R22 Beta II',
    familia: 'Robinson',
    un: 'lb', br: 'in', mom: 'in·lb',
    kgParaUn: 2.2,          // ficha EACAR: kg × 2,2 = lb
    dens: 0.72,             // AVGAS: L × 0,72 = kg (ficha EACAR)
    casas: 2,               // casas decimais dos braços e do CG
    pmd: 1370, pmin: 920,   // POH Seção 2 (Weight limits)
    datum: 'Datum longitudinal 100 in à frente do eixo do rotor principal; lateral na linha de centro (direita +).',
    vazioPadrao: { mat: 'PR-HNE', peso: 887.60, long: 103.69, lat: 0, momLong: 92035.12, momLat: 0, fonte: 'Ficha EACAR do PR-HNE (pesagem impressa na ficha)' },
    itens: [
      { id: 'pil', nome: 'Piloto', onde: 'assento direito', long: 78.0, lat: 10.7, lado: 'd' },
      { id: 'pax', nome: 'Passageiro / instrutor', onde: 'assento esquerdo', long: 78.0, lat: -9.3, lado: 'e' },
      { id: 'bagd', nome: 'Bagagem', onde: 'sob o assento direito', long: 78.0, lat: 10.7, lado: 'd', maxUn: 50 },
      { id: 'bage', nome: 'Bagagem', onde: 'sob o assento esquerdo', long: 78.0, lat: -9.3, lado: 'e', maxUn: 50 },
    ],
    comb: [
      { id: 'main', nome: 'Combustível', onde: 'tanque principal (esquerdo)', long: 108.6, lat: -11.0, maxL: 64 },
      { id: 'aux', nome: 'Combustível', onde: 'tanque auxiliar (direito)', long: 103.8, lat: 11.2, maxL: 36 },
    ],
    porAssentoUn: 240,      // máximo por assento, somando a bagagem daquele lado (POH Seção 2)
    env: {
      long: {
        // POH R22, Seção 2, p. 2-5 "R22 Alpha, Beta and Beta II Center of Gravity Limits" (FAA Approved 1 JUL 2005)
        poly: [[95.5, 920], [95.5, 1275], [96.5, 1370], [100.0, 1370], [102.0, 1175], [102.0, 920]],
        x: [94, 104, 1], y: [900, 1400, 100],
      },
      lat: {
        eixoX: 'long', eixoY: 'lat',
        // mesma figura do POH, gráfico de baixo (CG lateral × CG longitudinal)
        poly: [[95.5, 1.0], [98.0, 2.6], [102.0, 1.2], [102.0, -0.5], [98.0, -2.2], [97.0, -2.2], [95.5, -0.8]],
        x: [95, 103, 1], y: [-3, 3, 1],
      },
    },
    exemplo: { nome: 'Exemplo do guia EACAR', kg: { pil: 80, pax: 75, bagd: 0, bage: 2 }, L: { main: 40, aux: 15 } },
    notas: [
      'Voo solo: só do assento direito. Com as duas portas, piloto + bagagem a partir de 135 lb (61 kg) garantem o CG dentro; abaixo disso, calcule. Pode ser preciso lastro (POH Seção 2 e 6).',
      'Os tanques de 64 L e 36 L são os utilizáveis com bladder, como na ficha da EACAR. Confira nas placas da aeronave.',
      'No canto de cima à esquerda do gráfico lateral, o POH mostra +1,0 in em 95,5 in; o gráfico do guia da EACAR mostra +0,8. Aqui vale o POH.',
    ],
    fontes: 'POH R22 (Robinson, rev. fev/2024): Seção 2, limites de peso e figura 2-5; Seção 6, braços. Guia EACAR "Peso e balanceamento PR-HNE passo a passo": dados de pesagem do PR-HNE e fatores de conversão.',
  },

  as350b2: {
    nome: 'Esquilo AS350 B2',
    curto: 'AS350 B2',
    familia: 'Esquilo',
    un: 'kg', br: 'm', mom: 'kg·m',
    kgParaUn: 1, dens: 0.79, casas: 3,
    pmd: 2250, pmin: 1200,  // TCDS EASA R.008, Seção 4; 1.200 kg é o início do gráfico de CG
    datum: 'Datum longitudinal 3,40 m à frente do eixo do rotor principal; lateral no plano de simetria (direita +).',
    vazioPadrao: { mat: 'Exemplo RFM', peso: 1200, long: 3.56, lat: 0, fonte: 'Exemplo do manual de voo (RFM 6.1): troque pelos dados da ficha de pesagem da sua aeronave' },
    itens: esquiloItens(),
    comb: [{ id: 'tq', nome: 'Combustível', onde: 'tanque', long: 3.475, lat: 0, maxL: 540 }],
    env: {
      long: {
        // TCDS EASA.R.008 (Issue 19, 11/12/2025), Seção 4 AS 350 B2, item 13
        poly: [[3.17, 1200], [3.17, 2000], [3.21, 2250], [3.425, 2250], [3.49, 1750], [3.50, 1200]],
        x: [3.15, 3.55, 0.05], y: [1100, 2400, 100],
      },
      lat: {
        eixoX: 'lat', eixoY: 'peso',
        // TCDS item 13: limite lateral esquerdo 180 mm, direito 140 mm
        poly: [[-0.18, 1200], [-0.18, 2250], [0.14, 2250], [0.14, 1200]],
        x: [-0.25, 0.25, 0.05], y: [1100, 2400, 100],
      },
    },
    exemplo: esquiloExemplo(),
    notas: esquiloNotas(),
    fontes: 'TCDS EASA.R.008 AS350/EC130 (Issue 19, 11/12/2025), Seção 4 (AS 350 B2): peso máximo, envelope e limites laterais. Braços dos assentos, bagageiros e tanque: manual de voo do AS350 B3, Seções 6.2 e 6.3 (mesma célula do B2).',
  },

  as350b3: {
    nome: 'Esquilo AS350 B3 (Arriel 2B1)',
    curto: 'AS350 B3',
    familia: 'Esquilo',
    un: 'kg', br: 'm', mom: 'kg·m',
    kgParaUn: 1, dens: 0.79, casas: 3,
    pmd: 2250, pmin: 1200,
    datum: 'Datum longitudinal 3,40 m à frente do eixo do rotor principal; lateral no plano de simetria (direita +).',
    vazioPadrao: { mat: 'Exemplo RFM', peso: 1200, long: 3.56, lat: 0, fonte: 'Exemplo do manual de voo (RFM 6.1): troque pelos dados da ficha de pesagem da sua aeronave' },
    itens: esquiloItens(),
    comb: [{ id: 'tq', nome: 'Combustível', onde: 'tanque', long: 3.475, lat: 0, maxL: 540 }],
    env: {
      long: {
        // TCDS EASA.R.008, Seção 7 (AS 350 B3), item 13.2: Arriel 2B (antes das AMS 072803/072808) e Arriel 2B1
        poly: [[3.17, 1200], [3.17, 2000], [3.21, 2250], [3.425, 2250], [3.49, 1750], [3.50, 1200]],
        x: [3.15, 3.55, 0.05], y: [1100, 2400, 100],
      },
      lat: {
        eixoX: 'lat', eixoY: 'peso',
        poly: [[-0.18, 1200], [-0.18, 2250], [0.14, 2250], [0.14, 1200]],
        x: [-0.25, 0.25, 0.05], y: [1100, 2400, 100],
      },
    },
    exemplo: esquiloExemplo(),
    notas: esquiloNotas(),
    fontes: 'TCDS EASA.R.008 (Issue 19), Seção 7, item 13.2 e limites laterais; manual de voo do AS350 B3 (Seções 2.1, 6.2 e 6.3).',
  },

  h125: {
    nome: 'Esquilo H125 / AS350 B3e (Arriel 2D, mod. OP-3369)',
    curto: 'H125 (2.370 kg)',
    familia: 'Esquilo',
    un: 'kg', br: 'm', mom: 'kg·m',
    kgParaUn: 1, dens: 0.79, casas: 3,
    pmd: 2370, pmin: 1310,  // TCDS: 2.370 kg com OP-3369; gráfico do Arriel 2D começa em 1.310 kg
    datum: 'Datum longitudinal 3,40 m à frente do eixo do rotor principal; lateral no plano de simetria (direita +).',
    vazioPadrao: { mat: 'Exemplo RFM', peso: 1200, long: 3.56, lat: 0, fonte: 'Exemplo do manual de voo (RFM 6.1): troque pelos dados da ficha de pesagem da sua aeronave' },
    itens: esquiloItens(),
    comb: [{ id: 'tq', nome: 'Combustível', onde: 'tanque', long: 3.475, lat: 0, maxL: 540 }],
    env: {
      long: {
        // TCDS EASA.R.008, Seção 7, item 13.4: AS 350 B3 Arriel 2D com modificação OP-3369
        poly: [[3.17, 1310], [3.17, 2000], [3.23, 2370], [3.407, 2370], [3.49, 1750], [3.498, 1310]],
        x: [3.15, 3.55, 0.05], y: [1200, 2500, 100],
      },
      lat: {
        eixoX: 'lat', eixoY: 'peso',
        // TCDS item 13.6: 180 mm (esq.) e 140 mm (dir.) até 2.250 kg; 80 mm dos dois lados de 2.250 a 2.370 kg (OP-3369)
        poly: [[-0.18, 1310], [-0.18, 2250], [-0.08, 2250], [-0.08, 2370], [0.08, 2370], [0.08, 2250], [0.14, 2250], [0.14, 1310]],
        x: [-0.25, 0.25, 0.05], y: [1200, 2500, 100],
      },
    },
    exemplo: esquiloExemplo(),
    notas: [
      'Sem a modificação OP-3369, o peso máximo do B3 é 2.250 kg: use o perfil "AS350 B3".',
      ...esquiloNotas(),
    ],
    fontes: 'TCDS EASA.R.008 (Issue 19), Seção 7, itens 12, 13.4 e 13.6; manual de voo do AS350 B3 (Seções 6.2 e 6.3) para os braços.',
  },
};

function esquiloItens() {
  // Manual de voo AS350 B3, Seção 6.2 (longitudinal) e 6.3 (lateral). Configuração padrão: 2 assentos na frente e banco traseiro de 3 lugares.
  return [
    { id: 'pil', nome: 'Piloto', onde: 'assento dianteiro direito', long: 1.55, lat: 0.36 },
    { id: 'pfe', nome: 'Passageiro', onde: 'assento dianteiro esquerdo', long: 1.55, lat: -0.36 },
    { id: 'ptd', nome: 'Passageiro', onde: 'banco traseiro, direita', long: 2.54, lat: 0.495 },
    { id: 'ptc', nome: 'Passageiro', onde: 'banco traseiro, centro', long: 2.54, lat: 0 },
    { id: 'pte', nome: 'Passageiro', onde: 'banco traseiro, esquerda', long: 2.54, lat: -0.495 },
    { id: 'pis', nome: 'Carga no piso', onde: 'cabine traseira', long: 2.25, lat: 0, maxUn: 310 },
    { id: 'bld', nome: 'Bagageiro', onde: 'lateral direito', long: 3.20, lat: 0.56, maxUn: 100 },
    { id: 'ble', nome: 'Bagageiro', onde: 'lateral esquerdo', long: 3.20, lat: -0.56, maxUn: 120 },
    { id: 'btr', nome: 'Bagageiro', onde: 'traseiro', long: 4.60, lat: 0, maxUn: 80 },
  ];
}
function esquiloExemplo() {
  // RFM 6.1, exemplo 4.2: EEW 1.200 kg (momento 4.272), tripulação 160, passageiros 140, bagageiro lateral 50, combustível 400 kg → 1.950 kg, CG 3,295 m
  return { nome: 'Exemplo do manual de voo (RFM 6.1)', kg: { pil: 80, pfe: 80, ptd: 70, pte: 70, bld: 50 }, L: { tq: 506 } };
}
function esquiloNotas() {
  return [
    'O peso vazio e o CG vazio mudam de aeronave para aeronave (guincho, gancho, farol, corta-cabos, esqui alto). Use sempre a ficha de pesagem em vigor da matrícula.',
    'O braço lateral dos bagageiros laterais (±0,56 m) foi lido da tabela da Seção 6.3 do manual. Confira na ficha da sua aeronave.',
    'O tanque fica a 3,475 m, quase em cima do CG: queimar combustível mexe pouco o CG do Esquilo. O que mais mexe é gente no banco da frente (puxa para a frente) e carga no bagageiro traseiro (puxa para trás).',
    'Carga no guincho ou na porta é problema de CG lateral (limite direito de 140 mm). Confira quando a carga for assimétrica.',
  ];
}

export const ORDEM = ['r22', 'as350b2', 'as350b3', 'h125'];
