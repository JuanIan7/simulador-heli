// Pontos da aba Navegação visual. Coordenadas em graus decimais (sul e oeste negativos).
// fonte "levantamento": o projeto "Voo em Piraquara", feito pelo Juan Meira no Google Earth (lido em 24/11/2026).
// Pistas e helipontos: cadastro aberto da ANAC (aeródromos privados e helipontos, 24/11/2026) e base OurAirports (cabeceiras de SBBI e SBCT);
// cabeceiras de SISY, SSUL e SWYG calculadas pelo eixo visto na imagem de satélite e pelo comprimento registrado.
// "que": o que o ponto é (aparece ao passar o mouse); "raio": metade da largura da imagem de satélite, em km; "longe": fora do enquadramento inicial.
// Declinação magnética em Curitiba, aproximada para 2026 (oeste). Proa magnética = proa verdadeira + declinação.
export const DECLINACAO = 20;
export const VELOCIDADES = [60, 70, 80, 90];
export const TIPOS = { levantamento: 'Levantamento da turma', referencia: 'Referência visual', aerodromo: 'Aeródromo', heliponto: 'Heliponto' };
const LEV = 'levantamento';
export const PONTOS = [
  // aeródromos com pista
  { id: 'sisy', que: 'Aeródromo', raio: 0.9, nome: 'SISY (Piraquara)', curto: 'SISY', tipo: 'aerodromo', lat: -25.450990, lon: -49.142200, fonte: LEV,
    dica: 'Pista de grama 09/27, na divisa Pinhais–Piraquara, a sudoeste da Represa do Iraí. Elevação 882 m (2.894 ft).',
    pistas: [{ des: '09/27', m: 334, piso: 'grama', cab: [{ n: '09', lat: -25.451586, lon: -49.144341 }, { n: '27', lat: -25.450394, lon: -49.140059 }] }] },
  { id: 'clube-40', que: 'Aeródromo', raio: 0.9, nome: 'Clube dos 40 · SSUL Ultraleve Clube', curto: 'Clube dos 40', tipo: 'aerodromo', lat: -25.477600, lon: -49.154540, fonte: LEV,
    dica: 'Pista de asfalto 03/21 do Ultraleve Clube de Curitiba, a sul-sudoeste de SISY, entre galpões industriais. Elevação 890 m.',
    pistas: [{ des: '03/21', m: 535, piso: 'asfalto', cab: [{ n: '03', lat: -25.479970, lon: -49.154996 }, { n: '21', lat: -25.475230, lon: -49.154084 }] }] },
  { id: 'bonacin', que: 'Aeródromo', raio: 1.2, nome: 'Fazenda Bonacin · SWYG Graciosa', curto: 'Fazenda Bonacin', tipo: 'aerodromo', lat: -25.408515, lon: -49.046591, fonte: LEV,
    dica: 'Pista de cascalho de 1.190 m, quase norte–sul, ao lado de talhões de reflorestamento, a leste do Clube de Tiro. Elevação 914 m.',
    pistas: [{ des: '17/35', m: 1190, piso: 'cascalho', cab: [{ n: '35', lat: -25.413840, lon: -49.046024 }, { n: '17', lat: -25.403190, lon: -49.047158 }],
    }] },   // designação 17/35 conforme o cadastro da ANAC (decisão do Juan, 24/11/2026); o eixo medido no satélite dá 195°/015° M
  { id: 'sbbi', que: 'Aeródromo', raio: 1.4, nome: 'SBBI (Bacacheri)', curto: 'SBBI', tipo: 'aerodromo', lat: -25.405100, lon: -49.232000, fonte: LEV,
    dica: 'Aeroporto do Bacacheri: pista 18/36 de asfalto dentro da cidade. Espaço aéreo controlado.',
    pistas: [{ des: '18/36', m: 1390, piso: 'asfalto', cab: [{ n: '18', lat: -25.399258, lon: -49.234615 }, { n: '36', lat: -25.410872, lon: -49.229393 }] }] },
  { id: 'sbct', que: 'Aeroporto', raio: 2.6, nome: 'SBCT (Afonso Pena)', curto: 'SBCT', tipo: 'aerodromo', lat: -25.528500, lon: -49.175800,
    dica: 'Aeroporto internacional, pistas 15/33 e 11/29. Zona de controle: só com autorização.',
    pistas: [{ des: '15/33', m: 2218, piso: 'asfalto', cab: [{ n: '15', lat: -25.522095, lon: -49.182907 }, { n: '33', lat: -25.536139, lon: -49.167179 }] },
             { des: '11/29', m: 1798, piso: 'asfalto', cab: [{ n: '11', lat: -25.528292, lon: -49.180164 }, { n: '29', lat: -25.528784, lon: -49.162273 }] }] },
  // helipontos (ANAC); os dois primeiros são pontos do levantamento
  { id: 'quatro-barras', que: 'Heliponto SDEQ', raio: 0.6, nome: 'Club de Quatro Barras · heliponto SDEQ', curto: 'Quatro Barras', rot: 'esq', tipo: 'heliponto', lat: -25.376670, lon: -49.084720, fonte: LEV, fato: '05/23', dica: 'Heliponto de concreto junto ao Parque do Lago de Quatro Barras. Elevação 927 m.' },
  { id: 'colway', que: 'Heliponto SJJS', raio: 0.6, nome: 'BS Colway · heliponto SJJS', curto: 'BS Colway', tipo: 'heliponto', lat: -25.461390, lon: -49.102780, fonte: LEV, fato: '10', dica: 'Heliponto da fábrica de ônibus, entre galpões grandes, a leste-sudeste de SISY. Elevação 910 m.' },
  { id: 'sdrg', que: 'Heliponto SDRG', raio: 0.5, nome: 'Graciosa (Alphaville) · heliponto SDRG', curto: 'SDRG', rot: 'esq', tipo: 'heliponto', lat: -25.391940, lon: -49.156110, fato: '01/10', dica: 'Heliponto de grama no condomínio Alphaville Graciosa, Pinhais, a oeste da represa.' },
  { id: 'ssnm', que: 'Heliponto SSNM', raio: 0.5, nome: 'Santa Mônica · heliponto SSNM', curto: 'SSNM', tipo: 'heliponto', lat: -25.381670, lon: -49.138060, dica: 'Heliponto em Colombo, ao norte da Margem W.' },
  { id: 'snbb', que: 'Heliponto SNBB', raio: 0.5, nome: 'BMR Medical · heliponto SNBB', curto: 'SNBB', tipo: 'heliponto', lat: -25.346940, lon: -49.057220, dica: 'Heliponto de empresa em Campina Grande do Sul, perto da Enaex.' },
  { id: 'sizw', que: 'Heliponto SIZW', raio: 0.5, nome: 'Portal do Porto · heliponto SIZW', curto: 'SIZW', tipo: 'heliponto', lat: -25.514440, lon: -49.131940, dica: 'Heliponto em São José dos Pinhais, ao sul de SISY.' },
  { id: 'sjax', que: 'Heliponto SJAX', raio: 0.5, nome: 'Helisul Afonso Pena · heliponto SJAX', curto: 'SJAX', tipo: 'heliponto', lat: -25.536940, lon: -49.179170, longe: true, dica: 'Heliponto da Helisul, no sítio do Afonso Pena. Zona de controle.' },
  { id: 'sdkb', que: 'Heliponto SDKB', raio: 0.4, nome: 'CJB Curitiba · heliponto SDKB', curto: 'SDKB', tipo: 'heliponto', lat: -25.438060, lon: -49.240560, longe: true, dica: 'Heliponto em Curitiba, perto do Bacacheri.' },
  { id: 'sshy', que: 'Heliponto SSHY', raio: 0.4, nome: 'Hospital Cajuru · heliponto SSHY', curto: 'SSHY', tipo: 'heliponto', lat: -25.436390, lon: -49.245000, longe: true, dica: 'Heliponto do Hospital Universitário Cajuru, Curitiba.' },
  { id: 'snr4', que: 'Heliponto SNR4', raio: 0.4, nome: 'FIEP · heliponto SNR4', curto: 'SNR4', tipo: 'heliponto', lat: -25.448610, lon: -49.244170, longe: true, dica: 'Heliponto da FIEP, Curitiba.' },
  { id: 'sshi', que: 'Heliponto SSHI', raio: 0.4, nome: 'IURD · heliponto SSHI', curto: 'SSHI', tipo: 'heliponto', lat: -25.442220, lon: -49.261390, longe: true, dica: 'Heliponto em Curitiba.' },
  { id: 'sspr', que: 'Heliponto SSPR', raio: 0.4, nome: 'Palácio Iguaçu · heliponto SSPR', curto: 'SSPR', tipo: 'heliponto', lat: -25.412500, lon: -49.268330, longe: true, dica: 'Heliponto do Palácio Iguaçu (governo do Paraná), Curitiba.' },
  { id: 'swct', que: 'Heliponto SWCT', raio: 0.4, nome: 'Laguna Iguaçu · heliponto SWCT', curto: 'SWCT', tipo: 'heliponto', lat: -25.449170, lon: -49.288890, longe: true, dica: 'Heliponto em Curitiba.' },
  { id: 'ssbp', que: 'Heliponto SSBP', raio: 0.5, nome: 'Parque Barigui · heliponto SSBP', curto: 'SSBP', tipo: 'heliponto', lat: -25.431110, lon: -49.315280, longe: true, dica: 'Heliponto do Parque Barigui, Curitiba.' },
  { id: 'swtt', que: 'Heliponto SWTT', raio: 0.4, nome: 'Supermax · heliponto SWTT', curto: 'SWTT', tipo: 'heliponto', lat: -25.432500, lon: -49.326110, longe: true, dica: 'Heliponto em Curitiba.' },
  { id: 'ssjf', que: 'Heliponto SSJF', raio: 0.4, nome: 'Polícia Federal · heliponto SSJF', curto: 'SSJF', tipo: 'heliponto', lat: -25.376110, lon: -49.227780, longe: true, dica: 'Heliponto da Polícia Federal, Curitiba.' },
  // levantamento da turma (demais pontos)
  { id: 'margem-w', que: 'Margem da represa', raio: 0.9, nome: 'Margem W da Represa', curto: 'Margem W', rot: 'esq', tipo: 'levantamento', fonte: LEV, lat: -25.400364, lon: -49.131864, dica: 'Margem oeste da Represa do Iraí, lado de Pinhais.' },
  { id: 'margem-e', que: 'Margem da represa', raio: 0.9, nome: 'Margem E da Represa', curto: 'Margem E', tipo: 'levantamento', fonte: LEV, lat: -25.401581, lon: -49.081833, dica: 'Margem leste da Represa do Iraí, lado de Piraquara.' },
  { id: 'presidio', que: 'Presídio', raio: 0.7, nome: 'Presídio', rot: 'cima', tipo: 'levantamento', fonte: LEV, lat: -25.419608, lon: -49.075058, dica: 'Complexo penitenciário de Piraquara: muros e pavilhões grandes ao sul da margem leste.' },
  { id: 'clube-tiro', que: 'Clube de tiro', raio: 0.5, nome: 'Clube Paranaense de Tiro', curto: 'Clube de Tiro', rot: 'baixo', tipo: 'levantamento', fonte: LEV, lat: -25.418813, lon: -49.067438, dica: 'Vila Militar de Piraquara, entre o presídio e a Fazenda Bonacin.' },
  { id: 'enaex', que: 'Fábrica', raio: 0.8, nome: 'Enaex Brasil', tipo: 'levantamento', fonte: LEV, lat: -25.347938, lon: -49.047937, dica: 'Fábrica de explosivos ao lado da BR-116, em Quatro Barras. Não sobrevoar baixo.' },
  // referências acrescentadas pelo Hangar
  { id: 'irai', que: 'Represa', raio: 2.2, nome: 'Represa do Iraí (centro)', curto: 'Iraí', rot: 'baixo', tipo: 'referencia', lat: -25.40052, lon: -49.09984, dica: 'Espelho d’água grande a nordeste de SISY; a referência mais fácil da região.' },
  { id: 'autodromo', que: 'Autódromo', raio: 1.0, nome: 'Autódromo de Pinhais', curto: 'Autódromo', rot: 'esq', tipo: 'referencia', lat: -25.45033, lon: -49.1958, dica: 'Traçado da pista de corrida, a oeste de SISY.' },
  { id: 'pq-lago', que: 'Parque com lago', raio: 0.6, nome: 'Parque do Lago (Quatro Barras)', curto: 'Pq. do Lago', tipo: 'referencia', lat: -25.37442, lon: -49.0722, dica: 'Lago do parque no centro de Quatro Barras.' },
  { id: 'pq-aguas', que: 'Parque com lagos', raio: 0.6, nome: 'Parque das Águas (Piraquara)', curto: 'Pq. das Águas', tipo: 'referencia', lat: -25.44694, lon: -49.05942, dica: 'Lagos do parque na entrada de Piraquara.' },
  { id: 'piraquara1', que: 'Represa', raio: 2.0, nome: 'Represa Piraquara I (Cayuguava)', curto: 'Piraquara I', tipo: 'referencia', lat: -25.50601, lon: -49.02886, dica: 'Represa ao sul de Piraquara, no pé da serra.' },
  { id: 'morro-canal', que: 'Morro', raio: 1.5, nome: 'Morro do Canal', tipo: 'referencia', lat: -25.51517, lon: -48.98176, dica: 'Morro a sudeste de Piraquara, na borda da Serra do Mar.' },
  { id: 'marumbi', que: 'Serra', raio: 3.0, nome: 'Pico do Marumbi', curto: 'Marumbi', tipo: 'referencia', lat: -25.45339, lon: -48.94415, longe: true, dica: 'Serra do Mar a leste: o pico que se destaca (cerca de 1.500 m).' },
  { id: 'torre', que: 'Torre', raio: 0.6, nome: 'Torre Panorâmica (Curitiba)', curto: 'Torre', tipo: 'referencia', lat: -25.42419, lon: -49.2944, longe: true, dica: 'Torre de 109 m no centro de Curitiba; referência distante a oeste.' },
];
