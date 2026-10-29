// Painel de instrumentos desenhado em canvas: tacômetro duplo (motor/rotor), potência (MAP ou torque),
// velocímetro, altímetro, variômetro, proa e fio de guinada. Cores: laranja, branco, preto e cinza.
const KT = 0.514444, FT = 0.3048;
const LAR = '#ff6a00', BRA = '#ffffff', PRE = '#111111', CIN = '#8a8a8a', VER = '#2ecc71', AMA = '#f1c40f', VERM = '#e74c3c', MAG = '#e040fb';

function arco(g, cx, cy, r, a0, a1, cor, lw) { g.beginPath(); g.arc(cx, cy, r, a0, a1); g.strokeStyle = cor; g.lineWidth = lw; g.stroke(); }
function ponteiro(g, cx, cy, r, ang, cor, lw = 3) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); g.strokeStyle = cor; g.lineWidth = lw; g.lineCap = 'round'; g.stroke(); }
function fundo(g, cx, cy, r) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = 'rgba(20,20,20,0.82)'; g.fill(); g.strokeStyle = CIN; g.lineWidth = 2; g.stroke(); }
function texto(g, t, x, y, tam = 12, cor = BRA, al = 'center', peso = '') { g.fillStyle = cor; g.font = `${peso} ${tam}px system-ui, -apple-system, sans-serif`; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(t, x, y); }

export class Hud {
  constructor(canvas) { this.c = canvas; this.g = canvas.getContext('2d'); this.piscar = 0; }

