// Banco de questões das fases de teoria (14-20). Gerado em 28/10/2026 a partir das notas em referencias/.
// Material de ESTUDO para PPH, escrito em linguagem de piloto. Não substitui as normas (ICA 100-4, ICA 100-12, MCA 100-16,
// RBAC 91, NSCA do CENIPA) nem o POH do R22. Onde a nota de referência marca "(confirmar)", a questão é conceitual.
// Formato: p = pergunta, o = 4 opções, r = índice da correta, e = explicação, f = fonte curta.

export const QUIZ_TEORIA = {
  // ───────────────────────── 14. Briefing meteorológico Go/No-Go ─────────────────────────
  14: [
    { p: "No METAR, o grupo '16008KT' informa:", o: ["Temperatura 16 °C e ponto de orvalho 8 °C","Vento de 16 kt com rajadas de 8 kt","Vento de 160° com 8 kt","Visibilidade de 1600 m e teto 800 ft"], r: 2, e: "Os três primeiros dígitos são a direção verdadeira de onde o vento sopra (160°) e os dois seguintes a intensidade (08 kt). 'G' indicaria rajada e 'VRB' direção variável.", f: "Códigos METAR (nota 01, seção 2.3)" },
    { p: "O grupo '9999' no METAR significa:", o: ["Visibilidade de 10 km ou mais","Visibilidade de 999 m","Visibilidade desconhecida","Pressão de 999 hPa"], r: 0, e: "9999 é a codificação de visibilidade igual ou superior a 10 km. Valores menores vêm em metros (ex.: 3000, 1500, 0400).", f: "Códigos METAR" },
    { p: "No METAR 'BKN005', a nuvem indica:", o: ["1 a 2 oitavos a 500 ft","3 a 4 oitavos a 5000 ft","5 a 7 oitavos a 500 ft: é o teto","8 oitavos a 50 ft"], r: 2, e: "BKN (broken) = 5 a 7 oitavos; a altura vem em centenas de pés (005 = 500 ft). Como BKN ou OVC definem teto, o teto aqui é 500 ft: abaixo do mínimo de aeródromo para helicóptero (600 ft).", f: "Códigos METAR; ICA 100-4 3.3 (nota 05, 3.5)" },
    { p: "Em espaço aéreo controlado, a visibilidade mínima para voo VFR de helicóptero (ICA 100-4) é:", o: ["5000 m","1500 m","1000 m","3000 m"], r: 3, e: "Em espaço controlado o helicóptero precisa de visibilidade ≥ 3000 m, afastamento de nuvens 1500 m na horizontal e 500 ft na vertical e referência com o solo ou a água.", f: "ICA 100-4/2021 3.1.1 (nota 05, 3.5)" },
    { p: "O afastamento mínimo de nuvens para VFR de helicóptero em espaço controlado é:", o: ["500 m na horizontal e 1500 ft na vertical","1500 m na horizontal e 500 ft na vertical","1000 m na horizontal e 1000 ft na vertical","Basta ficar fora de nuvens"], r: 1, e: "1500 m horizontal e 500 ft vertical. 'Fora de nuvens' sem distância só vale em espaço não controlado abaixo de 3000 ft de altitude ou 1000 ft de altura.", f: "ICA 100-4/2021 3.1.1 e 3.1.3" },
    { p: "Para decolar ou pousar VFR num aeródromo ou heliponto sem carta VAC, o helicóptero precisa, no mínimo, de:", o: ["Teto 300 ft e visibilidade 800 m","Teto 600 ft e visibilidade 1500 m","Teto 1000 ft e visibilidade 3000 m","Teto 1500 ft e visibilidade 5 km"], r: 1, e: "Os mínimos de aeródromo/heliponto para helicóptero são teto 600 ft e visibilidade 1500 m, ou os da carta VAC quando existir. Em rota, dentro de espaço controlado, continua valendo a visibilidade de 3000 m.", f: "ICA 100-4/2021 3.3 (nota 05, 3.5)" },
    { p: "Um SPECI é:", o: ["A previsão de aeródromo de 24 h","Um aviso de fenômeno perigoso em rota","Um informe meteorológico especial, emitido quando há mudança significativa entre dois METAR","O METAR das 00 UTC"], r: 2, e: "O SPECI tem o mesmo formato do METAR, mas sai fora de hora, quando algo muda de forma significativa (vento, visibilidade, teto, trovoada). Se chegou um SPECI, releia o briefing.", f: "Códigos METAR/SPECI (nota 01, 2.3)" },
    { p: "No TAF 'TAF SBBI 281100Z 2812/2912 ...', o grupo '2812/2912' significa:", o: ["Vento 28 kt variando até 29 kt","Válido do dia 28 às 12 UTC até o dia 29 às 12 UTC","Emitido às 28:12 e válido até 29:12","Visibilidade de 2812 m caindo para 2912 m"], r: 1, e: "O período de validade do TAF vem como dia+hora de início / dia+hora de fim, em UTC. A hora de emissão é o grupo anterior (281100Z).", f: "Códigos TAF" },
    { p: "CAVOK no METAR quer dizer:", o: ["Céu encoberto e visibilidade OK","Vento calmo e visibilidade ilimitada","Condições abaixo dos mínimos VFR","Visibilidade ≥ 10 km, sem nuvens abaixo de 5000 ft (ou da altitude mínima de setor mais alta), sem CB/TCU e sem fenômeno significativo"], r: 3, e: "CAVOK substitui os grupos de visibilidade, tempo presente e nuvens quando todos estão 'bons'. Não fala nada sobre vento: confira o grupo de vento separadamente.", f: "Códigos METAR" },
    { p: "Fora de espaço aéreo controlado, abaixo de 3000 ft de altitude ou 1000 ft de altura (o que for maior), a visibilidade mínima VFR para helicóptero é:", o: ["3000 m","1000 m, com velocidade que permita ver e evitar a tempo","5000 m","800 m"], r: 1, e: "A ICA 100-4 permite 1000 m nessa condição, desde que a velocidade permita ver e evitar obstáculos e tráfego, afastado de nuvens e com referência no solo ou na água. É a maior flexibilidade do helicóptero; use com juízo.", f: "ICA 100-4/2021 3.1.3 (nota 05, 3.5)" }
  ],

  // ───────────────────────── 15. Céu perigoso ─────────────────────────
  15: [
    { p: "Quais perigos um cumulonimbus (CB) reúne para um helicóptero leve?", o: ["Nenhum, se o voo for por baixo da nuvem","Turbulência severa, granizo, windshear, raios e gelo","Só visibilidade reduzida","Apenas chuva forte"], r: 1, e: "O CB é a nuvem de trovoada: correntes ascendentes e descendentes violentas, granizo, cortante de vento (inclusive na base, em microbursts), raios e gelo. Voar por baixo não resolve: é onde estão o windshear e a chuva forte. Desvie.", f: "Nota 01, 2.3 (trovoadas); nota 02, SN-18/SN-26" },
    { p: "O nevoeiro de radiação se forma tipicamente:", o: ["Só em regiões de montanha","Sobre o mar, com ar quente sobre água fria","Em noite de céu claro, vento fraco e ar úmido, e tende a dissipar após o nascer do sol","De dia, com vento forte"], r: 2, e: "Noite clara → o solo irradia calor e esfria → o ar junto ao solo atinge o ponto de orvalho. Vento fraco mistura só o suficiente. O sol aquece o solo e o nevoeiro levanta ou dissipa em poucas horas: às vezes basta esperar.", f: "Nota 01, 2.3 (nevoeiro)" },
    { p: "O nevoeiro de advecção se forma quando:", o: ["O ar sobe uma encosta","O solo esfria à noite","Ar quente e úmido se desloca sobre uma superfície mais fria","Chove sobre ar seco"], r: 2, e: "Advecção = deslocamento horizontal. Ar úmido e quente passa sobre superfície fria (mar, lago, solo frio) e resfria até saturar. Diferente do de radiação, pode persistir com vento e durante o dia.", f: "Nota 01, 2.3 (nevoeiro)" },
    { p: "Qual a diferença entre 'FG' e 'BR' no METAR?", o: ["FG é fumaça e BR é poeira","FG é névoa seca e BR é chuva","FG é nevoeiro (visibilidade abaixo de 1000 m) e BR é névoa úmida (visibilidade de 1000 m a 5000 m)","Não há diferença"], r: 2, e: "Os dois são gotículas de água em suspensão; a diferença é a visibilidade. FG (fog) corta o VFR de helicóptero em espaço controlado (3000 m) na certa; BR (mist) exige conferir o valor.", f: "Códigos METAR" },
    { p: "Um SIGMET é:", o: ["A previsão de aeródromo","Um aviso de fenômeno meteorológico perigoso em rota (trovoada, turbulência severa, gelo severo, cinzas vulcânicas), emitido pelo centro meteorológico de vigilância","Um informe de vento para planejamento","O relatório do piloto em voo"], r: 1, e: "SIGMET = significant meteorological information. É aviso de perigo em rota, de validade curta. Se há SIGMET de TS na sua rota, o briefing tende ao NO-GO ou ao desvio. O AIREP é o relatório do piloto.", f: "Nota 01, 2.3 (SIGMET/AIRMET/GAMET)" },
    { p: "AIRMET e GAMET servem principalmente para:", o: ["Planejamento de combustível","Decolagem e pouso em aeródromo controlado","Voos de alto nível em aerovia","Voos em baixo nível (como o VFR de helicóptero): o GAMET é previsão de área e o AIRMET avisa de fenômenos de intensidade moderada não previstos"], r: 3, e: "O GAMET é a previsão de área para voos abaixo de certo nível; o AIRMET complementa com fenômenos moderados (turbulência, gelo, vento, visibilidade) que o GAMET não previu. SIGMET fica com o severo.", f: "Nota 01, 2.3" },
    { p: "Sobre gelo no carburador do R22 (motor carburado), é correto dizer:", o: ["Pode ocorrer com temperatura ambiente bem acima de 0 °C quando o ar está úmido, e o governador pode mascarar a perda de potência","Só ocorre com temperatura abaixo de 0 °C","Só ocorre no pairado","Não existe em helicóptero"], r: 0, e: "A expansão no venturi e a evaporação da gasolina resfriam o ar no carburador bem abaixo da temperatura ambiente. Com umidade alta forma gelo mesmo em dia morno. No R22 o governador compensa a RPM e esconde o sintoma: observe a pressão de admissão e use o aquecimento conforme o POH.", f: "Nota 02, 6.3; SN-25/SN-31" },
    { p: "Turbulência mecânica é causada por:", o: ["Diferença de velocidade entre correntes de jato","Vento escoando sobre obstáculos, morros e edifícios, criando redemoinhos a sotavento","Aquecimento do solo à tarde","Chuva forte"], r: 1, e: "Vento + obstáculo = turbulência mecânica, pior quanto mais forte o vento e mais abrupto o relevo. Aproximação de heliponto elevado ou clareira a sotavento de prédios e morros merece margem. Térmica é a da tarde quente; CAT é a de ar claro em alto nível.", f: "Nota 01, 2.3 (turbulência); nota 02, SN-32" },
    { p: "Ar atmosférico estável tende a produzir:", o: ["Nuvens cumuliformes, turbulência e boa visibilidade","Granizo","Nuvens estratiformes, ar liso, chuva contínua e visibilidade ruim (névoa, nevoeiro)","Trovoadas isoladas"], r: 2, e: "Estável = o ar resiste a subir: camadas, nevoeiro, poluição presa, ar liso. Instável = convecção: cumulus, pancadas, turbulência, mas visibilidade boa fora das pancadas. Inversão de temperatura é o caso extremo de estabilidade.", f: "Nota 01, 2.3 (estabilidade)" },
    { p: "A passagem de uma frente fria costuma trazer:", o: ["Nevoeiro de radiação","Nuvens estratiformes e chuva fraca por muitas horas","Nuvens cumuliformes e CB, pancadas, vento forte com mudança de direção e queda de temperatura, em passagem relativamente rápida","Céu limpo e vento calmo"], r: 2, e: "A frente fria empurra o ar quente para cima de forma abrupta: convecção, CB, rajadas e giro do vento. Passa rápido e deixa ar mais frio e limpo. A frente quente é o contrário: estratos, chuva contínua, teto e visibilidade baixos por mais tempo.", f: "Nota 01, 2.3 (massas de ar e frentes)" }
  ],

  // ───────────────────────── 16. Altímetro ─────────────────────────
  16: [
    { p: "Com o altímetro ajustado em QNH, no solo ele indica:", o: ["A altitude-densidade","A elevação do aeródromo","Zero","A altitude-pressão"], r: 1, e: "QNH é a pressão reduzida ao nível médio do mar pela atmosfera padrão. Ajustado nele, o altímetro mostra altitude (acima do nível do mar); no solo, a elevação do aeródromo. É o ajuste normal do voo VFR abaixo da altitude de transição.", f: "Nota 01, 2.3 (altimetria)" },
    { p: "Com o altímetro ajustado em QFE, no solo ele indica:", o: ["1013 ft","A elevação do aeródromo","Zero","A altitude de transição"], r: 2, e: "QFE é a pressão no nível do aeródromo. O altímetro passa a mostrar altura sobre o aeródromo: zero no solo. Pouco usado no Brasil, mas cai na prova.", f: "Nota 01, 2.3" },
    { p: "O ajuste QNE (1013,25 hPa) é usado para:", o: ["Voar em níveis de voo (FL) acima da altitude de transição","Pousar em heliponto","Calibrar o velocímetro","Medir a altura sobre o terreno"], r: 0, e: "Com 1013,25 todas as aeronaves acima da camada de transição usam a mesma referência: o altímetro indica altitude-pressão, expressa em FL (FL045 = 4500 ft de altitude-pressão). Garante separação vertical entre aeronaves, não distância do solo.", f: "Nota 01, 2.3 e 2.5 (altimetria operacional)" },
    { p: "A frase 'de alta para baixa, cuidado embaixo' avisa que:", o: ["Voando de uma região de pressão alta para uma de pressão baixa sem reajustar o QNH, o altímetro indica MAIS do que a altitude real: você está mais baixo do que pensa","Ao descer rápido o altímetro trava","Em pressão baixa o altímetro indica menos","Deve-se voar mais alto em regiões de pressão alta"], r: 0, e: "O altímetro mede pressão. Se a pressão real cai e o ajuste fica velho, ele 'acha' que você subiu. Obstáculos ficam mais perto do que o ponteiro diz. O mesmo vale para o frio: do quente para o frio, cuidado embaixo.", f: "Nota 01, 2.3 (erros do altímetro)" },
    { p: "Uma diferença de 1 hPa na pressão corresponde, aproximadamente, a:", o: ["300 ft","30 ft","1000 ft","3 ft"], r: 1, e: "Regra prática perto do nível do mar: 1 hPa ≈ 30 ft (o valor exato é cerca de 27 ft e cresce com a altitude). 10 hPa de erro no ajuste ≈ 300 ft de erro na indicação.", f: "Nota 01, 2.3" },
    { p: "Os valores da atmosfera padrão (ISA) ao nível do mar são:", o: ["1000 hPa e 20 °C","1013,25 hPa e 15 °C, com gradiente de −2 °C por 1000 ft","1013,25 hPa e 0 °C","29,92 hPa e 15 °C"], r: 1, e: "ISA: 1013,25 hPa (29,92 inHg), 15 °C, gradiente térmico de aproximadamente 2 °C a cada 1000 ft até a tropopausa. Toda altitude-pressão e altitude-densidade parte dessa referência.", f: "Nota 01, 2.3 (ISA)" },
    { p: "Na subida, o piloto troca o ajuste QNH por QNE (1013) ao passar:", o: ["O nível de transição","O teto da CTR","A altitude de transição","3000 ft de altura, sempre"], r: 2, e: "Subindo: ao cruzar a altitude de transição (publicada na carta), passa-se para 1013 e fala-se em níveis de voo. Descendo: ao cruzar o nível de transição (informado pelo ATC), volta-se ao QNH e fala-se em altitude. Entre os dois fica a camada de transição.", f: "Nota 01, 2.3 e 2.5" },
    { p: "Voando numa massa de ar MAIS FRIA que a ISA, com QNH correto, a altitude verdadeira é:", o: ["Impossível de estimar","Igual à indicada","Menor que a indicada: o ar frio é mais denso e as 'camadas' de pressão ficam mais apertadas","Maior que a indicada"], r: 2, e: "O altímetro é calibrado para a ISA. Em ar frio a coluna de ar se contrai e cada hPa ocupa menos pés: o instrumento indica mais do que você realmente tem. Em terreno alto e frio, acrescente margem.", f: "Nota 01, 2.3 (erros meteorológicos do altímetro)" },
    { p: "Altitude-densidade alta (dia quente, aeródromo elevado) afeta o helicóptero como?", o: ["Só afeta o consumo","Não afeta aeronaves a pistão","Piora o desempenho: menos potência disponível, pior pairado, e no R22 a Vne cai conforme a placa","Melhora o pairado fora do efeito solo"], r: 2, e: "Ar rarefeito = menos massa de ar para o rotor e para o motor. Altitude-densidade = altitude-pressão corrigida pela temperatura (regra prática: cerca de 120 ft por °C acima da ISA). A placa de Vne do R22 e as cartas de pairado são em altitude-densidade.", f: "Nota 02, 2.6 e 8; nota 01, fase 6" },
    { p: "Em voo VFR de helicóptero abaixo da altitude de transição, o ajuste correto do altímetro é:", o: ["O QNH do aeródromo ou da região fornecido pelo órgão ATS/ATIS, atualizado ao longo da rota","Qualquer um, desde que não mude","O QFE do aeródromo de destino","1013,25 sempre"], r: 0, e: "Abaixo da altitude de transição voa-se em altitude, com QNH atualizado (o QNH é de cotejo obrigatório). Em navegação longa, peça o QNH das áreas que cruza: pressão muda com o tempo e com a distância.", f: "Nota 05, 1.3; nota 01, 2.5" }
  ],

  // ───────────────────────── 17. Perna de navegação ─────────────────────────
  17: [
    { p: "Rumo, proa e rota: qual definição está certa?", o: ["Rumo e proa são sempre iguais","Rumo é a direção da linha traçada na carta (origem-destino); proa é para onde o nariz aponta; rota é a trajetória realmente percorrida sobre o solo","Rota é a direção do nariz; proa é a linha no mapa","Rota é o ângulo do vento"], r: 1, e: "Com vento de través, a proa fica deslocada do rumo para compensar a deriva, e o helicóptero percorre a rota. Se proa = rumo com vento lateral, a rota sai do planejado.", f: "Nota 01, 2.4 (proa, rumo, rota, deriva)" },
    { p: "Rumo verdadeiro 090° e declinação magnética 20° W. O rumo magnético é:", o: ["090°","110°","070°","290°"], r: 1, e: "Declinação OESTE soma, LESTE subtrai (do verdadeiro para o magnético). 090 + 20 = 110°. No sudeste do Brasil a declinação é oeste e grande; leia o valor na WAC (as linhas isogônicas) e confira a data da carta.", f: "Nota 01, 2.4 (magnetismo)" },
    { p: "Deriva é:", o: ["A diferença entre norte verdadeiro e magnético","O ângulo entre a proa e a rota, causado pelo vento","A perda de altitude em curva","O erro da bússola por causa do metal da cabine"], r: 1, e: "Vento da esquerda empurra para a direita: deriva direita. Para corrigir, aponta-se a proa para o lado do vento: proa magnética = rumo magnético − deriva direita (ou + deriva esquerda). O erro da bússola é o desvio; norte verdadeiro × magnético é a declinação.", f: "Nota 01, 2.4" },
    { p: "Na WAC (escala 1:1.000.000), 1 cm medido na carta corresponde a:", o: ["1 NM","1 km","100 km","10 km"], r: 3, e: "1:1.000.000 → 1 cm = 1.000.000 cm = 10 km. Para milhas náuticas, divida por 1,852 (10 km ≈ 5,4 NM). A WAC 3263 do material é didática (vencida); para voo real, baixe a atual no AISWEB.", f: "Nota 01, 2.4 e 1.3 (WAC 3263)" },
    { p: "São 14:00 em Brasília (UTC−3). No plano de voo, a hora prevista de decolagem é:", o: ["1400","1100","2000","1700"], r: 3, e: "UTC = hora local + 3 (quando a local é UTC−3). 14:00 + 3 = 17:00 UTC, escrito 1700. Toda hora em plano de voo, METAR, TAF e NOTAM é UTC (Zulu). Atenção: cuidado com mudanças de horário de verão, se houver.", f: "Nota 01, 2.4 (fusos horários)" },
    { p: "Velocidade verdadeira 80 kt, vento de proa de 15 kt. A velocidade de solo é:", o: ["80 kt","95 kt","50 kt","65 kt"], r: 3, e: "Vento de proa tira: 80 − 15 = 65 kt. Vento de cauda soma. Com vento lateral, resolve-se o triângulo de velocidades (pé de galinha ou computador de voo). Velocidade de solo é a que entra no cálculo de tempo e combustível.", f: "Nota 01, 2.4 (influência do vento)" },
    { p: "Com o tanque principal do R22 cheio (16,9 gal utilizáveis) e consumo médio de 8 gal/h, a autonomia sem reserva é cerca de:", o: ["3 h 17 min","1 h 30 min","2 h 50 min","2 h 07 min"], r: 3, e: "16,9 ÷ 8 = 2,11 h ≈ 2 h 07 min. Com o auxiliar (26,3 gal no total) dá ≈ 3 h 17 min. Desconte a reserva regulamentar e o táxi. Lembre a SN-15: nunca voe até acender LOW FUEL (≈ 10 min de combustível).", f: "Nota 02, 2.4 (POH; cálculo da nota)" },
    { p: "Para helicóptero em voo VFR, o RBAC 91 exige combustível para chegar ao destino previsto e ainda voar:", o: ["10 minutos","1 hora","30 minutos de dia e 45 à noite","20 minutos em consumo normal de cruzeiro"], r: 3, e: "RBAC 91.151(b): destino + 20 min para helicóptero VFR (avião: +30 min dia, +45 min noite). Em IFR, helicóptero é destino + alternativa + 30 min.", f: "RBAC 91 Emenda 08, 91.151 (nota 05, 3.4)" },
    { p: "Perna de 60 NM com velocidade de solo de 90 kt. O tempo estimado em voo (TEV) é:", o: ["45 min","60 min","40 min","30 min"], r: 2, e: "t = d ÷ v = 60 ÷ 90 h = 0,667 h = 40 min. Dica: a 90 kt você faz 1,5 NM por minuto; 60 ÷ 1,5 = 40.", f: "Nota 01, 2.4 (cálculos de navegação)" },
    { p: "O 'pé de galinha' na navegação serve para:", o: ["Marcar os pontos de notificação","Calcular o consumo de combustível","Resolver graficamente o triângulo de velocidades: a partir de rumo, velocidade verdadeira e vento, achar a proa e a velocidade de solo","Converter metros em pés"], r: 2, e: "É o desenho em escala dos três vetores (vento, velocidade verdadeira na proa, velocidade de solo na rota). O computador de voo (lado do vento) faz a mesma conta. Resultado: ângulo de correção de deriva e velocidade de solo.", f: "Nota 01, 2.4 (pé de galinha, computador de voo)" }
  ],

  // ───────────────────────── 18. Espaço aéreo ─────────────────────────
  18: [
    { p: "FIR (Região de Informação de Voo) é:", o: ["Uma área proibida","O espaço ao redor de um aeródromo controlado","Um espaço aéreo de grandes dimensões onde se prestam serviço de informação de voo e de alerta, sob responsabilidade de um ACC (Centro)","O circuito de tráfego"], r: 2, e: "O Brasil é dividido em FIRs (Amazônica, Recife, Brasília, Curitiba e Atlântico), cada uma com um Centro de Controle de Área. Mesmo fora de espaço controlado você está dentro de uma FIR e tem serviço de informação e alerta.", f: "Nota 01, 2.5 (estrutura do espaço aéreo)" },
    { p: "A CTR (zona de controle) se caracteriza por:", o: ["Estender-se da superfície até um limite superior, ao redor de aeródromo(s) controlado(s), protegendo as chegadas e saídas","Existir só em aeródromos sem torre","Ser espaço aéreo não controlado","Começar acima de 3000 ft"], r: 0, e: "CTR começa no solo. Para entrar, cruzar ou sair dela em VFR é preciso autorização e contato com a Torre ou o APP. Bacacheri tem CTR; o jogo cobra o 'livrando a CTR' na saída.", f: "Nota 01, 2.5; nota 05, 2.5" },
    { p: "A TMA (área de controle terminal) difere da CTR porque:", o: ["Só serve a helicópteros","É não controlada","Começa na superfície","Tem limite inferior acima do solo e abrange a confluência das rotas de chegada e saída de um ou mais aeródromos, sob responsabilidade do APP"], r: 3, e: "A TMA é o 'funil' das aerovias para os aeródromos; não toca o solo (por baixo dela há a CTR ou espaço não controlado). O órgão é o Controle de Aproximação ('Controle Curitiba').", f: "Nota 01, 2.5" },
    { p: "ATZ (zona de tráfego de aeródromo) é:", o: ["Área perigosa","Espaço aéreo de dimensões definidas ao redor de um aeródromo, para proteção do tráfego local, em geral onde não há CTR","A pista e as taxiways","O mesmo que TMA"], r: 1, e: "A ATZ protege o circuito de aeródromos com AFIS ou coordenação local. Para operar nela, siga os procedimentos publicados e a frequência do ROTAER.", f: "Nota 01, 2.5" },
    { p: "No espaço aéreo classe A:", o: ["Só helicópteros podem voar","VFR e IFR voam sem autorização","Não há serviço de controle","Só são permitidos voos IFR; VFR é proibido"], r: 3, e: "Classe A é a mais restritiva: só IFR, todos controlados e separados. Em VFR você se preocupa com as classes abaixo dela (B a G). Classe G é o não controlado, com serviço de informação de voo apenas.", f: "Nota 01, 2.5 (classes A a G)" },
    { p: "No espaço aéreo classe G:", o: ["Só IFR","Não há serviço de controle; o piloto recebe informação de voo e alerta, e a separação é por ver e evitar","O transponder é obrigatório","Exige-se autorização ATC para VFR"], r: 1, e: "Classe G = não controlado. Você fala com o órgão para receber informações, mas ninguém separa você dos outros: ver e evitar, com os mínimos de visibilidade da ICA 100-4 para não controlado.", f: "Nota 01, 2.5" },
    { p: "Áreas P, R e D na carta significam, respectivamente:", o: ["Pouso, Reabastecimento, Descanso","Perigosa, Restrita, Proibida","Pública, Rural, Doméstica","Proibida (voo vedado), Restrita (voo sujeito a condições/horário), Perigosa (atividade perigosa; voar com atenção)"], r: 3, e: "P = proibida, nunca. R = restrita, só nas condições publicadas (NOTAM/AIP). D = perigosa, não é proibida, mas há risco (tiro, lançamento, voo militar). Confira o status no NOTAM antes de traçar a rota.", f: "Nota 01, 2.5 e fase 18" },
    { p: "Sobre cidade ou aglomeração de pessoas, o helicóptero em VFR deve manter altura mínima de:", o: ["500 ft acima do obstáculo mais alto num raio de 600 m da aeronave","200 ft sobre o solo","1000 ft acima do solo","Não há mínimo para helicóptero"], r: 0, e: "ICA 100-4: sobre cidade, 500 ft acima do obstáculo mais alto dentro de um raio de 600 m. É o número que mais cai e o mais importante para quem voa sobre o Rio. Exceções operacionais (polícia, resgate) têm regras próprias.", f: "ICA 100-4/2021 3.2 (nota 05, 3.5)" },
    { p: "Fora de cidade, a altura mínima VFR do helicóptero e a regra para presídios são:", o: ["Sem mínimo e 1000 ft","Altura que permita pouso de emergência seguro, no mínimo 200 ft; presídio não se sobrevoa abaixo de 1000 ft","500 ft e 2000 ft","100 ft e 500 ft"], r: 1, e: "Nos demais lugares: altura que permita pousar com segurança em caso de pane, nunca abaixo de 200 ft (salvo decolagem e pouso). Presídios: mínimo 1000 ft. Some a isso o diagrama H-V do R22: 200 ft e lento pode estar na zona sombreada.", f: "ICA 100-4/2021 3.2 (nota 05, 3.5); nota 02, 7" },
    { p: "Em voo VFR de cruzeiro em nível, nos níveis em que a tabela de cruzeiro se aplica, com rumo magnético entre 000° e 179° usam-se:", o: ["Níveis pares + 500 ft (ex.: 4500, 6500)","Só níveis abaixo de 3000 ft","Qualquer nível par","Níveis ímpares + 500 ft (ex.: 3500, 5500)"], r: 3, e: "Regra semicircular VFR: 000–179 → ímpar + 500 (3500, 5500, 7500); 180–359 → par + 500 (4500, 6500). Separa VFR de IFR (que usa milhares redondos) e os sentidos opostos entre si. Confira a tabela da ICA 100-12 vigente.", f: "Nota 01, 2.5 (regras do ar, níveis)" }
  ],

  // ───────────────────────── 19. Rádio e ATC ─────────────────────────
  19: [
    { p: "'Ciente' (roger) significa:", o: ["Repita","Recebi toda a transmissão; não substitui cotejo nem responde sim ou não","Sim","Entendi e vou cumprir"], r: 1, e: "Ciente só diz que você recebeu. Instruções de cotejo obrigatório devem ser repetidas; pergunta se responde com 'afirmo' ou 'negativo'; 'conforme' (wilco) é 'entendi e vou cumprir'.", f: "MCA 100-16 (nota 05, 1.3 e 1.4)" },
    { p: "Qual destes itens NÃO é de cotejo obrigatório?", o: ["Ajuste de altímetro (QNH)","Vento informado na autorização de pouso","Pista em uso","Código transponder"], r: 1, e: "Cotejo obrigatório: autorizações de rota, de entrar/pousar/decolar/cruzar/taxiar em pista, pista em uso, QNH, código SSR, nível, proa, velocidade e nível de transição. Vento é informação: repetir só entope a frequência.", f: "MCA 100-16 (nota 05, 1.3)" },
    { p: "Os códigos transponder 7500, 7600 e 7700 significam, nessa ordem:", o: ["Emergência, falha de rádio, sequestro","Interferência ilícita (sequestro), falha de comunicações, emergência","VFR, IFR, militar","Falha de rádio, sequestro, emergência"], r: 1, e: "Mnemônico: 75 'homem com faca', 76 'rádio quebrado', 77 'céu'. O ATC pode mandar 'acione 7700' ou 'acione emergência'.", f: "Nota 05, 2.12" },
    { p: "Os indicativos 'Solo', 'Controle' e 'Rádio' correspondem a:", o: ["Centro, Torre, Recalada","Torre, Centro, Delivery","Controle de solo (ground), Controle de aproximação (APP) e estação AFIS/rádio","Delivery, Torre, Centro"], r: 2, e: "Centro = ACC (center); Controle = APP; Torre = TWR; Solo = GND; Tráfego = delivery; Rádio = AFIS/estação; Recalada = homer (DF). Chamar 'Torre Bacacheri' fora do horário da Torre está errado: é 'Rádio Bacacheri'.", f: "Nota 05, 1.5 e 2" },
    { p: "A frequência VHF internacional de emergência é:", o: ["243 MHz","118,9 MHz","123,45 MHz","121,5 MHz"], r: 3, e: "121,5 MHz é a de emergência em VHF (monitorada por órgãos e por muitas aeronaves); 243 MHz é a equivalente em UHF (militar e ELT). Se não houver contato na frequência em uso, chame em 121,5.", f: "Nota 01, 2.5 (ELT 121,5/243); nota 05, 2.11" },
    { p: "No ponto de espera, pronto para sair, a frase correta é:", o: ["'Alinhando e decolando'","'Pronto para decolagem'","'Pronto para partida'","'Solicita decolagem imediata'"], r: 2, e: "'Decolagem' só se fala para autorizar ou cancelar a decolagem. O piloto diz 'pronto para partida' (ready for departure). Evita que um 'pronto para decolagem' seja confundido com autorização por outra aeronave.", f: "MCA 100-16 2020/2025 (nota 05, 1.2 e 2.4)" },
    { p: "O ATC pergunta: 'HGB, confirme que mantém 1500 pés?' A resposta correta é:", o: ["'Conforme'","'Positivo'","'Afirmo, mantendo 1500 pés, HGB'","'Ciente'"], r: 2, e: "Pergunta se responde com 'afirmo' (sim) ou 'negativo' (não), de preferência com o dado. 'Ciente' não responde pergunta; 'positivo' não é palavra-padrão; 'conforme' é para instruções.", f: "Nota 05, 1.4" },
    { p: "Sobre o plano de voo, é correto dizer:", o: ["Só é exigido para voos IFR","Deve ser apresentado ao órgão AIS antes do voo, conforme a ICA 100-11/MCA 100-11; hoje pode ser enviado pelo aplicativo FPL BR ou por telefone ao C-AIS, conforme o ROTAER","Pode ser feito por rádio depois de decolar, em qualquer caso","É dispensado para helicópteros"], r: 1, e: "O plano de voo alimenta o serviço de alerta: sem ele ninguém sabe que você sumiu. As regras de quando é obrigatório e os prazos estão na ICA 100-11 (reedição prevista para 26/11/2026): estude o texto vigente na data da prova.", f: "Nota 05, 3.1 e 3.6 (plano de voo)" },
    { p: "Quando o piloto pode abreviar o indicativo PR-HGB para 'HGB'?", o: ["Sempre, desde o primeiro contato","Nunca","Depois que o órgão ATS abreviar primeiro; no mínimo os 3 últimos caracteres","Só em emergência"], r: 2, e: "No primeiro contato vai o indicativo completo. Quando o órgão passa a chamar 'HGB', você pode usar a forma abreviada. Nunca encurte antes do órgão: outra aeronave pode ter final parecido.", f: "MCA 100-16 (nota 05, 1.3)" },
    { p: "À pergunta 'como me recebe?', a resposta 'cinco' significa:", o: ["Perfeitamente legível","Legível com dificuldade","Transmissão ilegível","Legível de vez em quando"], r: 0, e: "Escala de legibilidade: 1 ilegível; 2 legível de vez em quando; 3 legível com dificuldade; 4 legível; 5 perfeitamente legível. Responde-se com o número, não com 'alto e claro'.", f: "MCA 100-16 (palavras-padrão; nota 05, 1.4)" }
  ],

  // ───────────────────────── 20. Pós-ocorrência (SIPAER) ─────────────────────────
  20: [
    { p: "Para o SIPAER, uma ocorrência é classificada como ACIDENTE aeronáutico quando, entre outras hipóteses:", o: ["O piloto comete erro de fonia","Alguém sofre lesão grave ou morre, a aeronave sofre dano que afeta sua estrutura ou desempenho, ou a aeronave desaparece/fica inacessível","Há atraso superior a 30 minutos","Qualquer pane em voo"], r: 1, e: "Acidente = ocorrência ligada à operação da aeronave (entre a intenção de voo e o desembarque) com lesão grave/morte, dano estrutural relevante ou aeronave desaparecida. Pouso forçado com dano na célula tende a ser acidente; um toque leve de pá pode ser incidente grave.", f: "NSCA do CENIPA (nota 01, 2.5 SIPAER)" },
    { p: "Incidente aeronáutico e incidente grave diferem porque:", o: ["Incidente só ocorre no solo","Incidente grave sempre tem mortos","São o mesmo evento","O incidente afeta ou pode afetar a segurança sem chegar a acidente; o incidente grave envolve circunstâncias em que um acidente quase ocorreu"], r: 3, e: "Incidente: ocorrência que afeta ou poderia afetar a segurança da operação, sem caracterizar acidente. Incidente grave: alta probabilidade de ter virado acidente (quase colisão, pane séria, saída de pista). Todos devem ser comunicados.", f: "NSCA do CENIPA (nota 01, 2.5)" },
    { p: "O objetivo da investigação SIPAER conduzida pelo CENIPA é:", o: ["Definir a indenização do seguro","Suspender a licença do piloto","Apontar culpados para punição","Prevenir novas ocorrências, identificando fatores contribuintes; não tem finalidade de culpa ou responsabilidade"], r: 3, e: "Filosofia SIPAER: todo acidente pode e deve ser evitado; a investigação busca fatores contribuintes, não culpa. A responsabilização civil/criminal corre em outra esfera, com outras provas. Por isso colaborar com o CENIPA é seguro e obrigatório.", f: "Nota 01, 2.5 (filosofia SIPAER, CENIPA)" },
    { p: "O RELPREV é:", o: ["Um relatório voluntário e confidencial para reportar condições de risco observadas, antes que virem acidente","O diário de bordo","A notificação obrigatória de acidente","O relatório final do acidente"], r: 0, e: "RELPREV = Relatório de Prevenção. Qualquer pessoa pode preencher (sem precisar se identificar) para relatar uma situação perigosa: pista com buraco, fonia confusa, procedimento inseguro. É a ferramenta de prevenção proativa.", f: "Nota 01, 2.5 (RELPREV)" },
    { p: "O ELT (transmissor localizador de emergência) transmite em:", o: ["132,325 MHz","7700","121,5 MHz e 243 MHz (os modernos também em 406 MHz, via satélite)","118,9 MHz"], r: 2, e: "121,5 MHz (VHF) e 243 MHz (UHF) são as frequências de homing do SAR; o ELT de 406 MHz alerta o sistema de satélites com a identificação da aeronave. Após pouso forçado, confira se o ELT ativou e, se não, acione-o manualmente.", f: "Nota 01, 2.5 (ELT 121,5/243 MHz)" },
    { p: "A fase INCERFA (incerteza) é declarada pelo serviço de alerta quando, por exemplo:", o: ["Não há notícia da aeronave 30 minutos após a hora em que deveria ter comunicado ou chegado","O combustível da aeronave certamente acabou","O piloto esquece de encerrar o plano por 5 minutos","A aeronave reporta MAYDAY"], r: 0, e: "INCERFA: dúvida sobre a segurança da aeronave (sem comunicação ou sem chegada nos 30 min seguintes ao previsto). É por isso que encerrar o plano de voo ao chegar importa: evita acionar buscas por nada.", f: "Nota 01, 2.5 (serviço de alerta: INCERFA, ALERFA, DETRESFA)" },
    { p: "ALERFA e DETRESFA correspondem a:", o: ["Alerta: aeronave pousou; Perigo: aeronave decolou","Fases de voo IFR","As duas fases são anteriores à INCERFA","Alerta: apreensão quanto à segurança (as tentativas de contato falharam, ou a aeronave autorizada a pousar não pousou em 5 min); Perigo: certeza razoável de perigo grave e iminente (combustível esgotado, pouso forçado confirmado ou provável)"], r: 3, e: "Sequência: INCERFA → ALERFA → DETRESFA. Na DETRESFA o centro de coordenação SAR (SALVAERO) lança a busca e o salvamento. Um MAYDAY recebido coloca a aeronave direto em DETRESFA.", f: "Nota 01, 2.5" },
    { p: "Após um acidente, quanto aos destroços, a regra é:", o: ["Remover tudo rapidamente para liberar a área","Lavar o combustível e organizar a cabine","Preservá-los no local e não mexer, exceto para socorrer pessoas, evitar dano maior (fogo) ou liberar tráfego, até a chegada da autoridade SIPAER","Levar as peças para a oficina"], r: 2, e: "A guarda dos destroços preserva as evidências da investigação. O operador/piloto deve proteger o local e a autoridade (SERIPA/CENIPA) libera a remoção. Fotografar antes de qualquer movimentação necessária ajuda.", f: "Nota 01, 2.5 (responsabilidades, guarda dos destroços)" },
    { p: "Quem deve comunicar a ocorrência aeronáutica ao SIPAER, e quando?", o: ["O piloto em comando, o operador ou quem primeiro souber, imediatamente, ao órgão ATS/SERIPA/CENIPA mais próximo","Ninguém; o CENIPA descobre pelo radar","O fabricante, após a perícia","Só a seguradora, em 30 dias"], r: 0, e: "A notificação é imediata e obrigatória, pelo meio mais rápido (rádio, telefone). Para o aluno/piloto: avisar o órgão ATS, a escola/operador e o SERIPA da região. A notificação formal e o relato escrito vêm depois.", f: "Nota 01, 2.5 (responsabilidades do operador)" },
    { p: "No SIPAER, 'fator contribuinte' é:", o: ["A causa única do acidente","Só o erro do piloto","Qualquer condição, ato ou circunstância que, isolada ou somada a outras, contribuiu para a ocorrência: fator humano (médico/psicológico), operacional e material","A condição meteorológica"], r: 2, e: "Acidentes raramente têm causa única. A investigação lista fatores contribuintes nas três áreas (humano, operacional, material) para gerar recomendações de segurança. Essa é a lógica do 'queijo suíço'.", f: "Nota 01, 2.5 (fator contribuinte)" }
  ]
};

