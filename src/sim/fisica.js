// Modelo de voo simplificado para estudo. NÃO é um simulador certificado.
// Ideia: cada efeito que cai na prova (torque, efeito solo, sustentação translacional, VRS,
// baixa RPM, autorrotação, baixo G) tem um termo explícito aqui, com a referência da nota.
import { UN } from '../data/aeronaves.js';

const G = 9.80665;
const RHO0 = 1.225;
const { KT, FT } = UN;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Atmosfera: altitude-densidade (ft) a partir de altitude-pressão e OAT (fórmula clássica, 120 ft por °C de desvio ISA).
export function altitudeDensidade(hpFt, oatC) {
  const tIsa = 15 - 2 * hpFt / 1000;
  return hpFt + 120 * (oatC - tIsa);
}
export function sigma(daFt) { // razão de densidade
  return Math.pow(Math.max(0.05, 1 - 6.875e-6 * daFt), 4.256);
}

// Calibra o modelo pelos tetos publicados: o jogo reproduz os tetos IGE/OGE da nota por construção.
export function calibrar(ac) {
  const A = Math.PI * ac.raioRotorM ** 2;
  const W = ac.pesoMaxKg * G;
  const pInd = (T, s) => ac.din.kInduzido * T * Math.sqrt(T / (2 * RHO0 * s * A));
  const pProf = (s) => ac.din.potPerfilFrac * ac.potTopW * s;
  // 1) lapso de potência: P_avail(teto OGE) = P_req pairado OGE no peso máximo
  const sO = sigma(ac.tetoOgeFt);
  const pReqO = pInd(W, sO) + pProf(sO);
  const kLapse = clamp((1 - pReqO / ac.potTopW) / ac.tetoOgeFt, 0, 1e-4);
  // 2) ganho do efeito solo com os esquis no chão: P_avail(teto IGE) = P_req com empuxo W/GE
  const sI = sigma(ac.tetoIgeFt);
  const pAvI = ac.potTopW * Math.max(0.2, 1 - kLapse * ac.tetoIgeFt);
  let lo = 0.3, hi = 1.0; // fração do peso que o rotor "precisa" gerar com efeito solo
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const p = pInd(W * mid, sI) + pProf(sI);
    if (p > pAvI) hi = mid; else lo = mid;
  }
  const g0 = clamp(1 / lo - 1, 0.08, 0.6);
  return { kLapse, g0, A };
}

export class Helicoptero {
  constructor(ac, opts = {}) {
    this.ac = ac;
    this.cal = calibrar(ac);
    this.sinal = ac.sentidoRotor === 'antihorario' ? 1 : -1; // +1: torque guina o nariz para a direita
    this.assist = opts.assist ?? 0.6; // 0 = realista, 1 = muito assistido
    this.hubM = ac.raioRotorM * 0.65;  // altura do cubo acima dos esquis (est.)
    this.reset(opts);
  }

