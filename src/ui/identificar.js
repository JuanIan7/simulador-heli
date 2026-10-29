// Fase 1: fotos reais do R22 (exterior e cockpit, Wikimedia Commons, CC BY-SA) com as peças clicáveis em cima da foto.
// Coordenadas em % da largura/altura da foto. Mantido o desenho esquemático como reserva didática (não usado aqui).
const BASE = import.meta.env.BASE_URL + 'assets/fotos/';
export const FOTOS = [
  {
    id: 'exterior', titulo: 'Lado de fora', arquivo: 'r22-exterior.jpg',
    credito: 'Foto: Acroterion, Wikimedia Commons, CC BY-SA 4.0 (R22 Beta N2584F)',
    pecas: [
      { id: 'rotorPrincipal', nome: 'Rotor principal (pás)', r: [7, 16, 86, 27], desc: 'Duas pás metálicas em cubo semirrígido de gangorra (teetering). Diâmetro 7,67 m. Gera a sustentação e, inclinado pelo cíclico, o empuxo.' },
      { id: 'mastro', nome: 'Mastro e cabeça do rotor', r: [39, 17, 47, 30], desc: 'O mastro leva o torque da transmissão ao cubo. No R22 (cubo em gangorra) é onde ocorre o mast bumping em baixo G (SN-11).' },
      { id: 'carenagem', nome: 'Carenagem do mastro (swashplate dentro)', r: [39, 30, 46, 43], desc: 'Dentro desta carenagem ficam o prato oscilante (swashplate), as hastes de comando e a transmissão principal.' },
      { id: 'cabine', nome: 'Cabine (bolha)', r: [26, 40, 46, 70], desc: 'Dois lugares lado a lado; o piloto solo voa pelo assento DIREITO. Cinto do assento esquerdo sempre afivelado.' },
      { id: 'motor', nome: 'Motor Lycoming O-360 (com ventoinha)', r: [40, 52, 55, 73], desc: 'Pistão, 4 cilindros opostos, carburado, refrigerado a ar pela ventoinha "gaiola de esquilo". 124 BHP contínuos (derated).' },
      { id: 'coneCauda', nome: 'Cone de cauda (tail boom)', r: [55, 40, 86, 53], desc: 'Leva o eixo de transmissão do rotor de cauda. Em baixa RPM a pá pode atingi-lo (blow-back).' },
      { id: 'estabilizador', nome: 'Estabilizadores (deriva e horizontal)', r: [83, 27, 90, 60], desc: 'Dão estabilidade em voo à frente. A deriva vertical ajuda numa perda de rotor de cauda acima de 70 KIAS.' },
      { id: 'rotorCauda', nome: 'Rotor de cauda', r: [88, 32, 97, 50], desc: 'Duas pás; cancela o torque do rotor principal e controla a guinada pelos pedais. Empurra o helicóptero de lado (deriva).' },
      { id: 'esquis', nome: 'Esquis (trem de pouso)', r: [19, 72, 53, 87], desc: 'Trem de pouso fixo. Decolagem em dois tempos: "leve nos esquis" e só depois ao pairado (SN-9).' },
    ],
  },
  {
    id: 'cockpit', titulo: 'Lado de dentro (cockpit)', arquivo: 'r22-cockpit.jpg',
    credito: 'Foto: NJR ZA, Wikimedia Commons, CC BY-SA 3.0 (cockpit de R22)',
    pecas: [
      { id: 'ciclico', nome: 'Cíclico em "T"', r: [14, 35, 54, 62], desc: 'Barra transversal que pivota num poste central: as duas manoplas comandam o mesmo cíclico. Trim lateral (RT TRIM) e fricção. Nunca empurre à frente de forma brusca (baixo G).' },
      { id: 'painel', nome: 'Painel de instrumentos', r: [48, 30, 75, 56], desc: 'Instrumentos de voo e de motor em um painel central, visto pelos dois assentos. Luzes de aviso na fileira de cima.' },
      { id: 'luzes', nome: 'Luzes de aviso (fileira no topo)', r: [55, 31, 66, 36], desc: 'OIL, MR TEMP, MR CHIP, TR CHIP, LOW FUEL, CLUTCH, ALT, STARTER ON, LOW RPM, GOV OFF, CO, BRAKE, FULL THROTTLE (POH 3-8 a 3-11).' },
      { id: 'velocimetro', nome: 'Velocímetro (KIAS)', r: [51, 35, 57, 43], desc: 'Arco verde 50–102 KIAS; Vne 102 até 3000 ft DA, caindo com altitude e temperatura (placa).' },
      { id: 'tacometro', nome: 'Tacômetro duplo (motor e rotor)', r: [59, 35, 66, 44], desc: 'Dois ponteiros: motor e rotor. Verde 101–104 %. Buzina e luz abaixo de 97 %. Em autorrotação os ponteiros se separam.' },
      { id: 'altimetro', nome: 'Altímetro', r: [52, 43, 58, 51], desc: 'Ajustado no QNH mostra altitude; em 1013 (QNE) mostra nível de voo. 1 hPa ≈ 30 ft.' },
      { id: 'map', nome: 'Pressão de admissão (MAP)', r: [61, 44, 68, 52], desc: 'Indica a potência que o motor está dando. Limite pela placa de MAP (altitude e OAT); +0,9 inHg por 5 min na decolagem.' },
      { id: 'console', nome: 'Console central (rádios e transponder)', r: [44, 60, 60, 90], desc: 'COM/NAV, transponder (7500/7600/7700), intercom. Mistura e aquecimento do carburador ficam no console.' },
      { id: 'pedais', nome: 'Pedais (assento direito)', r: [64, 68, 82, 86], desc: 'Mudam o passo do rotor de cauda. Pedal ESQUERDO ao subir o coletivo no R22; direito na pane de motor abaixo de 8 ft.' },
    ],
  },
];