// Exercícios de METAR/TAF para a fase 14 (mensagens DIDÁTICAS, com código realista; não são observações reais).
// Mínimos usados na decisão: VFR heli em espaço controlado vis ≥ 3000 m, nuvens 1500 m/500 ft; aeródromo/heliponto teto 600 ft
// e vis 1500 m (ICA 100-4). Vento: a AD 95-26-04 do R22 (pilotos com pouca experiência) proíbe vento acima de 25 kt,
// rajada com diferença acima de 15 kt e turbulência moderada ou pior.
export const METAR = [
  {
    codigo: "METAR SBBI 281200Z 16008KT 9999 SCT030 22/15 Q1018=",
    aerodromo: "Bacacheri (SBBI)",
    decod: { vento: "160° / 8 kt", visibilidade: "10 km ou mais", nuvens: "esparsas (3-4 oitavos) a 3000 ft; sem teto", temperatura: "22 °C / ponto de orvalho 15 °C", qnh: "1018 hPa" },
    perguntas: [
      { p: "Qual o vento?", o: ["080° / 16 kt","160° / 8 kt","Calmo","16 kt com rajadas de 8 kt"], r: 1, e: "16008KT: direção 160°, intensidade 08 kt." },
      { p: "Há teto nesta mensagem?", o: ["Não dá para saber","Sim, 300 ft","Sim, 3000 ft","Não: SCT (3-4 oitavos) não forma teto; teto é BKN ou OVC"], r: 3, e: "Teto é a base da camada mais baixa com 5 oitavos ou mais (BKN/OVC). SCT030 é só cobertura parcial a 3000 ft." },
      { p: "Pista provável em uso com esse vento?", o: ["Qualquer uma","09","18","36"], r: 2, e: "Vento de 160° favorece a pista 18 (decolar e pousar contra o vento). Confirme no ATIS." }
    ],
    decisao: "GO",
    motivo: "Visibilidade e teto acima dos mínimos VFR de helicóptero (ICA 100-4). Vento fraco, sem rajada, sem fenômeno significativo."
  },
  {
    codigo: "METAR SBBI 280900Z 00000KT 0400 FG VV002 12/12 Q1022=",
    aerodromo: "Bacacheri (SBBI)",
    decod: { vento: "calmo", visibilidade: "400 m", nuvens: "céu obscurecido, visibilidade vertical 200 ft", temperatura: "12 °C / ponto de orvalho 12 °C (saturado)", qnh: "1022 hPa" },
    perguntas: [
      { p: "O que indica 'VV002'?", o: ["Vento variável 2 kt","Visibilidade de 2 km","Duas camadas de nuvem","Visibilidade vertical de 200 ft (céu obscurecido por nevoeiro)"], r: 3, e: "Quando o nevoeiro esconde o céu, em vez de nuvens o observador informa a visibilidade vertical, em centenas de pés." },
      { p: "Temperatura e ponto de orvalho iguais (12/12) significam:", o: ["Ar saturado: condição de nevoeiro/nuvem junto ao solo","Risco de granizo","Erro de codificação","Ar seco"], r: 0, e: "Quando T = Td a umidade relativa é 100 %. Com vento calmo e manhã fria, é o nevoeiro de radiação clássico." },
      { p: "Decisão para decolar às 09 UTC?", o: ["GO, se for só voo local","NO-GO: visibilidade 400 m e visibilidade vertical 200 ft, muito abaixo dos mínimos","GO com transponder","GO"], r: 1, e: "Mínimos de aeródromo: teto 600 ft e vis 1500 m. Aqui tem 400 m e 200 ft. Espere o sol trabalhar e peça um novo METAR/SPECI." }
    ],
    decisao: "NO-GO",
    motivo: "Nevoeiro: visibilidade 400 m e visibilidade vertical 200 ft. Abaixo dos mínimos de aeródromo (600 ft / 1500 m) e de espaço controlado (3000 m). Provável melhora após o nascer do sol: reavaliar."
  },
  {
    codigo: "METAR SBCT 281500Z 09012KT 6000 -RA BKN005 OVC012 16/15 Q1012=",
    aerodromo: "Afonso Pena (SBCT)",
    decod: { vento: "090° / 12 kt", visibilidade: "6000 m", nuvens: "5-7 oitavos a 500 ft (teto 500 ft) e encoberto a 1200 ft", temperatura: "16 °C / ponto de orvalho 15 °C", qnh: "1012 hPa", tempo: "chuva fraca (-RA)" },
    perguntas: [
      { p: "Qual o teto?", o: ["Não há teto","500 ft","6000 ft","1200 ft"], r: 1, e: "A camada BKN mais baixa define o teto: BKN005 = 500 ft." },
      { p: "O que significa '-RA'?", o: ["Sem chuva","Chuva congelante","Chuva forte","Chuva fraca"], r: 3, e: "O sinal '-' é fraco, '+' é forte, sem sinal é moderado. RA = chuva." },
      { p: "A visibilidade de 6000 m atende ao mínimo de espaço controlado?", o: ["Sim (≥ 3000 m), mas o teto reprova o voo","Não","Só à noite","Só para avião"], r: 0, e: "6000 m é mais que 3000 m, mas teto de 500 ft fica abaixo dos 600 ft exigidos no aeródromo e não permite 500 ft de afastamento vertical das nuvens com altura segura." }
    ],
    decisao: "NO-GO",
    motivo: "Teto 500 ft (BKN005), abaixo do mínimo de aeródromo de 600 ft; com 500 ft de afastamento vertical das nuvens, sobraria altura zero. Chuva fraca e T/Td próximos indicam que não melhora logo."
  },
  {
    codigo: "METAR SBRJ 281800Z 20015G32KT 8000 TSRA FEW020CB BKN025 27/23 Q1008=",
    aerodromo: "Santos Dumont (SBRJ)",
    decod: { vento: "200° / 15 kt com rajadas de 32 kt", visibilidade: "8000 m", nuvens: "poucas CB a 2000 ft; teto 2500 ft", temperatura: "27 °C / ponto de orvalho 23 °C", qnh: "1008 hPa", tempo: "trovoada com chuva (TSRA)" },
    perguntas: [
      { p: "O grupo '20015G32KT' informa:", o: ["Vento 200° / 15 kt, rajadas de 32 kt","Vento variável entre 15 e 32 kt","Rajada de 200 kt","Vento 200° / 32 kt"], r: 0, e: "G (gust) separa a intensidade média (15) da rajada (32). Diferença de 17 kt." },
      { p: "Para um piloto de R22 com pouca experiência, o vento aqui é:", o: ["Indiferente","Proibitivo: rajada com diferença acima de 15 kt (32 − 15 = 17) e vento acima de 25 kt na rajada","Aceitável","Só é problema no pairado"], r: 1, e: "A AD 95-26-04 (POH) proíbe, para pilotos com menos de 200 h de helicóptero/50 h de R22, vento de superfície acima de 25 kt e rajada com diferença acima de 15 kt." },
      { p: "O que 'FEW020CB' acrescenta ao briefing?", o: ["Nevoeiro","Nuvens cirros","Há cumulonimbus a 2000 ft: trovoada, windshear e granizo possíveis, mesmo com pouca cobertura","Nada; são poucas nuvens"], r: 2, e: "CB em qualquer quantidade é sinal de trovoada. 'FEW' fala da cobertura, não da violência." }
    ],
    decisao: "NO-GO",
    motivo: "Trovoada no aeródromo (TSRA, CB) e rajadas de 32 kt com diferença de 17 kt: acima do limite da AD 95-26-04 do R22. Visibilidade e teto até passariam; o vento e o CB reprovam."
  },
  {
    codigo: "METAR SBBI 281300Z 18006KT 1500 BR OVC008 14/13 Q1020=",
    aerodromo: "Bacacheri (SBBI)",
    decod: { vento: "180° / 6 kt", visibilidade: "1500 m", nuvens: "encoberto (8 oitavos) a 800 ft; teto 800 ft", temperatura: "14 °C / ponto de orvalho 13 °C", qnh: "1020 hPa", tempo: "névoa úmida (BR)" },
    perguntas: [
      { p: "O teto de 800 ft atende ao mínimo de aeródromo para helicóptero?", o: ["Sim, o mínimo é 600 ft","Só com VAC","Não","Só de dia"], r: 0, e: "800 ft > 600 ft. Pelo teto, o pouso e a decolagem estariam dentro do mínimo do aeródromo." },
      { p: "E a visibilidade de 1500 m, para sair em voo local dentro da CTR (espaço controlado)?", o: ["Atende, se o ATC autorizar","Não atende: em espaço controlado o helicóptero precisa de 3000 m; 1500 m é só o mínimo do aeródromo/heliponto","Atende com transponder","Atende: 1500 m é o mínimo"], r: 1, e: "São dois mínimos diferentes: 1500 m no aeródromo e 3000 m para o voo em espaço controlado. Para voar na CTR de Bacacheri, vale o 3000 m." }
    ],
    decisao: "NO-GO",
    motivo: "Visibilidade 1500 m: no limite do mínimo de aeródromo, mas abaixo dos 3000 m exigidos em espaço controlado (CTR). OVC008 com 800 ft deixa pouca margem para os 500 ft de afastamento vertical. Esperar melhora."
  },
  {
    codigo: "METAR SBJR 281400Z 12010KT CAVOK 28/18 Q1014=",
    aerodromo: "Jacarepaguá (SBJR)",
    decod: { vento: "120° / 10 kt", visibilidade: "10 km ou mais (CAVOK)", nuvens: "nenhuma significativa abaixo de 5000 ft, sem CB/TCU (CAVOK)", temperatura: "28 °C / ponto de orvalho 18 °C", qnh: "1014 hPa" },
    perguntas: [
      { p: "CAVOK dispensa conferir o quê?", o: ["Tudo","O QNH","O vento","Visibilidade, tempo presente e nuvens, que estão todos 'bons'"], r: 3, e: "CAVOK substitui os grupos de visibilidade, tempo e nuvens. O vento, a temperatura e o QNH continuam na mensagem e precisam ser lidos." },
      { p: "Com 28 °C ao nível do mar, a altitude-densidade está:", o: ["Acima da ISA (15 °C ao nível do mar): o desempenho do R22 cai um pouco","Abaixo da ISA","Irrelevante com CAVOK","Igual à ISA"], r: 0, e: "ISA+13 ao nível do mar. Regra prática: cerca de 120 ft de altitude-densidade por °C acima da ISA. Consulte as cartas de pairado do POH no verão carioca." }
    ],
    decisao: "GO",
    motivo: "CAVOK e vento de 10 kt sem rajada. Lembrar da altitude-densidade (28 °C) no planejamento de peso e pairado."
  },
  {
    codigo: "SPECI SBBI 281420Z 25020G38KT 5000 TSRA BKN015CB 20/17 Q1010=",
    aerodromo: "Bacacheri (SBBI)",
    decod: { vento: "250° / 20 kt com rajadas de 38 kt", visibilidade: "5000 m", nuvens: "5-7 oitavos de CB a 1500 ft (teto 1500 ft)", temperatura: "20 °C / ponto de orvalho 17 °C", qnh: "1010 hPa", tempo: "trovoada com chuva" },
    perguntas: [
      { p: "Por que este informe é um SPECI e não um METAR?", o: ["Porque houve mudança significativa (trovoada, vento, teto) entre os METAR horários","Porque é das 14:20","Porque o QNH mudou","Porque é de helicóptero"], r: 0, e: "SPECI sai fora do horário quando algo muda de forma significativa. Às 12 UTC o mesmo aeródromo tinha vento calmo e nuvens esparsas." },
      { p: "Se você já estivesse no ar, no circuito, o que fazer?", o: ["Avaliar pouso imediato no local mais seguro ou afastamento da célula, evitando a área sob o CB (windshear, microburst, granizo)","Subir para FL100","Continuar para o pouso na pista 18 com vento de 250°","Pousar na pista 36"], r: 0, e: "Trovoada no aeródromo é o pior lugar para estar. O helicóptero tem a vantagem de pousar em qualquer lugar seguro: use-a antes que a célula chegue." }
    ],
    decisao: "NO-GO",
    motivo: "Trovoada no aeródromo (TSRA, BKN015CB) e rajadas de 38 kt com diferença de 18 kt: proibitivo pela AD 95-26-04 do R22 e perigoso para qualquer aeronave leve."
  },
  {
    codigo: "METAR SBGL 281600Z VRB03KT 4000 HZ FEW025 BKN100 29/14 Q1013=",
    aerodromo: "Galeão (SBGL)",
    decod: { vento: "variável / 3 kt", visibilidade: "4000 m", nuvens: "poucas a 2500 ft; teto 10 000 ft", temperatura: "29 °C / ponto de orvalho 14 °C", qnh: "1013 hPa", tempo: "névoa seca (HZ)" },
    perguntas: [
      { p: "'HZ' significa:", o: ["Granizo","Fumaça","Névoa seca (poeira/poluição em suspensão)","Nevoeiro"], r: 2, e: "HZ (haze) é litometeoro: partículas secas. FU é fumaça, FG nevoeiro, BR névoa úmida. Com T/Td distantes (29/14) não é umidade." },
      { p: "A visibilidade de 4000 m atende ao voo VFR de helicóptero em espaço controlado?", o: ["Sim: 4000 m ≥ 3000 m, mas é visibilidade reduzida e exige atenção à referência visual","Só para avião","Só com ATIS","Não, precisa de 5000 m"], r: 0, e: "Atende, com margem pequena. Névoa seca costuma piorar contra o sol baixo: planeje a rota e o horário com isso em mente." }
    ],
    decisao: "GO",
    motivo: "Visibilidade 4000 m (acima dos 3000 m), teto alto, vento fraco. GO com cautela: névoa seca reduz contraste do horizonte, especialmente contra o sol."
  },
  {
    codigo: "TAF SBBI 281100Z 2812/2912 15008KT 9999 SCT030 TX24/2818Z TN14/2909Z BECMG 2822/2824 VRB02KT 3000 BR BKN006 TEMPO 2906/2909 0800 FG VV002=",
    aerodromo: "Bacacheri (SBBI), previsão",
    decod: { validade: "dia 28 às 12 UTC até dia 29 às 12 UTC", previsao_base: "vento 150° / 8 kt, visibilidade ≥ 10 km, esparsas a 3000 ft", temperaturas: "máxima 24 °C às 18 UTC do dia 28; mínima 14 °C às 09 UTC do dia 29", mudanca: "BECMG entre 22 e 24 UTC: vento variável 2 kt, visibilidade 3000 m, névoa úmida, teto 600 ft", temporario: "TEMPO entre 06 e 09 UTC do dia 29: visibilidade 800 m, nevoeiro, visibilidade vertical 200 ft" },
    perguntas: [
      { p: "Para um voo local das 13 às 15 UTC do dia 28, a previsão é:", o: ["NO-GO por causa do nevoeiro","GO: no período vale a previsão base (vento 8 kt, 9999, SCT030)","GO só até as 12 UTC","Impossível saber"], r: 1, e: "O BECMG só começa às 22 UTC e o TEMPO é na madrugada do dia 29. Entre 13 e 15 UTC a previsão é a base." },
      { p: "O que 'BECMG 2822/2824' indica?", o: ["Mudança permanente que se completa gradualmente entre 22 e 24 UTC do dia 28","Mudança temporária entre 22 e 24 UTC","Vento de 22 a 24 kt","Chuva às 22 UTC"], r: 0, e: "BECMG (becoming) é mudança definitiva, que acontece em algum momento do intervalo. TEMPO é flutuação temporária, com duração menor que a metade do período." },
      { p: "Uma decolagem às 07 UTC do dia 29 (04:00 local) seria:", o: ["GO em heliponto","GO","NO-GO provável: TEMPO com nevoeiro, visibilidade 800 m e VV002; além disso é noite","GO se o TAF estiver certo"], r: 2, e: "Entre 06 e 09 UTC a previsão admite nevoeiro com 800 m, abaixo de qualquer mínimo. E VFR noturno de helicóptero tem exigências próprias (ICA 100-4 3.4.3)." }
    ],
    decisao: "GO",
    motivo: "GO para o voo local planejado das 13 às 15 UTC do dia 28 (previsão base acima dos mínimos). A noite e a manhã seguinte são NO-GO prováveis: névoa a partir das 22 UTC e nevoeiro entre 06 e 09 UTC."
  },
  {
    codigo: "TAF SBCT 281500Z 2818/2918 27015G28KT 8000 SHRA BKN020 FEW025CB TEMPO 2818/2823 3000 TSRA BKN012CB BECMG 2900/2903 24008KT 9999 NSW SCT030=",
    aerodromo: "Afonso Pena (SBCT), previsão",
    decod: { validade: "dia 28 às 18 UTC até dia 29 às 18 UTC", previsao_base: "vento 270° / 15 kt com rajadas de 28 kt, visibilidade 8000 m, pancadas de chuva, teto 2000 ft, poucos CB a 2500 ft", temporario: "TEMPO entre 18 e 23 UTC do dia 28: visibilidade 3000 m, trovoada com chuva, teto 1200 ft com CB", mudanca: "BECMG entre 00 e 03 UTC do dia 29: vento 240° / 8 kt, visibilidade ≥ 10 km, sem fenômeno significativo (NSW), esparsas a 3000 ft" },
    perguntas: [
      { p: "'NSW' na parte BECMG significa:", o: ["Sem fenômeno significativo (o tempo presente anterior acaba)","Neve","Vento de noroeste","Nova camada de nuvens"], r: 0, e: "NSW = no significant weather. Indica que as pancadas e trovoadas previstas antes não se aplicam mais depois da mudança." },
      { p: "Uma navegação chegando a Afonso Pena às 20 UTC do dia 28 é:", o: ["GO se o vento for de proa","NO-GO: rajadas de 28 kt (diferença de 13 kt, perto do limite) com TEMPO de trovoada e CB no aeródromo; além disso, treinamento em SBCT exige coordenação prévia com o APP","GO","GO com plano IFR"], r: 1, e: "TSRA e CB na janela TEMPO reprovam. O ROTAER de SBCT ainda exige coordenação com o APP-CT com 1 h de antecedência para voo de treinamento." },
      { p: "E uma decolagem de SBCT às 12 UTC do dia 29?", o: ["NO-GO pelo TEMPO","GO só com SPECI","GO: após o BECMG das 00-03 UTC, vento 8 kt, 9999, SCT030","Impossível saber"], r: 2, e: "Após o BECMG a previsão é boa e permanente até o fim da validade. Confirme com o METAR da hora antes de sair." }
    ],
    decisao: "NO-GO",
    motivo: "NO-GO para a chegada prevista na noite do dia 28: trovoada (TEMPO TSRA, CB), rajadas de 28 kt. A partir da madrugada do dia 29 (BECMG) a previsão fica boa: reprogramar para a manhã."
  }
];

