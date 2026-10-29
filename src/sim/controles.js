// Controles de toque (dois polegares), teclado (Mac) e giroscópio opcional (iPhone/Android).
// Esquerda: coletivo (barra vertical, fica onde você deixa) + pedais (barra horizontal, volta ao centro).
// Direita: cíclico (manche virtual, volta ao centro) ou inclinação do celular (giroscópio).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Controles {
  constructor(root) {
    this.root = root;
    this.coletivo = 0; this.cicX = 0; this.cicY = 0; this.pedal = 0; this.manete = 1;
    this.giro = false; this.giroOk = false; this._giroRef = null; this._giroAtual = { beta: 0, gamma: 0 };
    this.sens = 1.0; this.teclas = {};
    this.botoes = {};
    this._montar();
    this._teclado();
  }

  _montar() {
    const r = this.root; r.innerHTML = '';
    r.insertAdjacentHTML('beforeend', `
      <div class="ctl-esq">
        <div class="ctl-col" id="ctlCol"><div class="ctl-col-trilho"></div><div class="ctl-col-pino" id="ctlColPino"></div><div class="ctl-rotulo">COLETIVO</div></div>
        <div class="ctl-ped" id="ctlPed"><div class="ctl-ped-trilho"></div><div class="ctl-ped-pino" id="ctlPedPino"></div><div class="ctl-rotulo">PEDAIS</div></div>
      </div>
      <div class="ctl-dir">
        <div class="ctl-cic" id="ctlCic"><div class="ctl-cic-base"></div><div class="ctl-cic-pino" id="ctlCicPino"></div><div class="ctl-rotulo">CÍCLICO</div></div>
      </div>`);
    this.elCol = r.querySelector('#ctlCol'); this.elColPino = r.querySelector('#ctlColPino');
    this.elPed = r.querySelector('#ctlPed'); this.elPedPino = r.querySelector('#ctlPedPino');
    this.elCic = r.querySelector('#ctlCic'); this.elCicPino = r.querySelector('#ctlCicPino');
    this._arrastar(this.elCol, (nx, ny) => { this.coletivo = clamp(1 - ny, 0, 1); }, null, true);
    this._arrastar(this.elPed, (nx) => { this.pedal = clamp((nx - 0.5) * 2.2, -1, 1); }, () => { this.pedal = 0; });
    this._arrastar(this.elCic, (nx, ny) => { if (!this.giro) { this.cicX = clamp((nx - 0.5) * 2.2, -1, 1); this.cicY = clamp((0.5 - ny) * 2.2, -1, 1); } }, () => { if (!this.giro) { this.cicX = 0; this.cicY = 0; } });
    this.atualizarVisual();
  }

  _arrastar(el, mover, soltar, absoluto = false) {
    let ativo = null;
    const pos = (e) => { const b = el.getBoundingClientRect(); return [(e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height]; };
    el.addEventListener('pointerdown', (e) => { ativo = e.pointerId; el.setPointerCapture(e.pointerId); el.dataset.tocando = '1'; const [x, y] = pos(e); mover(x, y); e.preventDefault(); });
    el.addEventListener('pointermove', (e) => { if (ativo !== e.pointerId) return; const [x, y] = pos(e); mover(x, y); e.preventDefault(); });
    const fim = (e) => { if (ativo !== e.pointerId) return; ativo = null; delete el.dataset.tocando; if (soltar) soltar(); };
    el.addEventListener('pointerup', fim); el.addEventListener('pointercancel', fim);
    el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  }

  _teclado() {
    window.addEventListener('keydown', (e) => { this.teclas[e.code] = true; if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', (e) => { this.teclas[e.code] = false; });
  }

  // chamado a cada quadro: aplica teclado (quando usado) e giroscópio
  tick(dt) {
    const k = this.teclas;
    if (k.KeyW) this.coletivo = clamp(this.coletivo + 0.5 * dt, 0, 1);
    if (k.KeyS) this.coletivo = clamp(this.coletivo - 0.5 * dt, 0, 1);
    const tx = (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0), ty = (k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0);
    const tp = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    const tocCic = this.elCic.dataset.tocando, tocPed = this.elPed.dataset.tocando;
    if (tx || ty) { this.cicX = clamp(this.cicX + (tx * 0.7 - this.cicX) * dt * 6, -1, 1); this.cicY = clamp(this.cicY + (ty * 0.7 - this.cicY) * dt * 6, -1, 1); }
    else if (!this.giro && !tocCic) { this.cicX += (0 - this.cicX) * dt * 8; this.cicY += (0 - this.cicY) * dt * 8; }
    if (tp) this.pedal = clamp(this.pedal + (tp * 0.8 - this.pedal) * dt * 6, -1, 1);
    else if (!tocPed) this.pedal += (0 - this.pedal) * dt * 8;
    if (this.giro && this.giroOk && this._giroRef) {
      const dg = this._giroAtual.gamma - this._giroRef.gamma, db = this._giroAtual.beta - this._giroRef.beta;
      // paisagem: inclinar o aparelho para a frente = cíclico à frente; girar = cíclico lateral
      this.cicX = clamp(dg / 25 * this.sens, -1, 1);
      this.cicY = clamp(-db / 25 * this.sens, -1, 1);
    }
    this.atualizarVisual();
  }

  atualizarVisual() {
    this.elColPino.style.top = `${(1 - this.coletivo) * 82 + 4}%`;
    this.elPedPino.style.left = `${(this.pedal + 1) / 2 * 82 + 4}%`;
    this.elCicPino.style.left = `${(this.cicX + 1) / 2 * 80 + 10}%`;
    this.elCicPino.style.top = `${(1 - (this.cicY + 1) / 2) * 80 + 10}%`;
    this.elCic.classList.toggle('giro', this.giro);
  }

  async ligarGiro() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission(); // iOS: precisa vir de um toque
        if (r !== 'granted') return false;
      }
      if (!this._giroListener) {
        this._giroListener = (e) => {
          // em paisagem o eixo muda: usamos a orientação da tela para escolher os eixos
          const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
          let beta = e.beta ?? 0, gamma = e.gamma ?? 0;
          if (ang === 90) { const b = beta; beta = gamma; gamma = -b; }
          else if (ang === -90 || ang === 270) { const b = beta; beta = -gamma; gamma = b; }
          this._giroAtual = { beta, gamma };
          this.giroOk = true;
        };
        window.addEventListener('deviceorientation', this._giroListener);
      }
      this.giro = true; this._giroRef = null;
      setTimeout(() => this.calibrarGiro(), 300);
      return true;
    } catch { return false; }
  }
  calibrarGiro() { this._giroRef = { ...this._giroAtual }; }
  desligarGiro() { this.giro = false; this.cicX = 0; this.cicY = 0; }

  comando() { return { coletivo: this.coletivo, cicX: this.cicX, cicY: this.cicY, pedal: this.pedal, manete: this.manete }; }
  zerar() { this.coletivo = 0; this.cicX = 0; this.cicY = 0; this.pedal = 0; this.manete = 1; this.atualizarVisual(); }
}

// Vibração: Android tem navigator.vibrate; no iPhone o Safari não vibra (só um "tique" via <input switch> no toque).
export function vibrar(ms = 30) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} }
