// Cartões de fonia (MCA 100-16, modelo didático). Gerado em 28/10/2026 a partir da nota 05. Conferir frequências no AISWEB no dia do voo.
// Cenário-modelo: R22 matrícula FICTÍCIA PR-HGB, saindo do pátio de Bacacheri (SBBI). Dados SBBI (ROTAER 27/10/2026):
// Torre 118.900, Solo 121.800, ATIS 132.325, pista 18/36. Nomes de pontos de notificação e de helipontos aqui são fictícios;
// no voo real, usar os da carta VAC/REA do AISWEB. Este é material de ESTUDO, não substitui a norma nem o instrutor.
//
// Formato: cada passo "PIL" tem 3 opções (uma ok: true); as erradas trazem "erro". Passos "ATC" têm só "t" e "en".
// Regra do MCA: a chamada inicial começa pelo indicativo; o cotejo (repetição da autorização) termina com o indicativo.

export const FONIA = [
  {
    id: "atis",
    titulo: "ATIS e primeiro contato",
    orgao: "ATIS Bacacheri 132.325 / Solo Bacacheri 121.800",
    contexto: "Antes de chamar o Solo você sintoniza o ATIS 132.325. R22 PR-HGB no pátio da escola, voo VFR local. No primeiro contato vai o indicativo completo e a letra do ATIS.",
    passos: [
      { quem: "ATC", t: "Bacacheri, informação ALFA, 1200 UTC. Pista em uso 18. Vento 160 graus 8 nós. Visibilidade 10 quilômetros. Poucas nuvens 3000 pés. Temperatura 22, ponto de orvalho 15. QNH 1018. Informe que recebeu a informação ALFA.", en: "Bacacheri information ALFA, 1200 UTC. Runway in use 18. Wind 160 degrees 8 knots. Visibility 10 kilometers. Few clouds 3000 feet. Temperature 22, dew point 15. QNH 1018. Acknowledge information ALFA." },
      { quem: "PIL", opcoes: [
          { t: "Solo Bacacheri, PR-HGB, pátio da escola, VFR local, solicita acionamento, câmbio.", ok: false, erro: "Faltou 'com informação ALFA' e 'câmbio' não se usa em VHF." },
          { t: "Solo Bacacheri, PR-HGB, helicóptero R22, pátio da escola, VFR local, com informação ALFA, solicita acionamento.", ok: true },
          { t: "Solo Bacacheri, helicóptero R22 no pátio da escola, informação ALFA, solicita acionamento e o QNH, PR-HGB.", ok: false, erro: "Na chamada inicial o indicativo vem no começo, não no fim. E o QNH já veio no ATIS: não precisa pedir." }
        ], en: "Bacacheri Ground, PR-HGB, R22 helicopter, school apron, VFR local, information ALFA, request start-up." },
      { quem: "ATC", t: "PR-HGB, Solo Bacacheri, informação BRAVO em vigor, QNH 1017, acionamento aprovado.", en: "PR-HGB, Bacacheri Ground, information BRAVO now current, QNH 1017, start-up approved." },
      { quem: "PIL", opcoes: [
          { t: "Ciente, PR-HGB.", ok: false, erro: "'Ciente' não substitui o cotejo: o ajuste de altímetro (QNH) é de cotejo obrigatório." },
          { t: "Informação ALFA, QNH 1018, acionamento aprovado, PR-HGB.", ok: false, erro: "Cotejou a informação antiga. A letra mudou para BRAVO e o QNH para 1017." },
          { t: "Informação BRAVO, QNH 1017, acionamento aprovado, PR-HGB.", ok: true }
        ], en: "Information BRAVO, QNH 1017, start-up approved, PR-HGB." }
    ],
    fonte: "Nota 05, seções 1.3, 2.1 e 2.2"
  },
  {
    id: "acionamento",
    titulo: "Acionamento (Solo)",
    orgao: "Solo Bacacheri 121.800",
    contexto: "Você está no pátio de Bacacheri (SBBI), R22 PR-HGB, VFR local, ouviu o ATIS informação ALFA.",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "Solo Bacacheri, PR-HGB, helicóptero R22, pátio, VFR local, com informação ALFA, solicita acionamento.", ok: true },
          { t: "Solo Bacacheri, PR-HGB, solicita acionamento, câmbio.", ok: false, erro: "'Câmbio' não se usa em VHF e faltou a informação ATIS, o tipo e a posição." },
          { t: "Solo Bacacheri, R22 no pátio com informação ALFA, VFR local, solicita acionamento, PR-HGB.", ok: false, erro: "Na chamada inicial o indicativo vem logo depois do órgão, não no fim." }
        ], en: "Bacacheri Ground, PR-HGB, R22 helicopter, stand, VFR local, information ALFA, request start-up." },
      { quem: "ATC", t: "PR-HGB, acionamento aprovado, chame pronto para o táxi.", en: "PR-HGB, start-up approved, report ready for taxi." },
      { quem: "PIL", opcoes: [
          { t: "Ciente, PR-HGB.", ok: false, erro: "'Ciente' só diz que você recebeu. A instrução 'chame pronto para o táxi' deve ser repetida." },
          { t: "Acionamento aprovado, chamarei pronto para o táxi, PR-HGB.", ok: true },
          { t: "Acionando, HGB, câmbio.", ok: false, erro: "'Câmbio' não existe em VHF e faltou repetir a instrução de chamar pronto para o táxi." }
        ], en: "Start-up approved, will report ready for taxi, PR-HGB." }
    ],
    fonte: "Nota 05, seção 2.2"
  },
  {
    id: "taxi",
    titulo: "Táxi aéreo (Solo)",
    orgao: "Solo Bacacheri 121.800",
    contexto: "Motor acionado, cheques feitos. Você vai se deslocar em táxi aéreo (pairado baixo, com efeito solo) até o ponto de espera da pista 18. Depois que o órgão abreviar, pode usar 'HGB'.",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "Solo Bacacheri, PR-HGB, pronto para decolagem, solicita táxi para a pista 18.", ok: false, erro: "'Decolagem' só aparece na autorização ou no cancelamento. Aqui você está pronto para o táxi." },
          { t: "Solo Bacacheri, PR-HGB, pronto para o táxi, solicita táxi aéreo para o ponto de espera da pista 18.", ok: true },
          { t: "Solo Bacacheri, PR-HGB, vou taxiar até a cabeceira 18, ciente.", ok: false, erro: "Táxi precisa de autorização: 'solicita'. 'Ciente' não cabe numa solicitação, e o termo correto para helicóptero é 'táxi aéreo'." }
        ], en: "Bacacheri Ground, PR-HGB, ready for taxi, request air-taxiing to holding point runway 18." },
      { quem: "ATC", t: "PR-HGB, táxi aéreo para o ponto de espera da pista 18 via taxiway Alfa, cuidado aeronave estacionada à sua esquerda; próximo do ponto de espera chame a Torre 118.9.", en: "PR-HGB, air-taxi to holding point runway 18 via taxiway Alfa, caution parked aircraft on your left; approaching holding point contact Tower 118.9." },
      { quem: "PIL", opcoes: [
          { t: "Táxi aéreo para o ponto de espera da pista 18 via Alfa, chamarei a Torre 118.9, PR-HGB.", ok: true },
          { t: "Táxi aéreo via Alfa, PR-HGB.", ok: false, erro: "Cotejo incompleto: faltou a pista 18 (cotejo obrigatório) e a frequência da Torre." },
          { t: "Ciente, taxiando para a pista 18, PR-HGB.", ok: false, erro: "'Ciente' não é cotejo. É preciso repetir pista, taxiway e frequência." }
        ], en: "Air-taxi to holding point runway 18 via Alfa, will contact Tower 118.9, PR-HGB." },
      { quem: "ATC", t: "HGB, mantenha posição fora da pista 18, dê passagem ao Cessna cruzando da direita para a esquerda.", en: "HGB, hold short of runway 18, give way to the Cessna crossing right to left." },
      { quem: "PIL", opcoes: [
          { t: "Mantendo posição fora da pista 18, dando passagem ao Cessna, HGB.", ok: true },
          { t: "Afirmo, HGB.", ok: false, erro: "'Afirmo' responde a pergunta (sim). Instrução de manter fora da pista é de cotejo obrigatório." },
          { t: "Mantendo posição fora da pista 36, HGB.", ok: false, erro: "Cotejou a pista errada. O controlador teria que corrigir; erro de cotejo é erro grave." }
        ], en: "Holding short of runway 18, giving way to the Cessna, HGB." }
    ],
    fonte: "Nota 05, seção 2.3 (modelo OACI, redação de táxi aéreo a confirmar na edição 2025)"
  },
  {
    id: "decolagem",
    titulo: "Decolagem (Torre)",
    orgao: "Torre Bacacheri 118.900",
    contexto: "No ponto de espera da pista 18, cheques antes da decolagem completos. Chame a Torre. Lembre: no ponto de espera nunca se diz 'pronto para decolagem'.",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "Torre Bacacheri, PR-HGB, ponto de espera pista 18, pronto para decolagem.", ok: false, erro: "A palavra 'decolagem' é exclusiva da autorização e do cancelamento. No ponto de espera diga 'pronto para partida'." },
          { t: "Torre Bacacheri, PR-HGB, ponto de espera pista 18, pronto para partida, saída pelo setor norte.", ok: true },
          { t: "Torre Bacacheri, PR-HGB, solicita decolagem pista 18, câmbio.", ok: false, erro: "'Decolagem' fora da autorização e 'câmbio' em VHF: dois erros clássicos." }
        ], en: "Bacacheri Tower, PR-HGB, holding point runway 18, ready for departure, north sector departure." },
      { quem: "ATC", t: "PR-HGB, pista 18, autorizado decolagem, vento 160 graus 8 nós, após a decolagem curva à direita, reporte livrando a CTR.", en: "PR-HGB, runway 18, cleared for take-off, wind 160 degrees 8 knots, after departure turn right, report leaving the CTR." },
      { quem: "PIL", opcoes: [
          { t: "Ciente, decolando, PR-HGB.", ok: false, erro: "Autorização de decolagem é de cotejo obrigatório: repita a pista e 'autorizado decolagem'." },
          { t: "Pista 36, autorizado decolagem, curva à direita, PR-HGB.", ok: false, erro: "Pista errada no cotejo (18, não 36). O controlador teria que corrigir." },
          { t: "Pista 18, autorizado decolagem, após a decolagem curva à direita, reportarei livrando a CTR, PR-HGB.", ok: true }
        ], en: "Runway 18, cleared for take-off, after departure right turn, will report leaving the CTR, PR-HGB." },
      { quem: "ATC", t: "HGB, cancele decolagem, repito, cancele decolagem, veículo na pista.", en: "HGB, cancel take-off, I say again, cancel take-off, vehicle on the runway." },
      { quem: "PIL", opcoes: [
          { t: "Mantendo posição, HGB.", ok: true },
          { t: "Ciente, HGB.", ok: false, erro: "Cancelamento de decolagem exige confirmação clara do que você vai fazer: 'mantendo posição'." },
          { t: "Negativo, já estou decolando, HGB.", ok: false, erro: "Antes de iniciar a decolagem o cancelamento é obrigatório; 'negativo' só se fosse impossível cumprir com segurança." }
        ], en: "Holding, HGB." }
    ],
    fonte: "Nota 05, seções 1.2 e 2.4"
  },
  {
    id: "saida_ctr",
    titulo: "Saída da CTR",
    orgao: "Torre Bacacheri 118.900",
    contexto: "Decolado, em subida para 1500 pés rumo ao setor de treinamento. O ponto de notificação 'ECO' é fictício: no voo real, use o nome da carta VAC/REA de Curitiba.",
    passos: [
      { quem: "ATC", t: "PR-HGB, decolado aos 26, reporte ECO livrando a CTR.", en: "PR-HGB, airborne at 26, report ECO leaving the CTR." },
      { quem: "PIL", opcoes: [
          { t: "Reportarei ECO livrando a CTR, PR-HGB.", ok: true },
          { t: "Ciente, PR-HGB.", ok: false, erro: "Instrução de reporte deve ser repetida, não apenas 'ciente'." },
          { t: "PR-HGB, decolado aos 26, reportarei.", ok: false, erro: "Faltou dizer o quê e onde (ECO, livrando a CTR), e o indicativo do cotejo vai no fim." }
        ], en: "Will report ECO leaving the CTR, PR-HGB." },
      { quem: "PIL", opcoes: [
          { t: "Torre Bacacheri, PR-HGB, cruzando ECO, 1500 pés, saindo da zona.", ok: false, erro: "Os termos padrão são 'sobre' (posição) e 'livrando a CTR'; 'cruzando' foi substituído por 'passando' para níveis." },
          { t: "Torre Bacacheri, PR-HGB, sobre ECO, 1500 pés, livrando a CTR, prosseguindo para o setor de treinamento norte.", ok: true },
          { t: "Torre Bacacheri, PR-HGB, ECO, 1500 metros, livrando a CTR.", ok: false, erro: "Altitude em pés, não em metros. Em VFR no Brasil as altitudes são em pés." }
        ], en: "Bacacheri Tower, PR-HGB, over ECO, 1500 feet, leaving the CTR, proceeding to north training sector." },
      { quem: "ATC", t: "PR-HGB, ciente, mudança de frequência aprovada, chame Controle Curitiba.", en: "PR-HGB, roger, frequency change approved, contact Curitiba Control." },
      { quem: "PIL", opcoes: [
          { t: "Mudança de frequência aprovada, chamando Controle Curitiba, PR-HGB.", ok: true },
          { t: "Ciente, câmbio, PR-HGB.", ok: false, erro: "'Câmbio' não existe em VHF; e uma mudança de frequência se coteja." },
          { t: "PR-HGB, tchau, bom serviço.", ok: false, erro: "Cortesia não substitui o cotejo da mudança de frequência." }
        ], en: "Frequency change approved, contacting Curitiba Control, PR-HGB." }
    ],
    fonte: "Nota 05, seção 2.5"
  },
  {
    id: "reporte_rota",
    titulo: "Reporte de posição em rota e transponder",
    orgao: "Controle Curitiba (APP)",
    contexto: "Em rota a 1500 pés. Formato do reporte: indicativo, posição, hora, nível/altitude, próximo ponto e estimado. Pontos 'ECO' e 'LIMA' são fictícios.",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "Controle Curitiba, PR-HGB, sobre ECO aos 35, 1500 pés, estimando LIMA aos 50.", ok: true },
          { t: "Controle Curitiba, PR-HGB, estou perto de ECO, mais ou menos 1500 pés, indo para LIMA.", ok: false, erro: "Reporte de posição tem formato fixo: posição, hora, altitude, próximo ponto e estimado. Sem 'mais ou menos'." },
          { t: "Controle Curitiba, sobre ECO aos 35, 1500 pés, estimando LIMA aos 50, PR-HGB, câmbio.", ok: false, erro: "Indicativo vem logo depois do órgão; e 'câmbio' não se usa em VHF." }
        ], en: "Curitiba Control, PR-HGB, over ECO at 35, 1500 feet, estimating LIMA at 50." },
      { quem: "ATC", t: "PR-HGB, Controle Curitiba, acione 4455.", en: "PR-HGB, Curitiba Control, squawk 4455." },
      { quem: "PIL", opcoes: [
          { t: "Ciente, PR-HGB.", ok: false, erro: "Código SSR (transponder) é de cotejo obrigatório." },
          { t: "Acionando 4545, PR-HGB.", ok: false, erro: "Cotejou o código errado (4455). Um dígito trocado é outro código." },
          { t: "Acionando 4455, PR-HGB.", ok: true }
        ], en: "Squawking 4455, PR-HGB." },
      { quem: "ATC", t: "HGB, contato radar, mantenha 1500 pés, reporte LIMA.", en: "HGB, radar contact, maintain 1500 feet, report LIMA." },
      { quem: "PIL", opcoes: [
          { t: "Mantendo 1500 pés, reportarei LIMA, HGB.", ok: true },
          { t: "Contato radar, HGB.", ok: false, erro: "Instrução de nível ('mantenha 1500 pés') é de cotejo obrigatório; 'contato radar' é informação, não precisa repetir." },
          { t: "Conforme, HGB, câmbio.", ok: false, erro: "'Conforme' (wilco) não substitui o cotejo de nível, e 'câmbio' não se usa em VHF." }
        ], en: "Maintaining 1500 feet, will report LIMA, HGB." }
    ],
    fonte: "Nota 05, seção 2.6"
  },
  {
    id: "entrada_circuito",
    titulo: "Entrada no circuito (Torre)",
    orgao: "Torre Bacacheri 118.900",
    contexto: "Voltando para Bacacheri, 5 milhas ao norte, 1500 pés. Você ouviu o ATIS, agora informação BRAVO.",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "Torre Bacacheri, PR-HGB, 5 milhas ao norte, 1500 pés, com informação BRAVO, instruções para pouso.", ok: true },
          { t: "Torre Bacacheri, PR-HGB, chegando do norte, solicita pouso.", ok: false, erro: "Faltou distância, altitude e a informação ATIS. 'Instruções para pouso' é o pedido padrão." },
          { t: "Torre Bacacheri, PR-HGB, 5 milhas ao norte, 1500 pés, com informação ALFA, instruções para pouso.", ok: false, erro: "A informação vigente é BRAVO. Letra errada obriga o órgão a repetir tudo." }
        ], en: "Bacacheri Tower, PR-HGB, 5 miles north, 1500 feet, information BRAVO, request landing instructions." },
      { quem: "ATC", t: "PR-HGB, autorizado para o circuito de tráfego, pista 18, vento 170 graus 10 nós, QNH 1018, reporte perna do vento.", en: "PR-HGB, cleared to the traffic circuit, runway 18, wind 170 degrees 10 knots, QNH 1018, report downwind." },
      { quem: "PIL", opcoes: [
          { t: "Ciente, reportarei perna do vento, PR-HGB.", ok: false, erro: "Pista em uso e QNH são de cotejo obrigatório. 'Ciente' não os substitui." },
          { t: "Circuito de tráfego pista 18, QNH 1018, reportarei perna do vento, PR-HGB.", ok: true },
          { t: "Circuito de tráfego pista 18, vento 170 graus 10 nós, QNH 1018, reportarei perna do vento, PR-HGB.", ok: false, erro: "Vento é informação, não se coteja; repetir tudo entope a frequência. Coteje pista e QNH." }
        ], en: "Traffic circuit runway 18, QNH 1018, will report downwind, PR-HGB." },
      { quem: "ATC", t: "HGB, alongue a perna do vento, é o número 2, siga um R44 na final.", en: "HGB, extend downwind, number 2, follow an R44 on final." },
      { quem: "PIL", opcoes: [
          { t: "Alongando a perna do vento, número 2, R44 à vista, HGB.", ok: true },
          { t: "Afirmo, HGB.", ok: false, erro: "'Afirmo' responde a pergunta. Aqui é instrução de sequência: repita e informe se vê o tráfego." },
          { t: "Número 1, HGB.", ok: false, erro: "Cotejo errado: você é o número 2 e precisa seguir o R44." }
        ], en: "Extending downwind, number 2, R44 in sight, HGB." }
    ],
    fonte: "Nota 05, seção 2.7"
  },
  {
    id: "circuito_pouso",
    titulo: "Circuito e pouso",
    orgao: "Torre Bacacheri 118.900",
    contexto: "Dentro do circuito da pista 18, você reporta cada perna e recebe a autorização de pouso. Depois de pousar, a Torre pede 'reporte pista livre' (termo atual).",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "HGB, perna do vento pista 18.", ok: true },
          { t: "HGB, estou na perna do vento, pronto para pouso.", ok: false, erro: "Reporte simples: 'perna do vento pista 18'. Não se pede pouso na perna do vento." },
          { t: "Torre, perna do vento, câmbio.", ok: false, erro: "Faltou o indicativo e 'câmbio' não se usa em VHF." }
        ], en: "HGB, downwind runway 18." },
      { quem: "ATC", t: "HGB, reporte final.", en: "HGB, report final." },
      { quem: "PIL", opcoes: [
          { t: "Ciente, HGB.", ok: false, erro: "Instrução de reporte: repita ('reportarei final')." },
          { t: "Reportarei final, HGB.", ok: true },
          { t: "Reportarei perna base, HGB.", ok: false, erro: "A Torre pediu reporte na final, não na base." }
        ], en: "Will report final, HGB." },
      { quem: "PIL", opcoes: [
          { t: "HGB, final pista 18.", ok: true },
          { t: "HGB, final, solicita autorização para pousar na 18.", ok: false, erro: "O reporte de final já basta; a Torre emite a autorização sem precisar de pedido." },
          { t: "HGB, final pista 36.", ok: false, erro: "Pista errada. A pista em uso é a 18." }
        ], en: "HGB, final runway 18." },
      { quem: "ATC", t: "HGB, pista 18, autorizado pouso, vento 170 graus 10 nós.", en: "HGB, runway 18, cleared to land, wind 170 degrees 10 knots." },
      { quem: "PIL", opcoes: [
          { t: "Pista 18, autorizado pouso, HGB.", ok: true },
          { t: "Ciente, pousando, HGB.", ok: false, erro: "Autorização de pouso é de cotejo obrigatório: pista e 'autorizado pouso'." },
          { t: "Autorizado pouso, vento 170 graus 10 nós, HGB.", ok: false, erro: "Faltou a pista (obrigatória) e sobrou o vento (informação, não se coteja)." }
        ], en: "Runway 18, cleared to land, HGB." },
      { quem: "ATC", t: "HGB, reporte pista livre.", en: "HGB, report runway vacated." },
      { quem: "PIL", opcoes: [
          { t: "Livrando a pista, HGB.", ok: false, erro: "'Livrando a pista' é o termo antigo. Desde a edição 2020/2021 se diz 'pista livre' (depois de livrar)." },
          { t: "Pista livre, HGB.", ok: true },
          { t: "Ciente, HGB, câmbio.", ok: false, erro: "A Torre precisa saber que a pista está livre: 'pista livre'. 'Câmbio' não se usa em VHF." }
        ], en: "Runway vacated, HGB." },
      { quem: "ATC", t: "HGB, chame o Solo 121.8.", en: "HGB, contact Ground 121.8." },
      { quem: "PIL", opcoes: [
          { t: "Solo 121.8, HGB.", ok: true },
          { t: "Ciente, HGB.", ok: false, erro: "Mudança de frequência é instrução: coteje a frequência." },
          { t: "Solo 118.9, HGB.", ok: false, erro: "Frequência errada: 118.9 é a Torre; o Solo é 121.8." }
        ], en: "Ground 121.8, HGB." }
    ],
    fonte: "Nota 05, seções 1.2 e 2.8"
  },
  {
    id: "heliponto",
    titulo: "Heliponto dentro da CTR",
    orgao: "Torre Bacacheri 118.900",
    contexto: "Você está num heliponto fictício ('Heliponto Pinheiro') dentro da CTR de Bacacheri e quer decolar para o aeródromo. Dentro da CTR a coordenação continua com a Torre. Informe origem como 'heliponto (nome)'. Antes de usar qualquer heliponto, confira o cadastro ANAC/ROTAER; heliponto privado exige autorização do proprietário.",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "Torre Bacacheri, PR-HGB, helicóptero R22, no Heliponto Pinheiro, duas pessoas a bordo, VFR para Bacacheri, solicita decolagem e ingresso na CTR.", ok: false, erro: "Não se 'solicita decolagem' (a palavra é reservada à autorização). Diga que está pronto para partida e peça instruções." },
          { t: "Torre Bacacheri, PR-HGB, helicóptero R22, Heliponto Pinheiro, duas pessoas a bordo, VFR para Bacacheri, com informação CHARLIE, pronto para partida.", ok: true },
          { t: "Torre Bacacheri, helicóptero no heliponto, vou subir para Bacacheri, PR-HGB.", ok: false, erro: "Faltou o indicativo no início, a posição completa e a informação ATIS; 'vou subir' não é fraseologia." }
        ], en: "Bacacheri Tower, PR-HGB, R22 helicopter, Pinheiro helipad, two persons on board, VFR to Bacacheri, information CHARLIE, ready for departure." },
      { quem: "ATC", t: "PR-HGB, do Heliponto Pinheiro, autorizado decolagem, vento 150 graus 6 nós, mantenha 1000 pés, acione 4466, reporte 5 milhas do aeródromo.", en: "PR-HGB, from Pinheiro helipad, cleared for take-off, wind 150 degrees 6 knots, maintain 1000 feet, squawk 4466, report 5 miles from the aerodrome." },
      { quem: "PIL", opcoes: [
          { t: "Ciente, decolando, PR-HGB.", ok: false, erro: "Decolagem, nível e código SSR: três itens de cotejo obrigatório ignorados." },
          { t: "Do Heliponto Pinheiro, autorizado decolagem, mantendo 1500 pés, acionando 4466, reportarei 5 milhas, PR-HGB.", ok: false, erro: "Altitude errada no cotejo: a instrução foi 1000 pés." },
          { t: "Do Heliponto Pinheiro, autorizado decolagem, mantendo 1000 pés, acionando 4466, reportarei 5 milhas, PR-HGB.", ok: true }
        ], en: "From Pinheiro helipad, cleared for take-off, maintaining 1000 feet, squawking 4466, will report 5 miles, PR-HGB." },
      { quem: "PIL", opcoes: [
          { t: "Torre Bacacheri, HGB, 5 milhas a oeste, 1000 pés, instruções para pouso.", ok: true },
          { t: "Torre Bacacheri, HGB, meia milha a oeste, 1000 pés, instruções para pouso.", ok: false, erro: "'Meia milha' é 0,5 NM. Você está a 5 milhas; a confusão clássica é com 6 NM, que se diz 'meia dúzia de milhas'." },
          { t: "Torre Bacacheri, HGB, chegando, câmbio.", ok: false, erro: "Sem posição, distância nem altitude; e 'câmbio' não se usa em VHF." }
        ], en: "Bacacheri Tower, HGB, 5 miles west, 1000 feet, request landing instructions." },
      { quem: "ATC", t: "HGB, autorizado pouso na área de helicópteros, vento 150 graus 6 nós.", en: "HGB, cleared to land helicopter area, wind 150 degrees 6 knots." },
      { quem: "PIL", opcoes: [
          { t: "Autorizado pouso na área de helicópteros, HGB.", ok: true },
          { t: "Pista 18, autorizado pouso, HGB.", ok: false, erro: "A autorização foi para a área de helicópteros, não para a pista 18. Coteje o local certo." },
          { t: "Ciente, HGB.", ok: false, erro: "Autorização de pouso é de cotejo obrigatório." }
        ], en: "Cleared to land helicopter area, HGB." }
    ],
    fonte: "Nota 05, seções 2.4, 2.8 e 2.9 (frases de pouso fora da pista: modelo a confirmar)"
  },
  {
    id: "nao_controlado",
    titulo: "Aeródromo não controlado (auto-anúncio)",
    orgao: "Tráfego Serra Azul (aeródromo fictício), frequência publicada no ROTAER",
    contexto: "Aeródromo sem Torre nem Rádio. Ninguém autoriza nada: você anuncia posição e intenção para os outros tráfegos. Formato: Tráfego (local), indicativo, helicóptero, posição, altura, intenção, (local). Repetir o nome do local no fim evita confusão com outro aeródromo na mesma frequência. A frequência de coordenação deve ser conferida no ROTAER.",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "Tráfego Serra Azul, PR-HGB, helicóptero, 5 milhas ao sul, 1000 pés, ingressando perna do vento pista 09, Serra Azul.", ok: true },
          { t: "Tráfego Serra Azul, PR-HGB, 5 milhas ao sul, solicita autorização para ingressar no circuito.", ok: false, erro: "Em aeródromo não controlado não há quem autorize. Você informa posição e intenção; faltou altitude e o nome do local no fim." },
          { t: "PR-HGB, 5 milhas ao sul, 1000 pés, perna do vento 09, câmbio.", ok: false, erro: "Faltou 'Tráfego Serra Azul' no início e no fim; 'câmbio' não se usa em VHF." }
        ], en: "Serra Azul traffic, PR-HGB, helicopter, 5 miles south, 1000 feet, joining downwind runway 09, Serra Azul." },
      { quem: "PIL", opcoes: [
          { t: "Tráfego Serra Azul, PR-HGB, final pista 09, pouso completo, Serra Azul.", ok: true },
          { t: "Tráfego Serra Azul, PR-HGB, final, autorizado pouso pista 09.", ok: false, erro: "'Autorizado pouso' é frase de órgão ATC; ninguém te autorizou. Anuncie a intenção (pouso completo)." },
          { t: "Serra Azul, final 09.", ok: false, erro: "Sem indicativo não se sabe quem está na final. Use o formato completo." }
        ], en: "Serra Azul traffic, PR-HGB, final runway 09, full stop, Serra Azul." },
      { quem: "PIL", opcoes: [
          { t: "Tráfego Serra Azul, PR-HGB, pronto para decolagem pista 09, Serra Azul.", ok: false, erro: "Mesmo sem ATC, 'decolagem' aqui não cabe como 'pronto para'. Anuncie a ação: 'decolando pista 09, saída pelo setor norte'." },
          { t: "Tráfego Serra Azul, PR-HGB, helicóptero, decolando pista 09, saída pelo setor norte, Serra Azul.", ok: true },
          { t: "Tráfego Serra Azul, PR-HGB, decolando, Serra Azul, ciente.", ok: false, erro: "Faltou a pista e o setor de saída; 'ciente' não cabe num auto-anúncio." }
        ], en: "Serra Azul traffic, PR-HGB, helicopter, departing runway 09, north sector departure, Serra Azul." }
    ],
    fonte: "Nota 05, seção 2.10 (modelo didático; frequência de coordenação a confirmar)"
  },
  {
    id: "afis",
    titulo: "Aeródromo com AFIS (Rádio)",
    orgao: "Rádio Bacacheri 118.900 (AFIS prestado pelo APP Curitiba fora do horário da Torre)",
    contexto: "Você chega a Bacacheri antes da abertura da Torre (TWR DLY 1000-0100 UTC); o serviço é AFIS, com o indicativo 'Rádio'. O AFIS informa, não autoriza: você reporta e decide.",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "Torre Bacacheri, PR-HGB.", ok: false, erro: "Fora do horário da Torre o órgão é 'Rádio Bacacheri' (AFIS). Indicativo errado." },
          { t: "Rádio Bacacheri, PR-HGB.", ok: true },
          { t: "Bacacheri, aqui é o helicóptero HGB, câmbio.", ok: false, erro: "Use o indicativo do órgão ('Rádio Bacacheri') e o seu indicativo completo no primeiro contato; sem 'câmbio'." }
        ], en: "Bacacheri Radio, PR-HGB." },
      { quem: "ATC", t: "PR-HGB, Rádio Bacacheri.", en: "PR-HGB, Bacacheri Radio." },
      { quem: "PIL", opcoes: [
          { t: "PR-HGB, helicóptero R22, procedente do Heliponto Pinheiro, 10 minutos fora, 10 milhas ao norte, 1500 pés, para pouso.", ok: true },
          { t: "PR-HGB, procedente do Heliponto Pinheiro, solicita autorização para pouso pista 18.", ok: false, erro: "AFIS não autoriza pouso. Informe posição, altitude e estimado; a decisão é sua." },
          { t: "PR-HGB, chegando em 10 minutos, meia milha ao norte, 1500 pés.", ok: false, erro: "'Meia milha' é 0,5 NM; você está a 10 milhas. Distância errada confunde o tráfego." }
        ], en: "PR-HGB, R22 helicopter, from Pinheiro helipad, 10 minutes out, 10 miles north, 1500 feet, for landing." },
      { quem: "ATC", t: "PR-HGB, vento 180 graus 5 nós, pista em uso 18, QNH 1019, sem tráfego conhecido, informe intenções.", en: "PR-HGB, wind 180 degrees 5 knots, runway in use 18, QNH 1019, no known traffic, report intentions." },
      { quem: "PIL", opcoes: [
          { t: "Pista 18, QNH 1019, solicita autorização para o circuito, PR-HGB.", ok: false, erro: "No AFIS não há autorização. Depois de cotejar pista e QNH, informe a intenção ('ingressarei na perna do vento')." },
          { t: "Pista 18, QNH 1019, ingressarei na perna do vento pista 18, reportarei final, PR-HGB.", ok: true },
          { t: "Ciente, PR-HGB.", ok: false, erro: "Pista em uso e QNH são de cotejo obrigatório, mesmo com AFIS." }
        ], en: "Runway 18, QNH 1019, will join downwind runway 18, will report final, PR-HGB." }
    ],
    fonte: "Nota 05, seções 1.5 (indicativos), 2 (dados SBBI) e 2.10 (exemplo AFIS do MCA)"
  },
  {
    id: "mayday",
    titulo: "MAYDAY: pane de motor em autorrotação",
    orgao: "Torre Bacacheri 118.900 (ou a frequência em uso; 121.5 se não houver contato)",
    contexto: "A 1200 pés, 3 milhas a leste do aeródromo, o motor para. Primeiro voa-se a aeronave (coletivo embaixo, RPM do rotor, local de pouso); a mensagem vem depois. Ordem (MCA 4.1.7.2): órgão, indicativo, natureza, intenção, posição, altitude e proa. MAYDAY de preferência 3 vezes.",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "MAYDAY, MAYDAY, MAYDAY, Torre Bacacheri, PR-HGB, pane de motor, em autorrotação, pouso forçado em campo aberto, 3 milhas a leste, 1200 pés, duas pessoas a bordo.", ok: true },
          { t: "PAN PAN, PAN PAN, PAN PAN, Torre Bacacheri, PR-HGB, motor parou, vou pousar num campo a leste.", ok: false, erro: "Pane de motor em helicóptero é perigo grave e iminente: MAYDAY, não PAN PAN. Faltou posição precisa, altitude e pessoas a bordo." },
          { t: "Torre Bacacheri, PR-HGB, emergência, câmbio.", ok: false, erro: "Sem a palavra MAYDAY o órgão não ativa a prioridade; 'câmbio' não se usa em VHF; faltou natureza, intenção e posição." }
        ], en: "MAYDAY, MAYDAY, MAYDAY, Bacacheri Tower, PR-HGB, engine failure, autorotating, forced landing open field, 3 miles east, 1200 feet, two persons on board." },
      { quem: "ATC", t: "PR-HGB, Torre Bacacheri, ciente MAYDAY, vento 160 graus 8 nós, frequência livre para você, acione 7700 se possível.", en: "PR-HGB, Bacacheri Tower, roger MAYDAY, wind 160 degrees 8 knots, frequency clear for you, squawk 7700 if able." },
      { quem: "PIL", opcoes: [
          { t: "Acionando 7700, PR-HGB.", ok: true },
          { t: "Ciente, câmbio, PR-HGB.", ok: false, erro: "'Câmbio' não existe em VHF. Se der tempo, coteje o código: 'acionando 7700'. Se não der, voe a aeronave e não responda." },
          { t: "Acionando 7600, PR-HGB.", ok: false, erro: "7600 é falha de comunicações. Emergência é 7700." }
        ], en: "Squawking 7700, PR-HGB." },
      { quem: "PIL", opcoes: [
          { t: "Torre Bacacheri, PR-HGB, pousado, todos ilesos, aeronave sem fogo, posição 3 milhas a leste.", ok: true },
          { t: "Torre Bacacheri, PR-HGB, cancelo MAYDAY, já pousei, podem desligar o alerta.", ok: false, erro: "Depois de um pouso forçado o MAYDAY não se 'cancela' como se nada tivesse acontecido: informe situação, feridos e posição para o SAR e o SIPAER." },
          { t: "PR-HGB em solo, tudo bem.", ok: false, erro: "Faltou o órgão, a posição e o estado dos ocupantes; 'tudo bem' não informa nada ao serviço de alerta." }
        ], en: "Bacacheri Tower, PR-HGB, landed, all uninjured, no fire, position 3 miles east." }
    ],
    fonte: "Nota 05, seções 2.11 e 2.12; nota 02, seção 6.1"
  },
  {
    id: "panpan",
    titulo: "PAN PAN: aeronave perdida",
    orgao: "Controle Curitiba (APP)",
    contexto: "Em navegação a 2000 pés, proa 090, você perdeu a referência no solo e não tem certeza da posição. Não há perigo imediato: é urgência, não socorro. Peça ajuda cedo, antes que o combustível vire o problema.",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "MAYDAY, MAYDAY, MAYDAY, Controle Curitiba, PR-HGB, estou perdido.", ok: false, erro: "Perdido, com combustível e motor normais, é urgência: PAN PAN. MAYDAY é para perigo grave e iminente. Faltou altitude, proa e o pedido." },
          { t: "PAN PAN, PAN PAN, PAN PAN, Controle Curitiba, PR-HGB, 2000 pés, proa 090, não estou seguro de minha posição, solicito proa para Bacacheri.", ok: true },
          { t: "Controle Curitiba, PR-HGB, acho que me perdi, pode me ajudar? Câmbio.", ok: false, erro: "Sem PAN PAN o órgão não dá prioridade; 'câmbio' não se usa em VHF; faltou altitude e proa." }
        ], en: "PAN PAN, PAN PAN, PAN PAN, Curitiba Control, PR-HGB, 2000 feet, heading 090, unsure of my position, request heading to Bacacheri." },
      { quem: "ATC", t: "PR-HGB, Controle Curitiba, ciente PAN PAN, acione 7700, mantenha 2000 pés, curva à esquerda proa 300.", en: "PR-HGB, Curitiba Control, roger PAN PAN, squawk 7700, maintain 2000 feet, turn left heading 300." },
      { quem: "PIL", opcoes: [
          { t: "Ciente, PR-HGB.", ok: false, erro: "Código SSR, nível e proa são de cotejo obrigatório." },
          { t: "Acionando 7700, mantendo 2000 pés, curva à esquerda proa 300, PR-HGB.", ok: true },
          { t: "Acionando 7700, mantendo 2000 pés, curva à direita proa 300, PR-HGB.", ok: false, erro: "Sentido da curva errado no cotejo (esquerda). Em aeronave perdida, curva para o lado errado piora tudo." }
        ], en: "Squawking 7700, maintaining 2000 feet, turning left heading 300, PR-HGB." },
      { quem: "ATC", t: "HGB, contato radar, 12 milhas a nordeste de Bacacheri, prossiga proa 300, reporte aeródromo à vista.", en: "HGB, radar contact, 12 miles northeast of Bacacheri, continue heading 300, report aerodrome in sight." },
      { quem: "PIL", opcoes: [
          { t: "Proa 300, reportarei aeródromo à vista, HGB.", ok: true },
          { t: "Conforme, HGB.", ok: false, erro: "'Conforme' (wilco) não substitui o cotejo de proa." },
          { t: "Contato radar, 12 milhas a nordeste, HGB.", ok: false, erro: "Repetiu a informação e esqueceu a instrução (proa e reporte), que é o que se coteja." }
        ], en: "Heading 300, will report aerodrome in sight, HGB." }
    ],
    fonte: "Nota 05, seção 2.11"
  },
  {
    id: "falha_radio",
    titulo: "Falha de rádio (7600)",
    orgao: "Torre Bacacheri 118.900 (transmitindo às cegas)",
    contexto: "A 5 milhas ao norte de Bacacheri, 1500 pés, você chama a Torre e ninguém responde; você também não ouve outros tráfegos. Regra geral VFR (OACI; texto exato da ICA 100-12 a confirmar): acionar 7600, manter VMC, pousar no aeródromo adequado mais próximo e informar a chegada ao órgão ATS. Transmita às cegas: o rádio pode estar só sem recepção.",
    passos: [
      { quem: "PIL", opcoes: [
          { t: "Fico em silêncio e entro no circuito sem avisar; se a Torre não responde, não adianta falar.", ok: false, erro: "A falha pode ser só de recepção. Transmita às cegas e acione 7600 para a Torre saber da falha pelo radar." },
          { t: "Torre Bacacheri, PR-HGB, transmitindo às cegas, falha de rádio, 5 milhas ao norte, 1500 pés, acionando 7600, prosseguirei para o circuito de tráfego pista 18, pouso completo.", ok: true },
          { t: "MAYDAY, MAYDAY, MAYDAY, Torre Bacacheri, PR-HGB, rádio quebrado, acionando 7700.", ok: false, erro: "Falha de rádio em VMC não é socorro. O código é 7600 e a mensagem é 'transmitindo às cegas'." }
        ], en: "Bacacheri Tower, PR-HGB, transmitting blind, radio failure, 5 miles north, 1500 feet, squawking 7600, will proceed to traffic circuit runway 18, full stop." },
      { quem: "ATC", t: "[Sem resposta de voz. Na final, a Torre aponta para você luz VERDE CONTÍNUA: autorizado pouso.]", en: "[No voice reply. On final, the Tower shows you a STEADY GREEN light: cleared to land.]" },
      { quem: "PIL", opcoes: [
          { t: "Luz verde contínua em voo é 'autorizado pouso': pouso, livro a pista e vou até o pátio observando o pessoal de solo.", ok: true },
          { t: "Luz verde contínua significa 'volte para o pouso' e luz vermelha é 'pouse': arremeto e tento de novo.", ok: false, erro: "Em voo: verde contínua = autorizado pouso; vermelha contínua = dê passagem e continue no circuito. Não confunda." },
          { t: "Ignoro as luzes, pois sem rádio a autorização não vale.", ok: false, erro: "Os sinais luminosos existem justamente para a falha de rádio. Verde contínua é a autorização de pouso." }
        ], en: "Steady green in flight means cleared to land: land, vacate and proceed to the apron watching the ground crew." },
      { quem: "PIL", opcoes: [
          { t: "Depois de pousar, ligo para a Torre/Sala AIS informando a chegada e a falha, e registro a pane no diário de bordo.", ok: true },
          { t: "Decolo de novo para testar se o rádio voltou.", ok: false, erro: "Sem rádio você não decola de aeródromo controlado; e a falha precisa ser registrada e comunicada por outro meio." },
          { t: "Deixo o transponder em 7600 pelo resto do dia para avisar todo mundo.", ok: false, erro: "Após pousar e comunicar, o código de falha não tem mais função; o importante é informar a chegada ao órgão ATS." }
        ], en: "After landing, phone the Tower/AIS office to report arrival and the failure, and log the defect." }
    ],
    fonte: "Nota 05, seção 2.12 (procedimento: confirmar texto da ICA 100-12/2024)"
  },
  {
    id: "numeros_alfabeto",
    titulo: "Números e alfabeto",
    orgao: "Qualquer órgão",
    contexto: "Números se falam dígito a dígito; 1 é 'uno', 6 é 'meia', vírgula é 'decimal'. Alfabeto fonético OACI (grafia do MCA: Romeu). Escolha a forma correta.",
    passos: [
      { quem: "PIL", pergunta: "Como se fala a frequência 118,9?", opcoes: [
          { t: "Cento e dezoito vírgula nove.", ok: false, erro: "Frequência se fala dígito a dígito, com 'decimal' na vírgula." },
          { t: "Uno uno oito decimal nove.", ok: true },
          { t: "Um um oito ponto nove.", ok: false, erro: "No MCA o 1 é 'uno' e a vírgula é 'decimal', não 'ponto'." }
        ], en: "One one eight decimal nine." },
      { quem: "PIL", pergunta: "Você está a 6 milhas do aeródromo. Como reporta a distância?", opcoes: [
          { t: "Meia milha.", ok: false, erro: "'Meia milha' é 0,5 NM. O controlador vai achar que você está em cima do aeródromo." },
          { t: "Seis milhas.", ok: false, erro: "No padrão do MCA o 6 se fala 'meia'; com unidade feminina a forma é 'meia dúzia de milhas'." },
          { t: "Meia dúzia de milhas.", ok: true }
        ], en: "Six miles." },
      { quem: "PIL", pergunta: "Como se soletra a matrícula PR-HGB?", opcoes: [
          { t: "Papa Romeu Hotel Golf Bravo.", ok: true },
          { t: "Papa Romeu Hotel Golf Beta.", ok: false, erro: "B é Bravo. Beta não existe no alfabeto fonético." },
          { t: "Pedro Roberto Henrique Gustavo Bruno.", ok: false, erro: "Isso é soletração informal. Na fonia usa-se o alfabeto OACI." }
        ], en: "Papa Romeo Hotel Golf Bravo." },
      { quem: "PIL", pergunta: "Como se fala 'nível de voo 045'?", opcoes: [
          { t: "Nível de voo quarenta e cinco.", ok: false, erro: "Níveis se falam dígito a dígito, com o zero da frente." },
          { t: "Nível de voo zero quatro cinco.", ok: true },
          { t: "Nível de voo quatro mil e quinhentos.", ok: false, erro: "Isso confunde nível (FL045) com altitude (4500 pés). Fale 'zero quatro cinco'." }
        ], en: "Flight level zero four five." },
      { quem: "PIL", pergunta: "Como se fala a hora 09:20 num reporte?", opcoes: [
          { t: "Nove e vinte.", ok: false, erro: "Horas se falam em dígitos. Normalmente só os minutos ('dois zero'); a hora completa quando houver risco de confusão." },
          { t: "Dois zero (ou zero nove dois zero, se houver risco de confusão).", ok: true },
          { t: "Vinte.", ok: false, erro: "Dígito a dígito: 'dois zero', não 'vinte'." }
        ], en: "Two zero (or zero nine two zero if confusion is possible)." },
      { quem: "PIL", pergunta: "Como se coteja 'QNH 1018'?", opcoes: [
          { t: "QNH mil e dezoito.", ok: false, erro: "Ajuste de altímetro é de cotejo obrigatório e se fala dígito a dígito." },
          { t: "QNH uno zero uno oito.", ok: true },
          { t: "Ciente QNH.", ok: false, erro: "'Ciente' não é cotejo. Repita o valor completo." }
        ], en: "QNH one zero one eight." },
      { quem: "PIL", pergunta: "Como se informa que há duas pessoas a bordo?", opcoes: [
          { t: "Duas pessoas a bordo.", ok: true },
          { t: "Dois pessoas a bordo.", ok: false, erro: "Antes de palavra feminina usa-se 'uma' e 'duas'." },
          { t: "Dois POB.", ok: false, erro: "'POB' é abreviatura de formulário, não fraseologia falada em português." }
        ], en: "Two persons on board." },
      { quem: "PIL", pergunta: "Como se fala 'pista 36'?", opcoes: [
          { t: "Pista trinta e seis.", ok: false, erro: "Designador de pista é dígito a dígito." },
          { t: "Pista três seis.", ok: false, erro: "Quase: no MCA o 6 é 'meia'." },
          { t: "Pista três meia.", ok: true }
        ], en: "Runway three six." },
      { quem: "PIL", pergunta: "Como se coteja 'proa 090'?", opcoes: [
          { t: "Proa noventa.", ok: false, erro: "Proa se fala com três dígitos, inclusive o zero da frente." },
          { t: "Proa zero nove zero.", ok: true },
          { t: "Proa leste.", ok: false, erro: "Proa é número em graus, não ponto cardeal." }
        ], en: "Heading zero nine zero." }
    ],
    fonte: "Nota 05, seção 1.5"
  }
];