// Exercícios de altímetro (fase 16). Regra prática: 1 hPa ≈ 30 ft; ISA 1013,25 hPa / 15 °C / −2 °C por 1000 ft;
// altitude-densidade ≈ altitude-pressão + 120 ft por °C acima da ISA (aproximação didática).
export const ALTIMETRO = [
  { enunciado: "Aeródromo com elevação de 3000 ft, QNH 1018. Com o altímetro ajustado em 1018, o que ele indica no solo?", resposta: "3000 ft", opcoes: ["0 ft","3150 ft","2850 ft","3000 ft"], r: 3, e: "Ajustado em QNH, o altímetro indica altitude (acima do nível médio do mar). No solo, mostra a elevação do aeródromo." },
  { enunciado: "Mesmo aeródromo (elevação 3000 ft). Se o piloto ajustar o QFE, o altímetro indica no solo:", resposta: "0 ft", opcoes: ["1013 ft","−3000 ft","3000 ft","0 ft"], r: 3, e: "QFE é a pressão no nível do aeródromo; o altímetro passa a indicar altura sobre o aeródromo: zero no solo." },
  { enunciado: "Você voa a 5500 ft indicados com o altímetro em QNH 1023. Entra numa região onde o QNH real é 1013 e esquece de reajustar. Sua altitude verdadeira aproximada é:", resposta: "5200 ft", opcoes: ["5800 ft","4900 ft","5200 ft","5500 ft"], r: 2, e: "Diferença de 10 hPa ≈ 300 ft. Indo de pressão alta para baixa sem ajustar, o altímetro indica MAIS que o real: 5500 − 300 = 5200 ft. 'De alta para baixa, cuidado embaixo.'" },
  { enunciado: "Aeródromo com elevação 2000 ft e QNH 1003. Qual a altitude-pressão (altímetro em 1013)?", resposta: "2300 ft", opcoes: ["1700 ft","2600 ft","2000 ft","2300 ft"], r: 3, e: "Altitude-pressão = elevação + (1013 − QNH) × 30 = 2000 + 10 × 30 = 2300 ft. QNH abaixo do padrão → altitude-pressão maior que a elevação (ar 'mais fino')." },
  { enunciado: "Qual a temperatura ISA a 5000 ft?", resposta: "5 °C", opcoes: ["15 °C","10 °C","5 °C","0 °C"], r: 2, e: "ISA ao nível do mar = 15 °C, caindo 2 °C por 1000 ft: 15 − (2 × 5) = 5 °C." },
  { enunciado: "A 4000 ft o termômetro externo marca 17 °C. O desvio em relação à ISA é:", resposta: "ISA + 10", opcoes: ["ISA","ISA + 5","ISA − 10","ISA + 10"], r: 3, e: "ISA a 4000 ft = 15 − 8 = 7 °C. 17 − 7 = +10 → ISA + 10. Ar mais quente que o padrão: altitude-densidade maior que a altitude-pressão." },
  { enunciado: "Altitude-pressão de 3000 ft e temperatura de 29 °C. Altitude-densidade aproximada (regra dos 120 ft por °C)?", resposta: "≈ 5400 ft", opcoes: ["≈ 3000 ft","≈ 6600 ft","≈ 5400 ft","≈ 4200 ft"], r: 2, e: "ISA a 3000 ft = 9 °C; desvio = 29 − 9 = +20 °C; 20 × 120 = 2400 ft. Altitude-densidade ≈ 3000 + 2400 = 5400 ft. É esse valor que entra nas cartas de pairado e na placa de Vne do R22." },
  { enunciado: "No solo de um aeródromo com elevação de 3000 ft, o altímetro ajustado em 1013 indica 2700 ft. Qual o QNH?", resposta: "1023 hPa", opcoes: ["1033 hPa","1023 hPa","1013 hPa","1003 hPa"], r: 1, e: "Indica 300 ft a menos que a elevação → faltam 10 hPa no ajuste: 1013 + 10 = 1023. Prova: ajustando 1023 o ponteiro sobe 300 ft e marca 3000 ft." },
  { enunciado: "Em cruzeiro no FL055 (altímetro em 1013), você vai descer para pousar em Bacacheri, QNH 1020. Quando trocar o ajuste para 1020?", resposta: "Ao passar o nível de transição informado pelo ATC, na descida", opcoes: ["Ao passar o nível de transição informado pelo ATC, na descida","Ao passar a altitude de transição","Imediatamente, ainda no FL055","Só na final"], r: 0, e: "Descendo: QNE → QNH ao cruzar o nível de transição. Subindo: QNH → QNE ao cruzar a altitude de transição. O QNH 1020 é de cotejo obrigatório." }
];