export function montarIdentificar(root, aoTerminar) {
  const fila = [];
  for (const f of FOTOS) for (const p of f.pecas) fila.push({ foto: f, peca: p });
  fila.sort(() => Math.random() - 0.5);
  let i = 0, erros = 0, fotoAtual = null;
  root.innerHTML = `<div class="ident">
    <div class="ident-pedido">Toque em: <b id="idNome"></b> <span class="sub" id="idOnde"></span></div>
    <div class="ident-foto" id="idFoto"></div>
    <div class="ident-info" id="idInfo"></div>
    <div class="ident-prog" id="idProg"></div></div>`;
  const montarFoto = (f) => {
    fotoAtual = f; const box = root.querySelector('#idFoto');
    box.innerHTML = `<div class="ident-img-wrap"><img src="${BASE + f.arquivo}" alt="${f.titulo}" draggable="false">${f.pecas.map(p => `<button class="hot" data-id="${p.id}" style="left:${p.r[0]}%;top:${p.r[1]}%;width:${p.r[2] - p.r[0]}%;height:${p.r[3] - p.r[1]}%" aria-label="${p.nome}"></button>`).join('')}</div><div class="ident-credito">${f.titulo} · ${f.credito}</div>`;
    box.querySelectorAll('.hot').forEach(el => el.addEventListener('click', () => responder(el)));
  };
  const mostrar = () => {
    const { foto, peca } = fila[i];
    if (fotoAtual !== foto) montarFoto(foto);
    root.querySelector('#idNome').textContent = peca.nome; root.querySelector('#idOnde').textContent = `(${foto.titulo.toLowerCase()})`;
    root.querySelector('#idProg').textContent = `${i + 1} de ${fila.length} · erros: ${erros}`;
  };
  const responder = (el) => {
    const { foto, peca } = fila[i]; const info = root.querySelector('#idInfo');
    if (el.dataset.id === peca.id) { el.classList.add('certa'); info.innerHTML = `<b>${peca.nome}.</b> ${peca.desc}`; setTimeout(() => { el.classList.remove('certa'); i++; if (i >= fila.length) aoTerminar({ erros, total: fila.length }); else mostrar(); }, 1500); }
    else { erros++; const p = foto.pecas.find(x => x.id === el.dataset.id); el.classList.add('errada'); info.innerHTML = `Isso é <b>${p.nome}</b>. Procure: ${peca.nome}.`; setTimeout(() => el.classList.remove('errada'), 600); mostrar(); }
  };
  mostrar();
}