// Códigos transponder (nota 05, seção 2.12)
export const TRANSPONDER = [
  { codigo: "7500", significado: "Interferência ilícita (sequestro)", dica: "75, homem com faca" },
  { codigo: "7600", significado: "Falha de comunicações", dica: "76, rádio quebrado" },
  { codigo: "7700", significado: "Emergência", dica: "77, céu" },
  { codigo: "2000", significado: "VFR sem código atribuído (material de terceiros; confirmar na AIP/ICA 100-37)", dica: "Só use se a norma vigente confirmar" }
];

// Alfabeto fonético OACI (grafia do MCA 100-16: Romeu)
export const ALFABETO = [
  ["A", "Alfa"], ["B", "Bravo"], ["C", "Charlie"], ["D", "Delta"], ["E", "Echo"], ["F", "Foxtrot"],
  ["G", "Golf"], ["H", "Hotel"], ["I", "India"], ["J", "Juliett"], ["K", "Kilo"], ["L", "Lima"],
  ["M", "Mike"], ["N", "November"], ["O", "Oscar"], ["P", "Papa"], ["Q", "Quebec"], ["R", "Romeu"],
  ["S", "Sierra"], ["T", "Tango"], ["U", "Uniform"], ["V", "Victor"], ["W", "Whiskey"], ["X", "X-ray"],
  ["Y", "Yankee"], ["Z", "Zulu"]
];