  desenhar(h, ac, extra = {}) {
    const c = this.c, g = this.g;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = c.clientWidth, H = c.clientHeight;
    if (c.width !== W * dpr || c.height !== H * dpr) { c.width = W * dpr; c.height = H * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    this.piscar += 1;
    const compacto = W < 700;
    const r = compacto ? 30 : 40;
    const y = H - r - 8;
    const n = 6; const gap = compacto ? 6 : 10;
    const total = n * 2 * r + (n - 1) * gap;
    let x = (W - total) / 2 + r;
    // 1) tacômetro duplo
    this._tac(h, ac, x, y, r); x += 2 * r + gap;
    // 2) potência
    this._pot(h, ac, x, y, r); x += 2 * r + gap;
    // 3) velocímetro
    this._vel(h, ac, x, y, r); x += 2 * r + gap;
    // 4) altímetro
    this._alt(h, x, y, r, extra.nav); x += 2 * r + gap;
    // 5) variômetro
    this._vsi(h, x, y, r); x += 2 * r + gap;
    // 6) proa
    this._proa(h, x, y, r, extra.nav);
    // fio de guinada + luzes de aviso (topo)
    this._avisos(h, ac, W, H, compacto);
  }

  _tac(h, ac, cx, cy, r) {
    fundo(this.g, cx, cy, r);
    const g = this.g, a = (p) => (-225 + (p / 120) * 270) * Math.PI / 180; // 0–120 %
    const [v0, v1] = ac.faixaRpmMotorOn; const [a0, a1] = ac.faixaRpmMotorOff;
    arco(g, cx, cy, r - 5, a(a0), a(v0), AMA, 4); arco(g, cx, cy, r - 5, a(v0), a(v1), VER, 5); arco(g, cx, cy, r - 5, a(v1), a(a1), AMA, 4);
    arco(g, cx, cy, r - 5, a(a1), a(120), VERM, 4); arco(g, cx, cy, r - 5, a(0), a(a0), VERM, 3);
    ponteiro(g, cx, cy, r - 10, a(h.erpm), CIN, 3);      // motor
    ponteiro(g, cx, cy, r - 8, a(h.rrpm), LAR, 3);       // rotor
    texto(g, 'RPM', cx, cy + r * 0.45, r * 0.22, CIN);
    texto(g, `${h.rrpm.toFixed(0)}%`, cx, cy + r * 0.2, r * 0.3, h.buzina ? VERM : BRA, 'center', 'bold');
  }
  _pot(h, ac, cx, cy, r) {
    const g = this.g; fundo(g, cx, cy, r);
    if (ac.indicadorPotencia === 'MAP') {
      const lim = h.mapLimite();
      const a = (v) => (-225 + ((v - 10) / 20) * 270) * Math.PI / 180; // 10–30 inHg
      arco(g, cx, cy, r - 5, a(10), a(lim), VER, 4); arco(g, cx, cy, r - 5, a(lim), a(lim + 0.9), AMA, 4); arco(g, cx, cy, r - 5, a(lim + 0.9), a(30), VERM, 4);
      ponteiro(g, cx, cy, r - 8, a(h.map), LAR, 3);
      texto(g, 'MAP', cx, cy + r * 0.45, r * 0.22, CIN);
      texto(g, h.map.toFixed(1), cx, cy + r * 0.2, r * 0.3, h.map > lim + 0.9 ? VERM : BRA, 'center', 'bold');
    } else {
      const a = (v) => (-225 + (v / 120) * 270) * Math.PI / 180;
      const cont = ac.tqContinuo ?? 83, max = 100, trans = ac.tqTransitorio ?? 106;
      arco(g, cx, cy, r - 5, a(0), a(cont), VER, 4); arco(g, cx, cy, r - 5, a(cont), a(max), AMA, 4); arco(g, cx, cy, r - 5, a(max), a(trans), VERM, 4);
      ponteiro(g, cx, cy, r - 8, a(h.tq), LAR, 3);
      texto(g, 'TQ %', cx, cy + r * 0.45, r * 0.22, CIN);
      texto(g, h.tq.toFixed(0), cx, cy + r * 0.2, r * 0.3, h.tq > max ? VERM : BRA, 'center', 'bold');
    }
  }
  _vel(h, ac, cx, cy, r) {
    const g = this.g; fundo(g, cx, cy, r);
    const vne = h.vneKt(); const max = Math.max(160, vne + 20);
    const a = (v) => (-225 + (v / max) * 270) * Math.PI / 180;
    arco(g, cx, cy, r - 5, a(0), a(vne), VER, 4); arco(g, cx, cy, r - 5, a(vne), a(max), VERM, 4);
    for (let v = 0; v <= max; v += 20) { const an = a(v); g.beginPath(); g.moveTo(cx + Math.cos(an) * (r - 10), cy + Math.sin(an) * (r - 10)); g.lineTo(cx + Math.cos(an) * (r - 4), cy + Math.sin(an) * (r - 4)); g.strokeStyle = BRA; g.lineWidth = 1; g.stroke(); }
    ponteiro(g, cx, cy, r - 8, a(Math.max(0, h.kias)), LAR, 3);
    texto(g, 'KIAS', cx, cy + r * 0.45, r * 0.22, CIN);
    texto(g, h.kias.toFixed(0), cx, cy + r * 0.2, r * 0.3, h.kias > vne ? VERM : BRA, 'center', 'bold');
  }
  _alt(h, cx, cy, r, nav) {
    const g = this.g; fundo(g, cx, cy, r);
    const ft = h.pos.y / FT + h.hpFt; // altímetro: altitude (não a altura sobre o morro)
    if (nav && nav.altFt != null) { // marcador da altitude-alvo (magenta)
      const an = (-90 + ((nav.altFt + h.hpFt) % 1000) / 1000 * 360) * Math.PI / 180;
      g.beginPath(); g.moveTo(cx + Math.cos(an) * (r - 1), cy + Math.sin(an) * (r - 1)); g.lineTo(cx + Math.cos(an - 0.13) * (r - 11), cy + Math.sin(an - 0.13) * (r - 11)); g.lineTo(cx + Math.cos(an + 0.13) * (r - 11), cy + Math.sin(an + 0.13) * (r - 11)); g.closePath(); g.fillStyle = MAG; g.fill();
    }
    const a1 = (-90 + (ft % 1000) / 1000 * 360) * Math.PI / 180, a2 = (-90 + (ft % 10000) / 10000 * 360) * Math.PI / 180;
    for (let i = 0; i < 10; i++) { const an = (-90 + i * 36) * Math.PI / 180; texto(g, String(i), cx + Math.cos(an) * (r - 9), cy + Math.sin(an) * (r - 9), r * 0.2, BRA); }
    ponteiro(g, cx, cy, r - 16, a2, BRA, 4); ponteiro(g, cx, cy, r - 8, a1, LAR, 2);
    texto(g, 'ALT ft', cx, cy + r * 0.5, r * 0.2, CIN);
    texto(g, ft.toFixed(0), cx, cy + r * 0.25, r * 0.26, BRA, 'center', 'bold');
  }
  _vsi(h, cx, cy, r) {
    const g = this.g; fundo(g, cx, cy, r);
    const v = Math.max(-2000, Math.min(2000, -h.descidaFtMin));
    const a = (-180 + (v / 2000) * 170) * Math.PI / 180;
    arco(g, cx, cy, r - 5, (-180 - 170) * Math.PI / 180, (-180 + 170) * Math.PI / 180, CIN, 2);
    texto(g, '0', cx - r + 12, cy, r * 0.22, BRA); texto(g, '▲', cx, cy - r + 12, r * 0.22, BRA); texto(g, '▼', cx, cy + r - 12, r * 0.22, BRA);
    ponteiro(g, cx, cy, r - 8, a, LAR, 3);
    texto(g, 'ft/min', cx + 4, cy + r * 0.45, r * 0.2, CIN);
    texto(g, (-h.descidaFtMin).toFixed(0), cx + 4, cy + r * 0.2, r * 0.26, Math.abs(h.descidaFtMin) > 300 && h.kias < 30 && h.descidaFtMin > 0 ? VERM : BRA, 'center', 'bold');
  }
  _proa(h, cx, cy, r, nav) {
    const g = this.g; fundo(g, cx, cy, r);
    const proa = ((h.yaw * 180 / Math.PI) % 360 + 360) % 360;
    if (nav && nav.proaDeg != null && nav.dist > 25) { // ponteiro de rumo para o alvo (magenta)
      const an = (-90 + nav.proaDeg - proa) * Math.PI / 180;
      ponteiro(g, cx, cy, r - 4, an, MAG, 3);
      g.beginPath(); g.moveTo(cx + Math.cos(an) * (r - 1), cy + Math.sin(an) * (r - 1)); g.lineTo(cx + Math.cos(an - 0.22) * (r - 12), cy + Math.sin(an - 0.22) * (r - 12)); g.lineTo(cx + Math.cos(an + 0.22) * (r - 12), cy + Math.sin(an + 0.22) * (r - 12)); g.closePath(); g.fillStyle = MAG; g.fill();
    }
    for (let i = 0; i < 12; i++) { const an = (-90 + i * 30 - proa) * Math.PI / 180; const lab = i % 3 === 0 ? ['N', 'E', 'S', 'W'][i / 3] : String(i * 3); texto(g, lab, cx + Math.cos(an) * (r - 10), cy + Math.sin(an) * (r - 10), r * 0.2, i % 3 === 0 ? LAR : BRA); }
    // vento relativo
    const w = h.vento(); const wv = Math.hypot(w.x, w.z) / KT;
    if (wv > 1) { const de = Math.atan2(-w.x, w.z); const an = (-Math.PI / 2 + de - h.yaw); ponteiro(g, cx, cy, r - 14, an, '#3fa9f5', 2); }
    g.beginPath(); g.moveTo(cx, cy - 10); g.lineTo(cx - 5, cy + 6); g.lineTo(cx + 5, cy + 6); g.closePath(); g.fillStyle = LAR; g.fill();
    texto(g, `${proa.toFixed(0).padStart(3, '0')}°`, cx, cy + r * 0.55, r * 0.22, BRA, 'center', 'bold');
  }
  _avisos(h, ac, W, H, compacto) {
    const g = this.g;
    const luzes = [];
    if (h.buzina) luzes.push(['LOW RPM', VERM, true]);
    if (h.rrpm > ac.avisoAltaRpm) luzes.push(['ALTA RPM', AMA, true]);
    if (h.vrsSev > 0.3) luzes.push(['ANEL DE VÓRTICE', VERM, true]);
    if (h.estolPa > 0.1) luzes.push(['Vne / ESTOL DE PÁ', VERM, true]);
    if (h.baixoG > 0.2) luzes.push(['BAIXO G', VERM, true]);
    if (h.hvZona) luzes.push(['ZONA H-V', AMA, false]);
    if (h.fluxoTransverso > 0.5) luzes.push(['FLUXO TRANSVERSO', CIN, false]);
    if (h.etl > 0.95 && h.kias < 35) luzes.push(['ETL', VER, false]);
    if (h.ge > 1.06 && !h.noSolo) luzes.push(['EFEITO SOLO', VER, false]);
    if (h.motor !== 'on') luzes.push(['MOTOR ' + (h.motor === 'off' ? 'OFF' : 'IDLE'), AMA, false]);
    if (h.combustivelKg < ac.consumoLh * ac.densidadeCombustivel * 0.17) luzes.push(['LOW FUEL', AMA, true]);
    if (ac.indicadorPotencia === 'MAP' && h.map > h.mapLimite() + 0.9) luzes.push(['MAP', VERM, true]);
    if (ac.indicadorPotencia === 'TQ' && h.tq > 100) luzes.push(['TQ', VERM, true]);
    const tam = compacto ? 10 : 12; let x = 8; const y = 8;
    for (const [t, cor, pisca] of luzes) {
      if (pisca && Math.floor(this.piscar / 15) % 2) { x += t.length * tam * 0.62 + 18; continue; }
      g.fillStyle = cor; g.beginPath(); g.roundRect(x, y, t.length * tam * 0.62 + 12, tam + 10, 6); g.fill();
      texto(g, t, x + (t.length * tam * 0.62 + 12) / 2, y + (tam + 10) / 2, tam, cor === AMA || cor === CIN ? PRE : BRA, 'center', 'bold');
      x += t.length * tam * 0.62 + 18;
    }
    // fio de guinada (centro superior): mostra derrapagem
    const cx = W / 2, cy = compacto ? 34 : 44;
    const desl = Math.max(-1, Math.min(1, h.vRight / 8));
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy - 14); g.lineTo(cx - desl * 24, cy + 14); g.stroke();
    g.fillStyle = BRA; g.beginPath(); g.arc(cx, cy - 14, 3, 0, Math.PI * 2); g.fill();
    // G e combustível
    texto(g, `${h.nG.toFixed(1)} G`, W - 10, 14, compacto ? 11 : 13, h.nG < 0.5 ? VERM : BRA, 'right');
    texto(g, `COMB ${(h.combustivelKg / ac.densidadeCombustivel).toFixed(0)} L`, W - 10, 32, compacto ? 11 : 13, BRA, 'right');
    texto(g, `DA ${h.daFt.toFixed(0)} ft`, W - 10, 50, compacto ? 11 : 13, CIN, 'right');
  }
}