// Exercícios de navegação (fase 17), com conta. R22: consumo médio 8 gal/h (≈ 30 L/h); tanque principal 16,9 gal utilizáveis;
// principal + auxiliar 26,3 gal (nota 02, POH). Reserva VFR helicóptero: +20 min (RBAC 91.151). WAC 1:1.000.000. Brasília UTC−3.
// Declinação magnética: valores hipotéticos para treino; no voo real, ler na carta.
export const NAVEGACAO = [
  { enunciado: "Perna de 60 NM a 80 kt de velocidade de solo. Tempo de voo?", opcoes: ["75 min","60 min","30 min","45 min"], r: 3, e: "t = d / v = 60/80 h = 0,75 h = 45 min." },
  { enunciado: "Voo de 1 h 30 min no R22 a 8 gal/h. Quanto combustível é consumido?", opcoes: ["8 gal","10 gal","16 gal","12 gal"], r: 3, e: "1,5 h × 8 gal/h = 12 gal (≈ 45 L). Compare com os 16,9 gal utilizáveis do tanque principal: sobra pouco para a reserva." },
  { enunciado: "Tanque principal cheio (16,9 gal utilizáveis), 8 gal/h. Autonomia total, sem reserva?", opcoes: ["1 h 47 min","3 h 17 min","2 h 30 min","2 h 07 min"], r: 3, e: "16,9 / 8 = 2,11 h = 2 h 07 min. Com o auxiliar (26,3 gal) seriam 3 h 17 min." },
  { enunciado: "Com os mesmos 16,9 gal, descontando a reserva regulamentar de 20 min do helicóptero VFR, quanto tempo sobra para a navegação?", opcoes: ["1 h 47 min","1 h 27 min","2 h 27 min","2 h 07 min"], r: 0, e: "2 h 07 min − 20 min = 1 h 47 min. Na prática, desconte ainda o táxi, o run-up e uma margem pessoal: planeje bem menos." },
  { enunciado: "Velocidade verdadeira 80 kt, vento de proa de 15 kt. Perna de 65 NM. Tempo de voo?", opcoes: ["49 min","55 min","65 min","60 min"], r: 3, e: "Velocidade de solo = 80 − 15 = 65 kt. t = 65 / 65 = 1 h = 60 min. Vento de proa custa tempo e combustível." },
  { enunciado: "Velocidade verdadeira 80 kt, vento de cauda de 20 kt. Perna de 50 NM. Tempo de voo?", opcoes: ["30 min","37 min","25 min","40 min"], r: 0, e: "Velocidade de solo = 80 + 20 = 100 kt. t = 50 / 100 h = 0,5 h = 30 min." },
  { enunciado: "Rumo verdadeiro 090°, declinação magnética 20° W (hipotética). Rumo magnético?", opcoes: ["090°","070°","290°","110°"], r: 3, e: "Declinação oeste SOMA, leste SUBTRAI (do verdadeiro para o magnético): 090 + 20 = 110°." },
  { enunciado: "Rumo magnético 110°, deriva calculada de 8° para a direita (vento da esquerda). Proa magnética a manter?", opcoes: ["126°","102°","118°","110°"], r: 1, e: "Para anular a deriva direita, aponta-se o nariz para a esquerda: PM = RM − deriva direita = 110 − 8 = 102°. (Deriva esquerda somaria.)" },
  { enunciado: "Na WAC (1:1.000.000) a perna mede 25 cm. Distância em NM?", opcoes: ["25 NM","135 NM","463 NM","250 NM"], r: 1, e: "1 cm = 10 km → 25 cm = 250 km. 250 / 1,852 ≈ 135 NM." },
  { enunciado: "Decolagem prevista às 14:30 hora de Brasília (UTC−3). Hora a escrever no plano de voo?", opcoes: ["1430","1130","2030","1730"], r: 3, e: "UTC = local + 3 → 17:30 → '1730'. Toda hora de plano de voo, METAR e TAF é UTC." },
  { enunciado: "Navegação de 50 min de voo no R22 (8 gal/h). Combustível mínimo regulamentar (destino + 20 min), sem contar táxi e não utilizável?", opcoes: ["8,0 gal","6,7 gal","9,3 gal","12,0 gal"], r: 2, e: "(50 + 20) min = 70 min = 1,167 h × 8 = 9,33 gal ≈ 9,3 gal (≈ 35 L). Some o táxi, o run-up e a sua margem pessoal." },
  { enunciado: "Perna de 120 NM com velocidade de solo de 90 kt. Tempo e consumo a 8 gal/h?", opcoes: ["1 h 20 min e 10,7 gal","2 h 00 min e 16 gal","1 h 30 min e 12 gal","1 h 00 min e 8 gal"], r: 0, e: "t = 120 / 90 = 1,333 h = 1 h 20 min. Consumo = 1,333 × 8 = 10,7 gal. Com reserva de 20 min, o total passa de 13 gal: cabe no principal só com margem apertada; considere pouso intermediário ou o auxiliar." }
];