// Números em português (MCA 100-16): sempre dígito a dígito
export const NUMEROS = [
  ["0", "zero"], ["1", "uno"], ["2", "dois"], ["3", "três"], ["4", "quatro"],
  ["5", "cinco"], ["6", "meia"], ["7", "sete"], ["8", "oito"], ["9", "nove"],
  [",", "decimal"]
];

// Palavras-padrão (PT / EN / significado), nota 05 seção 1.4
export const PALAVRAS_PADRAO = [
  ["Afirmo", "Affirm", "Sim"],
  ["Negativo", "Negative", "Não / não autorizado / incorreto"],
  ["Ciente", "Roger", "Recebi toda a transmissão (não substitui cotejo)"],
  ["Conforme", "Wilco", "Entendi e vou cumprir"],
  ["Coteje", "Read back", "Repita a mensagem"],
  ["Confirme", "Confirm", "Confirme se recebeu certo"],
  ["Correção", "Correction", "Erro; o correto é..."],
  ["Repita", "Say again", "Repita (tudo ou parte)"],
  ["Repito", "I say again", "Eu repito"],
  ["Aguarde", "Standby", "Aguarde chamada"],
  ["Mantenha", "Maintain", "Continue na condição"],
  ["Monitore", "Monitor", "Mantenha escuta"],
  ["Reporte", "Report", "Informe"],
  ["Solicito", "Request", "Desejo obter"],
  ["Verifique", "Verify", "Verifique se está correto"],
  ["Desconsidere", "Disregard", "Ignore"],
  ["Aprovado", "Approved", "Ação proposta permitida"],
  ["Autorizado", "Cleared", "Prossiga nas condições dadas"],
  ["Como me recebe?", "How do you read?", "Qualidade da transmissão"],
  ["Acuse recebimento", "Acknowledge", "Confirme que recebeu e entendeu"]
];
