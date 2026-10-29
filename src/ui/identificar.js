// Fase 1: toque na peça pedida no desenho esquemático (lateral) do helicóptero.
const PECAS = [
  { id: 'rotorPrincipal', nome: 'Rotor principal', desc: 'Gera sustentação e, inclinado pelo cíclico, o empuxo para frente e para os lados.' },
  { id: 'mastro', nome: 'Mastro', desc: 'Eixo que leva o torque da transmissão até o cubo do rotor. No R22 (cubo em gangorra) é onde acontece o mast bumping em baixo G.' },
  { id: 'swashplate', nome: 'Swashplate (prato oscilante / unidade misturadora)', desc: 'Converte os movimentos do cíclico e do coletivo em mudança de passo das pás: parte fixa embaixo, parte giratória em cima.' },
  { id: 'rotorCauda', nome: 'Rotor de cauda', desc: 'Cancela o torque do rotor principal e controla a guinada pelos pedais. Produz deriva lateral.' },
  { id: 'coneCauda', nome: 'Cone de cauda (tail boom)', desc: 'Leva a transmissão do rotor de cauda e sustenta os estabilizadores. Em baixa RPM, a pá pode atingi-lo (blow-back).' },
  { id: 'estabilizador', nome: 'Estabilizadores (deriva e horizontal)', desc: 'Dão estabilidade em voo à frente. Com perda do rotor de cauda, a deriva vertical ajuda acima de 70 KIAS (R22).' },
  { id: 'esquis', nome: 'Esquis (trem de pouso)', desc: 'Trem de pouso fixo. Decolagem em dois tempos: "leve nos esquis" antes do pairado (SN-9).' },
  { id: 'motor', nome: 'Motor (Lycoming O-360 no R22)', desc: 'Pistão, 4 cilindros, carburado, 124 BHP contínuos (derated). Ligado ao rotor por correias, embreagem e roda livre.' },
  { id: 'ciclico', nome: 'Cíclico', desc: 'Inclina o disco do rotor. No R22 é em "T", com barra transversal e trim lateral. Nunca empurre para a frente de forma brusca (baixo G).' },
  { id: 'coletivo', nome: 'Coletivo (com manete e governador)', desc: 'Muda o passo de todas as pás ao mesmo tempo. Na ponta, a manete de punho; o correlador abre a manete junto. Botão do governador na ponta.' },
  { id: 'pedais', nome: 'Pedais', desc: 'Mudam o passo do rotor de cauda. Pedal esquerdo ao subir o coletivo no R22; direito na pane de motor abaixo de 8 ft.' },
  { id: 'rodaLivre', nome: 'Embreagem + roda livre (sprag)', desc: 'A embreagem tensiona as correias na partida; a roda livre deixa o rotor girar mais rápido que o motor (autorrotação). Nunca decolar com a luz CLUTCH acesa.' },
];
const SVG = `
<svg viewBox="0 0 900 420" class="esq-svg">
  <defs><style>.pc{fill:#e9e9e9;stroke:#222;stroke-width:3;cursor:pointer;transition:fill .15s}.pc:hover{fill:#ffd2b3}.pc.certa{fill:#2ecc71}.pc.errada{fill:#e74c3c}.tx{font:14px system-ui;fill:#444}</style></defs>
  <!-- cone de cauda -->
  <polygon id="coneCauda" class="pc" points="470,205 790,222 790,238 470,262"/>
  <!-- estabilizadores -->
  <polygon id="estabilizador" class="pc" points="760,150 800,150 820,222 790,222 790,238 820,238 800,300 760,300 770,238 770,222"/>
  <!-- rotor de cauda -->
  <g id="rotorCauda" class="pc"><rect x="834" y="150" width="10" height="130" rx="4"/><circle cx="839" cy="215" r="10"/></g>
  <!-- esquis -->
  <g id="esquis" class="pc"><rect x="160" y="340" width="320" height="10" rx="5"/><rect x="230" y="290" width="8" height="55"/><rect x="400" y="290" width="8" height="55"/></g>
  <!-- cabine -->
  <path d="M150,230 C150,150 230,120 330,120 L430,125 C500,130 520,200 500,260 C490,295 420,300 330,298 C240,296 150,290 150,230 Z" fill="#f7f7f7" stroke="#222" stroke-width="3"/>
  <!-- motor -->
  <rect id="motor" class="pc" x="430" y="200" width="70" height="80" rx="8"/>
  <text class="tx" x="438" y="245">motor</text>
  <!-- roda livre / embreagem -->
  <g id="rodaLivre" class="pc"><circle cx="400" cy="160" r="22"/><circle cx="400" cy="160" r="9" fill="#fff"/></g>
  <!-- mastro -->
  <rect id="mastro" class="pc" x="384" y="60" width="16" height="80" rx="4"/>
  <!-- swashplate -->
  <g id="swashplate" class="pc"><ellipse cx="392" cy="112" rx="42" ry="9"/><ellipse cx="392" cy="100" rx="42" ry="9"/></g>
  <!-- rotor principal -->
  <g id="rotorPrincipal" class="pc"><rect x="40" y="50" width="700" height="9" rx="4"/><rect x="376" y="40" width="32" height="26" rx="6"/></g>
  <!-- cíclico -->
  <g id="ciclico" class="pc"><rect x="300" y="190" width="8" height="90" rx="3"/><circle cx="304" cy="186" r="10"/></g>
  <!-- coletivo -->
  <g id="coletivo" class="pc" transform="rotate(-35 250 280)"><rect x="200" y="276" width="100" height="9" rx="4"/><circle cx="200" cy="280" r="9"/></g>
  <!-- pedais -->
  <g id="pedais" class="pc"><rect x="180" y="258" width="22" height="12" rx="3"/><rect x="180" y="276" width="22" height="12" rx="3"/></g>
</svg>`;

export function montarIdentificar(root, aoTerminar) {
  const ordem = PECAS.slice().sort(() => Math.random() - 0.5);
  let i = 0, erros = 0;
  root.innerHTML = `<div class="ident"><div class="ident-pedido">Toque em: <b id="idNome"></b></div>${SVG}<div class="ident-info" id="idInfo"></div><div class="ident-prog" id="idProg"></div></div>`;
  const svg = root.querySelector('svg');
  const mostrar = () => { root.querySelector('#idNome').textContent = ordem[i].nome; root.querySelector('#idProg').textContent = `${i + 1} de ${ordem.length} · erros: ${erros}`; };
  svg.querySelectorAll('.pc').forEach(el => el.addEventListener('click', () => {
    const alvo = ordem[i]; const info = root.querySelector('#idInfo');
    if (el.id === alvo.id) { el.classList.add('certa'); info.innerHTML = `<b>${alvo.nome}.</b> ${alvo.desc}`; setTimeout(() => { el.classList.remove('certa'); i++; if (i >= ordem.length) aoTerminar({ erros, total: ordem.length }); else mostrar(); }, 1400); }
    else { erros++; el.classList.add('errada'); const p = PECAS.find(x => x.id === el.id); info.innerHTML = `Isso é <b>${p.nome}</b>. Procure: ${alvo.nome}.`; setTimeout(() => el.classList.remove('errada'), 600); mostrar(); }
  }));
  mostrar();
}