  reset(o = {}) {
    const ac = this.ac;
    this.pos = { x: o.x ?? 0, y: o.y ?? 0, z: o.z ?? 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.pitch = 0; this.roll = 0; this.yaw = o.yaw ?? 0; // rad; yaw = proa (0 = norte, horário)
    this.p = 0; this.q = 0; this.r = 0;
    this.coletivo = 0; this.cicX = 0; this.cicY = 0; this.pedal = 0; this.manete = 1;
    this.motor = o.motor ?? 'on';     // on | off | idle
    this.rrpm = o.rrpm ?? 102.5; this.erpm = this.rrpm;
    this.combustivelKg = (o.combustivelL ?? ac.combustivelL * 0.6) * ac.densidadeCombustivel;
    this.cargaKg = o.cargaKg ?? Math.min(ac.pesoMaxKg - ac.pesoVazioKg - this.combustivelKg, 170);
    this.hpFt = o.hpFt ?? 0; this.oatC = o.oatC ?? 25;
    this.ventoKt = o.ventoKt ?? 0; this.ventoDirDeg = o.ventoDirDeg ?? 0; this.rajadaKt = o.rajadaKt ?? 0;
    this.noSolo = true; this.crash = null; this.t = 0;
    this.flags = {}; this.eventos = [];
    this.vrsSev = 0; this.baixoG = 0; this.vib = 0; this.estolPa = 0; this.tempoAuto = 0;
    this.potEng = 0; this.potReq = 0; this.potAvail = 0; this.torqueN = 0; this.ge = 1; this.etl = 0;
    this.hvZona = false; this.nG = 1; this.alturaFt = 0; this.map = 0; this.tq = 0;
    this.buzina = false; this.fluxoTransverso = 0; this.ressonancia = 0; this.ressonanciaAtiva = false;
    this.tempoNoSolo = 0; this.tempoVoo = 0;
  }

  get massaKg() { return this.ac.pesoVazioKg + this.combustivelKg + this.cargaKg; }
  get daFt() { return altitudeDensidade(this.hpFt + this.pos.y / FT, this.oatC); }
  get velHorizMs() { return Math.hypot(this.vel.x, this.vel.z); }
  vento() { // vetor do vento (de onde SOPRA → para onde vai), m/s, no referencial mundo (x leste, z sul, norte = −z)
    const dir = (this.ventoDirDeg + 180) * Math.PI / 180;
    const v = (this.ventoKt + this.rajadaKt * Math.sin(this.t * 0.9) * Math.sin(this.t * 0.37)) * KT;
    return { x: Math.sin(dir) * v, z: -Math.cos(dir) * v };
  }
  // vetores do corpo no mundo (frente, cima, direita)
  eixos() {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const cr = Math.cos(this.roll), sr = Math.sin(this.roll);
    // frente: nivelado = (sy, 0, -cy); com pitch sobe
    const f = { x: sy * cp, y: sp, z: -cy * cp };
    // direita nivelada: (cy, 0, sy)
    const r0 = { x: cy, y: 0, z: sy };
    // cima = f × r0 girado pelo roll
    const u0 = { x: -sy * sp, y: cp, z: cy * sp };
    // roll positivo = inclinação à DIREITA: o "cima" tomba para a direita e o "direita" desce
    const right = { x: r0.x * cr - u0.x * sr, y: r0.y * cr - u0.y * sr, z: r0.z * cr - u0.z * sr };
    const up = { x: u0.x * cr + r0.x * sr, y: u0.y * cr + r0.y * sr, z: u0.z * cr + r0.z * sr };
    return { f, right, up };
  }
  vneKt() {
    const ac = this.ac, da = this.daFt;
    const base = this.motor === 'on' ? ac.vneKt : (ac.vneSemPotenciaKt ?? ac.vneKt);
    const queda = Math.max(0, da - 3000) / 1000 * ac.vneQuedaKtPor1000ft;
    return Math.max(50, base - queda);
  }
  mapLimite() { // placa R22/R44 aproximada: −0,21 inHg por 1000 ft e +0,03 por °C acima de 20 °C
    const hp = this.hpFt + this.pos.y / FT;
    return this.ac.mapLimiteSL - 0.6 - 0.0002125 * hp + 0.03 * (this.oatC - 20);
  }
  evento(nome, dados) { this.eventos.push({ nome, t: this.t, ...dados }); }

  update(dt, cmd) {
    if (this.crash) return;
    dt = Math.min(dt, 0.05);
    const ac = this.ac, din = ac.din;
    this.t += dt;
    // comandos com lag mecânico leve
    const lagC = Math.exp(-dt / 0.08);
    this.coletivo += (clamp(cmd.coletivo, 0, 1) - this.coletivo) * (1 - lagC);
    this.cicX += (clamp(cmd.cicX, -1, 1) - this.cicX) * (1 - lagC);
    this.cicY += (clamp(cmd.cicY, -1, 1) - this.cicY) * (1 - lagC);
    this.pedal += (clamp(cmd.pedal, -1, 1) - this.pedal) * (1 - lagC);
    this.manete = clamp(cmd.manete ?? 1, 0, 1);
    if (cmd.motor && cmd.motor !== this.motor) { this.motor = cmd.motor; this.evento('motor', { estado: cmd.motor }); }

    const m = this.massaKg, W = m * G;
    const da = this.daFt, s = sigma(da), rho = RHO0 * s;
    const A = this.cal.A, R = ac.raioRotorM;
    const omega = ac.rpmRotor100 * (this.rrpm / 100) * 2 * Math.PI / 60;
    const ex = this.eixos();
    const w = this.vento();
    const va = { x: this.vel.x - w.x, y: this.vel.y, z: this.vel.z - w.z }; // velocidade em relação ao ar
    const vFwd = va.x * ex.f.x + va.y * ex.f.y + va.z * ex.f.z;         // componente à frente (m/s)
    const vRight = va.x * ex.right.x + va.y * ex.right.y + va.z * ex.right.z;
    const vHoriz = Math.hypot(va.x, va.z);
    const kias = Math.max(0, vFwd) / KT;
    const descida = -this.vel.y; // m/s, positivo descendo
    const soloAqui = cmd.alturaSolo ?? 0; // chão sob o helicóptero (relevo); as fases acontecem na área plana (0)
    this.solo = soloAqui;
    this.alturaFt = (this.pos.y - soloAqui) / FT;

    // ---- Efeito solo (TVH 2): ganho de empuxo perto do chão, some perto de 1 diâmetro de rotor
    const hRotor = this.pos.y - soloAqui + this.hubM;
    const ge = 1 + this.cal.g0 * Math.pow(clamp((2 * R - hRotor) / (2 * R - this.hubM), 0, 1), 2);
    this.ge = ge;

    // ---- Sustentação translacional (TVH 12) e fluxo transverso (TVH 13)
    const etl = smooth(kias, ac.etlKt[0], ac.etlKt[1]);
    this.etl = etl;
    const ftl = 1 + 0.12 * etl; // empuxo "extra" ao cruzar a ETL
    this.fluxoTransverso = kias > 8 && kias < 20 ? 1 - Math.abs(kias - 14) / 6 : 0;

    // ---- Empuxo do rotor
    const Tmax = ac.pesoMaxKg * G * 1.9 * s * (this.rrpm / 100) ** 2;
    let wUp = 0, wRpm = 0; // fluxo subindo pelo disco (autorrotação / flare): wUp dá empuxo, wRpm dá RPM
    const emAuto = this.motor !== 'on' || this.manete < 0.15;
    if (emAuto) {
      const flare = Math.max(0, vFwd) * Math.sin(Math.max(0, this.pitch)) * 0.9; // flare: mais ar pelo disco
      wUp = Math.max(0, descida) + flare;
      wRpm = wUp + 0.12 * Math.max(0, vFwd); // a velocidade à frente também alimenta o rotor
    }
    let cEff = this.coletivo + 0.045 * wUp;
    // VRS (TVH 15, SN-22): abaixo de ~30 kt descendo rápido com potência, o rotor engole a própria esteira
    const condVrs = !emAuto && kias < 22 && vHoriz < 25 * KT && descida > 500 * FT / 60 && this.coletivo > 0.3;
    const alvoVrs = condVrs ? smooth(descida, 500 * FT / 60, 1100 * FT / 60) : 0;
    this.vrsSev += (alvoVrs - this.vrsSev) * (1 - Math.exp(-dt / (condVrs ? 1.5 : 0.8)));
    if (this.vrsSev > 0.25 && !this.flags.vrs) { this.flags.vrs = true; this.evento('vrs'); }
    if (this.vrsSev < 0.1) this.flags.vrs = false;
    const fVrs = 1 - 0.32 * this.vrsSev - 0.2 * this.vrsSev * this.coletivo;
    let T = clamp(cEff, 0, 1.25) * Tmax * ge * ftl * fVrs;

    // ---- Potência necessária e disponível (TVH 25; SN-10: potência ∝ RPM)
    const vh = Math.sqrt(Math.max(T, 1) / (2 * rho * A));
    let vi = vh;
    for (let i = 0; i < 3; i++) vi = vh * vh / Math.sqrt(vHoriz * vHoriz + vi * vi);
    const mu = vHoriz / Math.max(1, omega * R);
    const pInd = din.kInduzido * T * vi / ge; // efeito solo: menos velocidade induzida para o mesmo empuxo → menos potência
    const pProf = din.potPerfilFrac * ac.potTopW * s * (this.rrpm / 100) ** 3 * (1 + 4.65 * mu * mu);
    const pPar = 0.5 * rho * din.placaPlanaM2 * vHoriz ** 3;
    const pSubida = T * this.vel.y; // potência de subida (negativa na descida: descer devolve potência)
    const pReq = Math.max(0.3 * pProf, pInd + pProf + pPar + pSubida);
    const lapse = Math.max(0.2, 1 - this.cal.kLapse * da);
    const pMax = ac.potTopW * lapse * (this.motor === 'on' ? this.manete : 0);
    this.potReq = pReq; this.potAvail = pMax;

    // ---- RPM do rotor: governador segura 102–104 % enquanto sobra potência; senão a RPM cai (SN-10, SN-24)
    const alvo = (ac.faixaRpmMotorOn[0] + ac.faixaRpmMotorOn[1]) / 2;
    if (!emAuto) {
      this.potEng = Math.min(pReq, pMax);
      const deficit = (pReq - pMax) / ac.potTopW;
      if (deficit > 0) this.rrpm -= deficit * 8 * dt;
      else {
        const kGov = ac.inerciaRotor === 'baixa' ? 1.2 : 0.8;
        const atraso = din.atrasoTurbinaS ? 1 / (1 + din.atrasoTurbinaS) : 1;
        this.rrpm += clamp((alvo - this.rrpm) * kGov * atraso, -6, 4) * dt;
      }
      this.erpm = this.rrpm;
    } else {
      // Autorrotação (TVH 18, POH 4-10): o ar que sobe pelo disco gira o rotor; o coletivo freia
      this.potEng = 0;
      const kIn = ac.inerciaRotor === 'baixa' ? 0.6 : ac.inerciaRotor === 'media' ? 0.45 : 0.3;
      const w0 = 6.5 + 30 * this.coletivo;
      this.rrpm += kIn * (wRpm - w0) * dt;
      if (this.noSolo) this.rrpm -= 2 * dt;
      this.erpm = this.motor === 'off' ? Math.max(0, this.erpm - 15 * dt) : 65;
      this.tempoAuto += dt;
    }
    this.rrpm = clamp(this.rrpm, 0, 125);
    // Buzina de baixa RPM (POH 3-10) e estol catastrófico do rotor (POH 4-10)
    const buzina = this.rrpm < ac.buzinaBaixaRpm && this.coletivo > 0.08;
    if (buzina && !this.buzina) this.evento('buzina');
    this.buzina = buzina;
    const limEstol = ac.estolRotorBase + (this.hpFt + this.pos.y / FT) / 1000;
    if (this.rrpm < limEstol && !this.noSolo && this.coletivo > 0.2 && this.alturaFt > 12) {
      this.crash = { motivo: 'estolRotor', texto: `Estol do rotor: RPM caiu abaixo de ${limEstol.toFixed(0)} % (${ac.estolRotorBase} % + 1 % por 1000 ft). As pás tombam para trás (blow-back) e não há recuperação. Reflexo certo: coletivo para BAIXO e manete, antes de chegar aqui.` };
      this.evento('crash', this.crash); return;
    }
    if (this.rrpm > ac.avisoAltaRpm && !this.flags.altaRpm) { this.flags.altaRpm = true; this.evento('altaRpm'); }
    if (this.rrpm < ac.avisoAltaRpm - 2) this.flags.altaRpm = false;

    // Indicadores de potência
    const hp = this.hpFt + this.pos.y / FT;
    const pAmb = 29.92 * Math.pow(1 - 6.875e-6 * hp, 5.256);
    const mapTop = Math.min(pAmb, this.mapLimite() + 0.9);
    this.map = this.motor === 'on' ? clamp(ac.mapMarchaLenta + (mapTop - ac.mapMarchaLenta) * (this.potEng / Math.max(1, ac.potTopW * lapse)), 8, pAmb) : 0;
    this.tq = this.potEng / ac.potTopW * 100;

    // ---- Torque de reação (TVH 16) e rotor de cauda (CTH 18-21)
    const Q = this.potEng / Math.max(5, omega);
    const lT = R * 1.15; // braço do rotor de cauda (est.)
    const QmaxHover = (ac.potMcpW / (ac.rpmRotor100 * 2 * Math.PI / 60));
    const TtMax = QmaxHover / lT * 1.5;
    const Tt = TtMax * (0.5 - 0.5 * this.pedal * this.sinal); // pedal "esquerdo" (sinal) aumenta o empuxo da cauda
    const Izz = m * (R * 0.9) ** 2 * 0.35;
    const emVoo = !this.noSolo;
    let N = this.sinal * Q - this.sinal * Tt * lT; // + = nariz para a direita
    N -= 0.35 * Izz * this.r;                                  // amortecimento aerodinâmico
    N += 0.03 * Izz * vRight * vHoriz; // "cata-vento": com velocidade, a deriva alinha o nariz com o vento relativo
    // perda de efetividade do rotor de cauda em pane (fase 10/12 usa flag)
    if (cmd.paneCauda) N = this.sinal * Q - 0.35 * Izz * this.r;
    const rDot = emVoo ? N / Izz : 0;

    // ---- Atitude: comando de taxa com lag; assistência opcional nivela o disco (jogabilidade)
    const nivel = this.assist * 1.6;
    const D2R = Math.PI / 180;
    let qDes = -this.cicY * din.taxaArfagemDegS * D2R - nivel * 0.8 * this.pitch; // cíclico à frente (cicY>0) → nariz baixa
    let pDes = this.cicX * din.taxaRolamentoDegS * D2R - nivel * 0.8 * this.roll;  // cíclico à direita (cicX>0) → rola à direita
    // estabilidade com velocidade: nariz tende a subir com a velocidade (efeito de "flap-back")
    qDes += 0.004 * Math.max(0, vFwd) * (1 - this.assist * 0.7);
    // estol da pá que recua (TVH 15): acima da Vne, vibração, nariz sobe e rola para o lado da pá que recua
    const vne = this.vneKt();
    const estolPa = smooth(kias, vne, vne + 15);
    this.estolPa = estolPa;
    if (estolPa > 0.1 && !this.flags.estolPa) { this.flags.estolPa = true; this.evento('estolPa'); }
    if (estolPa < 0.05) this.flags.estolPa = false;
    qDes += estolPa * 0.5; pDes -= this.sinal * estolPa * 0.6;
    // VRS: comandos "moles" e sacudida
    const mole = 1 - 0.5 * this.vrsSev;
    const lag = din.lagS;
    if (emVoo) {
      this.q += (qDes * mole - this.q) * (1 - Math.exp(-dt / lag));
      this.p += (pDes * mole - this.p) * (1 - Math.exp(-dt / lag));
      this.r += rDot * dt;
    } else {
      this.q += (-this.pitch * 4 - this.q) * dt * 6;
      this.p += (-this.roll * 4 - this.p) * dt * 6;
      this.r *= Math.exp(-dt * 6);
    }
    // ---- Baixo G (SN-11): pushover com velocidade descarrega o rotor; cubo em gangorra perde o controle
    const nG = T / W + Math.max(0, vFwd) * this.q / G;
    this.nG = nG;
    if (emVoo && kias > 40 && nG < 0.45 && this.q < -0.15 && ac.pasRotor === 2) {
      this.baixoG = Math.min(1, this.baixoG + dt * 1.5);
      if (!this.flags.baixoG) { this.flags.baixoG = true; this.evento('baixoG'); }
    } else if (this.baixoG > 0) {
      if (this.cicY < -0.25) this.baixoG = Math.max(0, this.baixoG - dt * 2.5); // cíclico para trás recarrega o rotor
      else this.baixoG = Math.max(0, this.baixoG - dt * 0.3);
      if (this.baixoG === 0) this.flags.baixoG = false;
    }
    if (this.baixoG > 0.2) {
      this.p += this.sinal * this.baixoG * 1.8 * dt; // rolamento que se acelera
      if (Math.abs(this.cicX) > 0.5 && this.cicY > -0.25) {
        this.crash = { motivo: 'mastBumping', texto: 'Mast bumping: em baixo G, o cíclico lateral fez o cubo bater no mastro. Recuperação certa: cíclico PARA TRÁS, suave, para recarregar o rotor, e só depois corrigir o rolamento (SN-11).' };
        this.evento('crash', this.crash); return;
      }
    }
    this.pitch += this.q * dt; this.roll += this.p * dt; this.yaw += this.r * dt;
    this.pitch = clamp(this.pitch, -1.2, 1.2); this.roll = clamp(this.roll, -1.4, 1.4);
    if (this.yaw > Math.PI) this.yaw -= 2 * Math.PI; if (this.yaw < -Math.PI) this.yaw += 2 * Math.PI;

    // ---- Forças lineares
    const ex2 = this.eixos();
    const ax = T * ex2.up.x / m, ay = T * ex2.up.y / m - G, az = T * ex2.up.z / m;
    // deriva do rotor de cauda (TVH 16): o empuxo da cauda empurra o helicóptero para o lado
    const derivaT = this.sinal * Tt * 0.3 / m;
    // arrasto da fuselagem
    const vAir = Math.hypot(va.x, va.y, va.z);
    const kd = 0.5 * rho * din.placaPlanaM2 / m;
    const dragX = -kd * vAir * va.x, dragY = -kd * vAir * va.y * 2.5, dragZ = -kd * vAir * va.z;
    // arrasto vertical do rotor em autorrotação (paraquedas)
    const dragRotor = emAuto ? 0.5 * rho * A * 0.5 * Math.max(0, descida) ** 2 / m : 0;
    this.vel.x += (ax + dragX + derivaT * ex2.right.x) * dt;
    this.vel.y += (ay + dragY + dragRotor) * dt;
    this.vel.z += (az + dragZ + derivaT * ex2.right.z) * dt;

    // ---- Solo
    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
    const solo = cmd.alturaSolo ?? 0;
    if (this.pos.y <= solo) {
      const vDesc = -this.vel.y, vH = this.velHorizMs, vLat = Math.abs(vRight);
      if (!this.noSolo) {
        // toque
        let duro = null;
        const rollDeg = Math.abs(this.roll) * 57.3, pitchDeg = Math.abs(this.pitch) * 57.3;
        if (solo > 3 && (vH > 8 || vDesc > 4.0)) {
          this.crash = { motivo: 'cfit', texto: 'Colisão com o terreno (CFIT): o helicóptero bateu no morro. Planeje a altitude de cada perna acima do relevo, com margem, e suba antes de chegar à serra.' };
          this.evento('crash', this.crash); return;
        }
        if (vDesc > 4.0 || rollDeg > 14 || pitchDeg > 14 || vLat > 3.0 || vH > 15 * KT * 1.6) {
          this.crash = { motivo: 'pousoDuro', texto: vDesc > 4 ? `Toque muito forte: ${(vDesc / FT * 60).toFixed(0)} ft/min. Reduza a razão de descida antes dos 8 ft e amorteça com o coletivo.` : rollDeg > 14 || pitchDeg > 14 ? 'Tocou inclinado: esquis nivelados e nariz reto antes do toque.' : vLat > 3 ? 'Tocou com deslocamento lateral: risco de rolamento dinâmico. Zere a deriva antes de pousar.' : 'Tocou com velocidade à frente excessiva.' };
          this.evento('crash', this.crash); return;
        }
        if (vDesc > 2.0 || rollDeg > 7 || vLat > 1.5) { duro = true; this.evento('pousoDuro', { vDesc, rollDeg, vLat }); }
        else this.evento('pousou', { vDesc, vH, auto: emAuto });
        this.noSolo = true;
      }
      this.pos.y = solo; if (this.vel.y < 0) this.vel.y = 0;
      // atrito dos esquis
      const atrito = Math.exp(-dt * (T > 0.85 * W ? 1.0 : 4.0));
      this.vel.x *= atrito; this.vel.z *= atrito;
      // "leve nos esquis" → decola quando o empuxo supera o peso (POH 4-8: decolagem em dois tempos)
      if (T * ex2.up.y > W * 1.01 && this.rrpm > ac.buzinaBaixaRpm - 5) { this.noSolo = false; this.evento('decolou'); this.tempoNoSolo = 0; }
      this.tempoNoSolo += dt;
    } else {
      this.noSolo = false; this.tempoVoo += dt;
    }

    // ---- Diagrama H-V (POH 5-11): zona a evitar
    const hv = ac.hv; const hFt = this.alturaFt;
    const altoFt = hv.altoFt + (hv.altoFt7000 - hv.altoFt) * clamp(da / 7000, 0, 1.5);
    let dentro = false;
    if (!this.noSolo) {
      if (hFt > 15 && hFt < altoFt) {
        // fronteira: velocidade mínima segura cresce de 0 (em altoFt) até joelhoKt (em joelhoFt) e cai perto do solo
        let vMin;
        if (hFt >= hv.joelhoFt) vMin = hv.joelhoKt * (altoFt - hFt) / (altoFt - hv.joelhoFt);
        else vMin = hv.joelhoKt * (0.6 + 0.4 * hFt / hv.joelhoFt);
        dentro = kias < vMin;
      }
      if (hFt < hv.baixoFt && kias > hv.baixoKtMin) dentro = true;
    }
    if (dentro && !this.hvZona) this.evento('hvEntrou');
    this.hvZona = dentro;
    if (dentro) this.tempoHv = (this.tempoHv || 0) + dt; else this.tempoHv = 0;

    // ---- Combustível (consumo ∝ potência)
    const fracP = clamp(this.potEng / ac.potMcpW, 0.25, 1.3);
    this.combustivelKg = Math.max(0, this.combustivelKg - ac.consumoLh * ac.densidadeCombustivel * Math.pow(fracP, 0.8) / 3600 * dt);
    if (this.combustivelKg <= 0 && this.motor === 'on') { this.motor = 'off'; this.evento('paneSeca'); }

    // vibração composta (para a câmera e o áudio)
    this.vib = clamp(0.5 * this.fluxoTransverso + this.vrsSev + estolPa + (this.buzina ? 0.3 : 0) + this.ressonancia, 0, 2);
    this.kias = kias; this.vFwd = vFwd; this.vRight = vRight; this.descidaFtMin = descida / FT * 60; this.T = T; this.W = W;
    this.sigma = s; this.lapse = lapse;
  }
}
