// Parâmetros das aeronaves para o modelo de voo.
// Todos os números vêm das notas em referencias/ (POH, TCDS, folhetos oficiais).
// ✔ = oficial; ≈ = calculado; (est.) = estimativa de engenharia, usada só onde a fonte não publica o valor.
// Este é um jogo de ESTUDO. O manual que vale é o POH da aeronave da escola.

const KT = 0.514444; // 1 kt em m/s
const FT = 0.3048;   // 1 ft em m
const LB = 0.453592; // 1 lb em kg

export const AERONAVES = {
  r22: {
    id: 'r22',
    nome: 'Robinson R22 Beta II',
    curto: 'R22',
    descricao: 'Helicóptero de instrução da EACAR. Pistão, 2 lugares, rotor leve de baixa inércia.',
    fonte: 'Nota 02 (POH R22 rev. 02/2024, TCDS EASA.IM.R.120)',
    tipoMotor: 'pistao',          // pistao | turbina
    indicadorPotencia: 'MAP',     // MAP (inHg) | TQ (%)
    sentidoRotor: 'antihorario',  // visto de cima. Torque empurra o nariz para a DIREITA; pedal ESQUERDO ao subir o coletivo.
    lugares: 2,
    cores: { fuselagem: 0xf2f2f2, faixa: 0xff6a00 },
    // Massas ✔ [POH 2-3]
    pesoVazioKg: 880 * LB,            // 399 kg
    pesoMaxKg: 1370 * LB,             // 621 kg
    pesoMinKg: 920 * LB,              // 417 kg
    maxPorAssentoKg: 240 * LB,        // 109 kg
    // Combustível ✔ [POH 2-8; EOC 2026]
    combustivelL: 100,                // 64 L principal + 36 L auxiliar (utilizável)
    densidadeCombustivel: 0.72,       // kg/L (6 lb/gal)
    consumoLh: 30,                    // 8,0 gph
    // Rotor ✔ [POH 1-4, 1-6, 2-2]
    raioRotorM: 7.67 / 2,
    pasRotor: 2,
    rpmRotor100: 510,
    faixaRpmMotorOn: [101, 104],
    faixaRpmMotorOff: [90, 110],
    buzinaBaixaRpm: 97,
    avisoAltaRpm: 110,
    estolRotorBase: 80,               // % + 1% por 1000 ft de altitude [POH 4-10]
    inerciaRotor: 'baixa',            // "rotor leve, de baixa inércia" [POH 4-10]
    // Motor ✔ [POH 1-5; EASA 5.3]
    potTopW: 131 * 745.7,             // 97,7 kW (5 min)
    potMcpW: 124 * 745.7,             // 92,5 kW
    mapLimiteSL: 23.2,                // inHg a +40 °C (placa); 21,5 a −20 °C [POH 2-11]
    mapMarchaLenta: 12,               // (est.)
    governador: { ativoAcimaDe: 80 }, // % do motor [POH 7-6]
    carbHeat: true,
    // Velocidades ✔ [POH 2-1, 4-1, 3-3]
    vneKt: 102,                       // até 3000 ft DA; tabela por Hp/OAT na nota
    vneQuedaKtPor1000ft: 2.0,         // ≈ aproximação linear da placa acima de 3000 ft DA (nota 02, seção 2.6)
    vyKt: 53,
    vDecolagemKt: 60,
    vAproximacaoKt: 60,
    vAlcanceKt: 83,
    vCruzeiroKt: 95,
    vAutorotacaoKt: [60, 70],
    vPlaneioMaxKt: 75,
    planeio: 4.0,                     // 4:1 a 75 KIAS e 90 % [POH 3-3]
    descidaAutoFtMin: 1500,           // típica no treino [SN-38]
    razaoSubidaFtMin: 1000,           // > 1000 ft/min ao nível do mar (fonte secundária)
    etlKt: [12, 24],                  // faixa da sustentação translacional (est. didática: 16–24 kt)
    // Tetos ✔ [BROCH]
    tetoIgeFt: 9400,                  // a 1370 lb
    tetoOgeFt: 5000,                  // a 1370 lb
    daMaxFt: 14000,
    ventoPairadoKt: 17,
    // H-V (lido no gráfico, conferir no POH) [POH 5-11]
    hv: { altoFt: 400, joelhoKt: 50, joelhoFt: 200, baixoFt: 12, baixoKtMin: 50, altoFt7000: 700 },
    // Autorrotação ✔ [POH 3-2]
    flareFt: 40,
    nivelarFt: 8,
    // Dinâmica (est.): respostas de comando, usadas só para a jogabilidade
    din: { taxaArfagemDegS: 40, taxaRolamentoDegS: 50, taxaGuinadaDegS: 60, lagS: 0.25, placaPlanaM2: 0.75, potPerfilFrac: 0.27, kInduzido: 1.15 },
    hidraulica: false,
  },

  r44: {
    id: 'r44',
    nome: 'Robinson R44 Raven II',
    curto: 'R44',
    descricao: 'Quatro lugares, injeção, comandos hidráulicos. Usado na EACAR em alguns voos.',
    fonte: 'Nota 03 (POH R44 II, TCDS)',
    tipoMotor: 'pistao',
    indicadorPotencia: 'MAP',
    sentidoRotor: 'antihorario',
    lugares: 4,
    cores: { fuselagem: 0xf2f2f2, faixa: 0x3a3a3a },
    pesoVazioKg: 1505 * LB,
    pesoMaxKg: 2500 * LB,
    pesoMinKg: 1600 * LB,
    maxPorAssentoKg: 300 * LB,        // (conferir no POH)
    combustivelL: 176,
    densidadeCombustivel: 0.72,
    consumoLh: 57,
    raioRotorM: 10.06 / 2,
    pasRotor: 2,
    rpmRotor100: 400,
    faixaRpmMotorOn: [101, 102],
    faixaRpmMotorOff: [90, 108],
    buzinaBaixaRpm: 97,
    avisoAltaRpm: 108,
    estolRotorBase: 80,
    inerciaRotor: 'media',
    potTopW: 245 * 745.7,
    potMcpW: 205 * 745.7,
    mapLimiteSL: 24.5,                // (conferir na placa 2-9 do POH)
    mapMarchaLenta: 12,
    governador: { ativoAcimaDe: 80 },
    carbHeat: false,
    vneKt: 130,                       // ≤ 2200 lb; 120 acima
    vneQuedaKtPor1000ft: 3.0,
    vyKt: 55,
    vDecolagemKt: 60,
    vAproximacaoKt: 60,
    vAlcanceKt: 100,
    vCruzeiroKt: 109,
    vAutorotacaoKt: [60, 70],
    vPlaneioMaxKt: 90,
    planeio: 4.7,
    descidaAutoFtMin: 1350,
    razaoSubidaFtMin: 1000,
    etlKt: [12, 24],
    tetoIgeFt: 8950,
    tetoOgeFt: 4500,
    daMaxFt: 14000,
    ventoPairadoKt: 17,
    hv: { altoFt: 400, joelhoKt: 50, joelhoFt: 200, baixoFt: 12, baixoKtMin: 55, altoFt7000: 600 },
    flareFt: 40,
    nivelarFt: 8,
    din: { taxaArfagemDegS: 35, taxaRolamentoDegS: 45, taxaGuinadaDegS: 55, lagS: 0.3, placaPlanaM2: 1.0, potPerfilFrac: 0.27, kInduzido: 1.15 },
    hidraulica: true,
  },

  r66: {
    id: 'r66',
    nome: 'Robinson R66 Turbine',
    curto: 'R66',
    descricao: 'Cinco lugares, turbina RR300. Mostra o que muda da pistão para a turbina.',
    fonte: 'Nota 03 (POH R66, TCDS)',
    tipoMotor: 'turbina',
    indicadorPotencia: 'TQ',
    sentidoRotor: 'antihorario',
    lugares: 5,
    cores: { fuselagem: 0x2b2b2b, faixa: 0xff6a00 },
    pesoVazioKg: 1290 * LB,
    pesoMaxKg: 2700 * LB,
    pesoMinKg: 1400 * LB,
    maxPorAssentoKg: 300 * LB,
    combustivelL: 279,
    densidadeCombustivel: 0.80,       // Jet A (6,7 lb/gal)
    consumoLh: 83,
    raioRotorM: 10.06 / 2,
    pasRotor: 2,
    rpmRotor100: 408,
    faixaRpmMotorOn: [99, 101],
    faixaRpmMotorOff: [88, 106],
    buzinaBaixaRpm: 95,
    avisoAltaRpm: 106,
    estolRotorBase: 80,
    inerciaRotor: 'media',
    potTopW: 270 * 745.7,             // 100 % de torque
    potMcpW: 224 * 745.7,             // 83 % de torque
    governador: { ativoAcimaDe: 0, tipo: 'N2' },
    carbHeat: false,
    vneKt: 140,
    vneQuedaKtPor1000ft: 3.0,
    vyKt: 60,
    vDecolagemKt: 60,
    vAproximacaoKt: 60,
    vAlcanceKt: 100,
    vCruzeiroKt: 110,
    vAutorotacaoKt: [60, 70],
    vPlaneioMaxKt: 90,
    planeio: 5.5,
    descidaAutoFtMin: 1300,
    razaoSubidaFtMin: 1000,
    etlKt: [12, 24],
    tetoIgeFt: 11000,
    tetoOgeFt: 10000,
    daMaxFt: 14000,
    ventoPairadoKt: 17,
    hv: { altoFt: 500, joelhoKt: 55, joelhoFt: 250, baixoFt: 12, baixoKtMin: 55, altoFt7000: 700 },
    flareFt: 40,
    nivelarFt: 8,
    din: { taxaArfagemDegS: 35, taxaRolamentoDegS: 45, taxaGuinadaDegS: 55, lagS: 0.3, placaPlanaM2: 1.0, potPerfilFrac: 0.27, kInduzido: 1.15, atrasoTurbinaS: 2.0 },
    hidraulica: true,
  },

  as350b2: {
    id: 'as350b2',
    nome: 'Esquilo AS350 B2 (CBMERJ)',
    curto: 'AS350 B2',
    descricao: 'Esquilo do GOA/CBMERJ, turbina Arriel 1D1, rotor de 3 pás que gira no sentido HORÁRIO.',
    fonte: 'Nota 04 (TCDS EASA R.008, folhetos Airbus)',
    tipoMotor: 'turbina',
    indicadorPotencia: 'TQ',
    sentidoRotor: 'horario',          // visto de cima. Torque empurra o nariz para a ESQUERDA; pedal DIREITO ao subir o coletivo.
    lugares: 6,
    cores: { fuselagem: 0xd62828, faixa: 0xffffff },
    pesoVazioKg: 1225,
    pesoMaxKg: 2250,
    pesoMaxExternoKg: 2500,
    pesoMinKg: 1200,
    maxPorAssentoKg: 150,
    ganchoKg: 1160,
    combustivelL: 538,
    densidadeCombustivel: 0.79,
    consumoLh: 186,                   // 147 kg/h em cruzeiro recomendado
    raioRotorM: 10.69 / 2,
    pasRotor: 3,
    rpmRotor100: 386,
    faixaRpmMotorOn: [99.7, 102.1],   // 385–394 rpm
    faixaRpmMotorOff: [82.9, 111.4],  // 320–430 rpm (alarmes em 360 e 410 → 93 % e 106 %)
    buzinaBaixaRpm: 93.3,             // 360 rpm
    avisoAltaRpm: 106.2,              // 410 rpm
    estolRotorBase: 80,               // (est.) mesma regra didática
    inerciaRotor: 'alta',
    potTopW: 478000,                  // 100 % TQ a 386 rpm
    potMcpW: 449000,                  // 94 % TQ
    tqContinuo: 94,
    tqTransitorio: 107,
    governador: { ativoAcimaDe: 0, tipo: 'FADEC' },
    carbHeat: false,
    vneKt: 155,
    vneQuedaKtPor1000ft: 3.0,
    vneSemPotenciaKt: 125,
    vyKt: 65,
    vDecolagemKt: 65,
    vAproximacaoKt: 65,
    vAlcanceKt: 122,
    vCruzeiroKt: 122,
    vAutorotacaoKt: [60, 70],
    vPlaneioMaxKt: 65,
    planeio: 3.3,                     // ≈ 0,54 NM por 1000 ft (secundária)
    descidaAutoFtMin: 1800,
    razaoSubidaFtMin: 1675,
    etlKt: [12, 24],
    tetoIgeFt: 9850,
    tetoOgeFt: 7550,
    daMaxFt: 20000,
    ventoPairadoKt: 17,
    hv: { altoFt: 450, joelhoKt: 55, joelhoFt: 220, baixoFt: 15, baixoKtMin: 60, altoFt7000: 750 },
    flareFt: 50,
    nivelarFt: 10,
    din: { taxaArfagemDegS: 35, taxaRolamentoDegS: 45, taxaGuinadaDegS: 55, lagS: 0.3, placaPlanaM2: 1.5, potPerfilFrac: 0.28, kInduzido: 1.15, atrasoTurbinaS: 1.5 },
    hidraulica: true,
  },

  h125: {
    id: 'h125',
    nome: 'Esquilo AS350 B3 / H125 (CBMERJ)',
    curto: 'H125',
    descricao: 'Esquilo B3 com Arriel 2D (VEMD). Mesma célula do B2, mais potência em altitude e calor.',
    fonte: 'Nota 04 (TCDS EASA R.008, página Airbus H125)',
    tipoMotor: 'turbina',
    indicadorPotencia: 'TQ',
    sentidoRotor: 'horario',
    lugares: 6,
    cores: { fuselagem: 0xd62828, faixa: 0xffffff },
    pesoVazioKg: 1277,
    pesoMaxKg: 2250,
    pesoMaxExternoKg: 2800,
    pesoMinKg: 1310,
    maxPorAssentoKg: 150,
    ganchoKg: 1400,
    combustivelL: 538,
    densidadeCombustivel: 0.79,
    consumoLh: 199,                   // ≈ 157,5 kg/h a 2250 kg (B3 2B1, usado como aproximação)
    raioRotorM: 10.69 / 2,
    pasRotor: 3,
    rpmRotor100: 386,
    faixaRpmMotorOn: [97.2, 104.9],   // 375–405 rpm
    faixaRpmMotorOff: [82.9, 111.4],
    buzinaBaixaRpm: 93.3,
    avisoAltaRpm: 106.2,
    estolRotorBase: 80,
    inerciaRotor: 'alta',
    potTopW: 535000,
    potMcpW: 497000,
    tqContinuo: 92.7,
    tqTransitorio: 104,
    governador: { ativoAcimaDe: 0, tipo: 'FADEC' },
    carbHeat: false,
    vneKt: 155,
    vneQuedaKtPor1000ft: 3.0,
    vneSemPotenciaKt: 125,
    vyKt: 65,
    vDecolagemKt: 65,
    vAproximacaoKt: 65,
    vAlcanceKt: 127,
    vCruzeiroKt: 127,
    vAutorotacaoKt: [60, 70],
    vPlaneioMaxKt: 65,
    planeio: 3.3,
    descidaAutoFtMin: 1800,
    razaoSubidaFtMin: 1959,
    etlKt: [12, 24],
    tetoIgeFt: 14500,
    tetoOgeFt: 12700,
    daMaxFt: 23000,
    ventoPairadoKt: 17,
    hv: { altoFt: 450, joelhoKt: 55, joelhoFt: 220, baixoFt: 15, baixoKtMin: 60, altoFt7000: 750 },
    flareFt: 50,
    nivelarFt: 10,
    din: { taxaArfagemDegS: 35, taxaRolamentoDegS: 45, taxaGuinadaDegS: 55, lagS: 0.3, placaPlanaM2: 1.5, potPerfilFrac: 0.28, kInduzido: 1.15, atrasoTurbinaS: 1.5 },
    hidraulica: true,
  },
};

export const ORDEM_AERONAVES = ['r22', 'r44', 'r66', 'as350b2', 'h125'];
export const UN = { KT, FT, LB };