// Sequência SIPAER (fase 20): ordem certa das ações após pouso forçado. "passos_certos" está na ordem correta;
// "distratores" são ações erradas para misturar na tela.
export const SIPAER_ORDEM = [
  {
    titulo: "Pouso forçado em área de mata, todos ilesos",
    passos_certos: [
      "Completar o corte conforme o POH (combustível, elétrica, rotor parado) e afastar as pessoas da aeronave se houver risco de fogo",
      "Verificar se o ELT ativou (121,5/243 MHz); se não, acioná-lo manualmente",
      "Comunicar o órgão ATS ou outra aeronave (rádio em 121,5, celular): posição, pessoas a bordo, estado da aeronave e dos ocupantes",
      "Preservar os destroços: não mexer, não remover peças, não 'arrumar' a cabine (guarda dos destroços)",
      "Avisar o operador/escola e o SERIPA da região; registrar o que lembrar (hora, condições, fotos sem mover nada)",
      "Permanecer perto da aeronave, visível, para facilitar a localização pela equipe SAR"
    ],
    distratores: [
      "Remover as peças danificadas para 'facilitar a investigação' do CENIPA",
      "Postar as fotos do helicóptero nas redes sociais antes de comunicar o órgão ATS",
      "Desligar o ELT para economizar bateria e sair andando pela mata procurando a estrada"
    ],
    e: "Prioridade: vida (fogo, pessoas), depois comunicação (ELT e rádio ativam o serviço de alerta e evitam a DETRESFA sem posição conhecida), depois preservação das evidências. Sair do local dificulta a busca; mover destroços prejudica a investigação, que existe para prevenção, não para punir."
  },
  {
    titulo: "Pouso forçado numa fazenda, passageiro com fratura na perna",
    passos_certos: [
      "Cortar motor e sistemas conforme o POH; retirar o passageiro só se houver risco imediato (fogo), com cuidado com a fratura",
      "Prestar os primeiros socorros ao passageiro: imobilizar, controlar sangramento, manter aquecido",
      "Pedir socorro: rádio 121,5 ou frequência em uso, celular (193 Bombeiros / 192 SAMU), informando posição exata e a lesão",
      "Comunicar o órgão ATS e o operador: pessoas a bordo, feridos, estado da aeronave",
      "Preservar o local e os destroços, movendo apenas o necessário para o socorro",
      "Comunicar o SERIPA/CENIPA e aguardar orientação antes de qualquer remoção"
    ],
    distratores: [
      "Religar o motor e decolar para levar o ferido ao hospital no próprio helicóptero",
      "Lavar o combustível derramado e colocar os comandos 'no lugar' antes de alguém chegar",
      "Esperar o dia seguinte para avisar a escola, para não 'causar alarme'"
    ],
    e: "Com ferido grave, a ocorrência já é acidente aeronáutico. A vida vem primeiro, mas a aeronave que acabou de fazer pouso forçado não está em condição de voar: o transporte do ferido é da equipe de socorro. Tudo o que for movido para salvar vidas deve ser informado depois ao investigador."
  },
  {
    titulo: "Incidente grave no pátio: pá do rotor de cauda tocou um cone durante o táxi aéreo, sem feridos",
    passos_certos: [
      "Pousar imediatamente e cortar o motor conforme o POH, sem tentar 'ver se dá para continuar'",
      "Isolar a aeronave: ninguém mexe, não reparar, não remover a pá",
      "Comunicar o Solo/Torre (frequência em uso) e o operador/escola o que aconteceu",
      "Comunicar o SERIPA da região (incidente grave exige notificação)",
      "Preencher a notificação formal e, em paralelo, um RELPREV sobre a condição que contribuiu (ex.: cone mal posicionado, marcação do pátio)",
      "Preservar registros: fotos, horímetro, cheque de peso, condições de vento, nomes das testemunhas"
    ],
    distratores: [
      "Pedir ao mecânico para trocar a pá na hora e liberar o helicóptero para o próximo voo",
      "Seguir o táxi até o ponto de espera, já que 'foi só um toque'",
      "Não comunicar nada, porque não houve ferido"
    ],
    e: "Toque de pá é incidente grave: dano ao rotor de cauda pode ter afetado o eixo, a caixa e a estrutura. A aeronave fica no chão até a liberação. Comunicar não é punição: é o que alimenta a prevenção. O RELPREV serve para o 'porquê' (o cone, a marcação, a pressa), não para o 'quem'."
  }
];
