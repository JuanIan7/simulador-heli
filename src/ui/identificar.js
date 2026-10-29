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
  let i = 0, fotoAtual = null, travado = false, errosNesta = 0;
  const reg = []; // por peça: { peca, foto, resultado: 'certa'|'apos-erro'|'consultada'|'pulada', erros }
  root.innerHTML = `<div class="ident">
    <div class="ident-pedido">Toque em: <b id="idNome"></b> <span class="sub" id="idOnde"></span></div>
    <div class="ident-foto" id="idFoto"></div>
    <div class="ident-info" id="idInfo"></div>
    <div class="quiz-rodape"><span class="ident-prog" id="idProg"></span><button class="btn btn-cinza" id="idVer">👁 Ver resposta</button><button class="btn btn-cinza" id="idPular">⏭ Pular</button><button class="btn btn-laranja" id="idProx" hidden>Próxima</button></div></div>`;
  const el = (s) => root.querySelector(s);
  const montarFoto = (f) => {
    fotoAtual = f;
    el('#idFoto').innerHTML = `<div class="ident-img-wrap" id="idWrap"><img src="${BASE + f.arquivo}" alt="${f.titulo}" draggable="false">${f.pecas.map(p => `<div class="hot" data-id="${p.id}" style="left:${p.r[0]}%;top:${p.r[1]}%;width:${p.r[2] - p.r[0]}%;height:${p.r[3] - p.r[1]}%"></div>`).join('')}</div><div class="ident-credito">${f.titulo} · ${f.credito}</div>`;
    // um único ouvinte na foto: decide pela posição do toque (as caixas se sobrepõem)
    el('#idWrap').addEventListener('pointerup', (e) => {
      const b = e.currentTarget.getBoundingClientRect();
      tocar(((e.clientX - b.left) / b.width) * 100, ((e.clientY - b.top) / b.height) * 100);
    });
  };
  const caixa = (id) => el(`.hot[data-id="${id}"]`);
  const marcar = (id, cls, ms) => { const c = caixa(id); if (!c) return; c.classList.add(cls); if (ms) setTimeout(() => c.classList.remove(cls), ms); };
  const mostrar = () => {
    const { foto, peca } = fila[i];
    if (fotoAtual !== foto) montarFoto(foto);
    root.querySelectorAll('.hot').forEach(h => h.className = 'hot');
    el('#idNome').textContent = peca.nome; el('#idOnde').textContent = `(${foto.titulo.toLowerCase()})`;
    el('#idProg').textContent = `${i + 1} de ${fila.length}`;
    el('#idInfo').innerHTML = ''; el('#idVer').hidden = false; el('#idPular').hidden = false; el('#idProx').hidden = true;
    travado = false; errosNesta = 0;
  };
  const concluir = (resultado, texto) => {
    const { foto, peca } = fila[i]; travado = true;
    reg.push({ peca, foto, resultado, erros: errosNesta });
    marcar(peca.id, resultado === 'certa' || resultado === 'apos-erro' ? 'certa' : 'revelada');
    el('#idInfo').innerHTML = texto; el('#idVer').hidden = true; el('#idPular').hidden = true;
    el('#idProx').hidden = false; el('#idProx').textContent = i === fila.length - 1 ? 'Ver resultado' : 'Próxima';
  };
  const tocar = (x, y) => {
    if (travado) return; // durante o retorno, toques extras não contam
    const { foto, peca } = fila[i];
    const dentro = foto.pecas.filter(p => x >= p.r[0] && x <= p.r[2] && y >= p.r[1] && y <= p.r[3]);
    if (dentro.some(p => p.id === peca.id)) { concluir(errosNesta ? 'apos-erro' : 'certa', `<b>${errosNesta ? 'Achou.' : 'Certo!'} ${peca.nome}.</b> ${peca.desc}`); return; }
    errosNesta++;
    if (!dentro.length) { el('#idInfo').innerHTML = `Aí não tem peça marcada. Procure: <b>${peca.nome}</b>. Se não souber, toque em "Ver resposta".`; return; }
    const menor = dentro.sort((a, b) => (a.r[2] - a.r[0]) * (a.r[3] - a.r[1]) - (b.r[2] - b.r[0]) * (b.r[3] - b.r[1]))[0];
    marcar(menor.id, 'errada', 700);
    el('#idInfo').innerHTML = `Isso é <b>${menor.nome}</b>. Procure: <b>${peca.nome}</b>.`;
  };
  el('#idVer').onclick = () => { if (travado) return; const { peca } = fila[i]; concluir('consultada', `<b>Resposta: ${peca.nome}</b> (destacada em azul). ${peca.desc}`); };
  el('#idPular').onclick = () => { if (travado || el('#idPular').hidden) return; const { peca } = fila[i]; reg.push({ peca, foto: fila[i].foto, resultado: 'pulada', erros: errosNesta }); proxima(); };
  el('#idProx').onclick = () => { if (el('#idProx').hidden) return; el('#idProx').hidden = true; proxima(); }; // toque duplo não pula peça
  const proxima = () => { i++; if (i >= fila.length) resultado(); else mostrar(); };
  const resultado = () => {
    const c = (r) => reg.filter(x => x.resultado === r);
    const certas = c('certa'), aposErro = c('apos-erro'), vistas = c('consultada'), puladas = c('pulada');
    const revisar = [...vistas, ...puladas, ...aposErro];
    root.innerHTML = `<div class="ident"><h2>Resultado: peças do R22</h2>
      <div class="placar">
        <div><b>${certas.length}</b><span>certas de primeira</span></div>
        <div><b>${aposErro.length}</b><span>acertou depois de errar</span></div>
        <div><b>${vistas.length}</b><span>viu a resposta</span></div>
        <div><b>${puladas.length}</b><span>pulou</span></div>
      </div>
      ${revisar.length ? `<section class="cartao"><h3>Para estudar</h3><ul class="revisar">${revisar.map(x => `<li><b>${x.peca.nome}</b> <span class="sub">(${x.foto.titulo.toLowerCase()} · ${x.resultado === 'consultada' ? 'viu a resposta' : x.resultado === 'pulada' ? 'pulou' : x.erros + ' erro(s) antes'})</span><br>${x.peca.desc}</li>`).join('')}</ul></section>` : '<section class="cartao">Acertou todas de primeira. 👏</section>'}
      <div class="grade-botoes"><button class="btn btn-laranja grande" id="idSeguir">Continuar para o mini-quiz</button></div></div>`;
    el('#idSeguir').onclick = () => aoTerminar({ total: fila.length, certas: certas.length, aposErro: aposErro.length, consultadas: vistas.length, puladas: puladas.length });
  };
  mostrar();
}
