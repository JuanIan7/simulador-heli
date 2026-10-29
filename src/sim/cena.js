// Mundo 3D (Three.js): aeródromo didático, helicóptero procedural, câmeras e marcadores das fases.
import * as THREE from 'three';

const D2R = Math.PI / 180;

function texturaGrama() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#6f9a4a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = `rgba(${60 + Math.random() * 60},${110 + Math.random() * 60},${40 + Math.random() * 40},0.5)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, 255, 255);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(400, 400);
  t.anisotropy = 4;
  return t;
}

function textoSprite(texto, cor = '#111', fundo = 'rgba(255,255,255,0.85)', tam = 64) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = fundo; g.beginPath(); g.roundRect(0, 0, 512, 128, 24); g.fill();
  g.fillStyle = cor; g.font = `bold ${tam}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto, 256, 64);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true });
  const s = new THREE.Sprite(m); s.scale.set(16, 4, 1);
  return s;
}

export class Cena {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fd3f5);
    this.scene.fog = new THREE.Fog(0xcfe6f5, 1500, 9000);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.5, 20000);
    this.modoCamera = 'atras';
    this.marcadores = new THREE.Group(); this.scene.add(this.marcadores);
    this.tempo = 0;
    this._luzes(); this._mundo();
    this.heli = null;
    this.redimensionar();
  }

  _luzes() {
    const hemi = new THREE.HemisphereLight(0xdff3ff, 0x6a8a44, 0.95); this.scene.add(hemi);
    const sol = new THREE.DirectionalLight(0xffffff, 1.25); sol.position.set(300, 600, -200); this.scene.add(sol);
  }

  _mundo() {
    const s = this.scene;
    // chão
    const chao = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshLambertMaterial({ map: texturaGrama() }));
    chao.rotation.x = -Math.PI / 2; s.add(chao);
    // pista 18/36 (norte-sul), 1000 m × 30 m; cabeceira 36 ao sul (decola para o norte)
    const pista = new THREE.Mesh(new THREE.PlaneGeometry(30, 1000), new THREE.MeshLambertMaterial({ color: 0x4b4b4b }));
    pista.rotation.x = -Math.PI / 2; pista.position.set(60, 0.05, 0); s.add(pista);
    const faixa = new THREE.Mesh(new THREE.PlaneGeometry(1, 900), new THREE.MeshBasicMaterial({ color: 0xf5f5f5 }));
    faixa.rotation.x = -Math.PI / 2; faixa.position.set(60, 0.08, 0); s.add(faixa);
    const num36 = textoSprite('36', '#fff', 'rgba(0,0,0,0)', 90); num36.position.set(60, 2, 470); s.add(num36);
    const num18 = textoSprite('18', '#fff', 'rgba(0,0,0,0)', 90); num18.position.set(60, 2, -470); s.add(num18);
    // pátio e heliponto (H) na origem
    const patio = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), new THREE.MeshLambertMaterial({ color: 0x8a8a8a }));
    patio.rotation.x = -Math.PI / 2; patio.position.set(0, 0.04, 0); s.add(patio);
    this.heliponto(0, 0, 'H');
    // taxiway ligando pátio à pista
    const tx = new THREE.Mesh(new THREE.PlaneGeometry(45, 12), new THREE.MeshLambertMaterial({ color: 0x5c5c5c }));
    tx.rotation.x = -Math.PI / 2; tx.position.set(42, 0.045, 0); s.add(tx);
    // hangares
    const matH = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
    const matTelhado = new THREE.MeshLambertMaterial({ color: 0xff6a00 });
    for (let i = 0; i < 3; i++) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 25), matH); h.position.set(-70, 5, -40 + i * 40); s.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(32, 1.5, 27), matTelhado); t.position.set(-70, 10.7, -40 + i * 40); s.add(t);
    }
    // torre de controle
    const torre = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 22, 12), matH); torre.position.set(-40, 11, 80); s.add(torre);
    const cabine = new THREE.Mesh(new THREE.CylinderGeometry(6, 5, 5, 12), new THREE.MeshLambertMaterial({ color: 0x3a6ea5, transparent: true, opacity: 0.8 })); cabine.position.set(-40, 24, 80); s.add(cabine);
    // biruta
    this.biruta = new THREE.Group();
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8), new THREE.MeshLambertMaterial({ color: 0xffffff })); mastro.position.y = 4; this.biruta.add(mastro);
    this.birutaCone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xff6a00, side: THREE.DoubleSide }));
    this.birutaCone.rotation.z = Math.PI / 2; this.birutaCone.position.set(2, 8, 0); this.biruta.add(this.birutaCone);
    this.biruta.position.set(40, 0, 40); s.add(this.biruta);
    // árvores e cidade ao longe
    const tronco = new THREE.CylinderGeometry(0.4, 0.6, 4, 6), copa = new THREE.ConeGeometry(3.5, 9, 8);
    const mT = new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), mC = new THREE.MeshLambertMaterial({ color: 0x2f7a3a });
    const arvores = new THREE.Group();
    for (let i = 0; i < 260; i++) {
      let x = (Math.random() - 0.5) * 3000, z = (Math.random() - 0.5) * 3000;
      if (Math.abs(x - 60) < 60 && Math.abs(z) < 560) continue; // fora da pista
      if (Math.abs(x) < 120 && Math.abs(z) < 120) continue;      // fora do pátio
      const g = new THREE.Group();
      const t = new THREE.Mesh(tronco, mT); t.position.y = 2; g.add(t);
      const c = new THREE.Mesh(copa, mC); c.position.y = 8; g.add(c);
      const e = 0.8 + Math.random() * 0.8; g.scale.set(e, e, e); g.position.set(x, 0, z);
      arvores.add(g);
    }
    s.add(arvores); this.arvores = arvores;
    // prédios (cidade a leste)
    const mP = new THREE.MeshLambertMaterial({ color: 0xbfc6cc });
    for (let i = 0; i < 60; i++) {
      const w = 15 + Math.random() * 25, h = 15 + Math.random() * 70;
      const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mP);
      p.position.set(1500 + Math.random() * 900, h / 2, (Math.random() - 0.5) * 1500); s.add(p);
    }
    // morros (serra ao norte e a oeste)
    const mM = new THREE.MeshLambertMaterial({ color: 0x5a7d4e });
    for (let i = 0; i < 28; i++) {
      const r = 300 + Math.random() * 700, h = 200 + Math.random() * 600;
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), mM);
      const ang = Math.PI * (0.9 + Math.random() * 1.0); // norte a oeste
      const d = 3500 + Math.random() * 3000;
      m.position.set(Math.sin(ang) * d, h / 2 - 20, -Math.cos(ang) * d * 0.9 - 800);
      s.add(m);
    }
    // lagoa (sul)
    const lagoa = new THREE.Mesh(new THREE.CircleGeometry(400, 32), new THREE.MeshLambertMaterial({ color: 0x4f9fcf }));
    lagoa.rotation.x = -Math.PI / 2; lagoa.position.set(-900, 0.03, 1400); s.add(lagoa);
  }

  heliponto(x, z, letra = 'H', cor = 0xffffff, raio = 9) {
    const g = new THREE.Group();
    const circ = new THREE.Mesh(new THREE.RingGeometry(raio - 0.6, raio, 40), new THREE.MeshBasicMaterial({ color: cor, side: THREE.DoubleSide }));
    circ.rotation.x = -Math.PI / 2; circ.position.y = 0.07; g.add(circ);
    const mat = new THREE.MeshBasicMaterial({ color: cor });
    const b1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 7), mat), b2 = b1.clone(), b3 = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), mat);
    b1.position.x = -2; b2.position.x = 2;
    [b1, b2, b3].forEach(b => { b.rotation.x = -Math.PI / 2; b.position.y = 0.08; g.add(b); });
    if (letra !== 'H') { const sp = textoSprite(letra, '#fff', 'rgba(0,0,0,0)', 80); sp.position.y = 3; g.add(sp); }
    g.position.set(x, 0, z); this.scene.add(g); return g;
  }

  // ---------- helicóptero procedural ----------
  criarHeli(ac) {
    if (this.heli) this.scene.remove(this.heli);
    const g = new THREE.Group();
    const esc = ac.raioRotorM / 3.84; // R22 = 1
    const corF = new THREE.MeshPhongMaterial({ color: ac.cores.fuselagem, shininess: 60 });
    const corFaixa = new THREE.MeshPhongMaterial({ color: ac.cores.faixa });
    const vidro = new THREE.MeshPhongMaterial({ color: 0x88bbee, transparent: true, opacity: 0.45, shininess: 100 });
    const metal = new THREE.MeshPhongMaterial({ color: 0x333333 });
    // cabine (bolha)
    const cab = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 14), corF); cab.scale.set(1.1, 1.0, 1.45); cab.position.set(0, 1.45, 0.2); g.add(cab);
    const bolha = new THREE.Mesh(new THREE.SphereGeometry(0.98, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), vidro); bolha.scale.set(1.08, 1.0, 1.42); bolha.position.set(0, 1.5, -0.1); bolha.rotation.x = -Math.PI / 2; g.add(bolha);
    // compartimento do motor
    const motor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.4), corFaixa); motor.position.set(0, 1.35, 1.5); g.add(motor);
    // mastro e cabeça do rotor
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8), metal); mastro.position.set(0, 2.5, 0.3); g.add(mastro);
    const cubo = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.3), metal); cubo.position.set(0, 3.1, 0.3); g.add(cubo);
    // rotor principal
    this.rotor = new THREE.Group(); this.rotor.position.set(0, 3.1, 0.3);
    const pa = new THREE.BoxGeometry(ac.raioRotorM, 0.05, 0.2); pa.translate(ac.raioRotorM / 2, 0, 0);
    for (let i = 0; i < ac.pasRotor; i++) { const p = new THREE.Mesh(pa, metal); p.rotation.y = i * 2 * Math.PI / ac.pasRotor; this.rotor.add(p); }
    this.disco = new THREE.Mesh(new THREE.CircleGeometry(ac.raioRotorM, 48), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.0, side: THREE.DoubleSide }));
    this.disco.rotation.x = -Math.PI / 2; this.rotor.add(this.disco);
    g.add(this.rotor);
    // cone de cauda
    const cauda = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 4.4 * esc, 10), corF); cauda.rotation.x = Math.PI / 2; cauda.position.set(0, 1.5, 2.2 + 2.2 * esc); g.add(cauda);
    const deriva = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.5), corFaixa); deriva.position.set(0, 2.0, 4.3 * esc + 0.3); g.add(deriva);
    const estab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.35), corFaixa); estab.position.set(0, 1.5, 3.6 * esc); g.add(estab);
    // rotor de cauda
    this.rotorCauda = new THREE.Group(); this.rotorCauda.position.set(0.25, 1.9, 4.4 * esc + 0.2);
    const pc = new THREE.BoxGeometry(0.05, ac.raioRotorM * 0.14 * 2, 0.1);
    for (let i = 0; i < 2; i++) { const p = new THREE.Mesh(pc, metal); p.rotation.x = i * Math.PI / 2; this.rotorCauda.add(p); }
    g.add(this.rotorCauda);
    // esquis
    const esqui = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6); esqui.rotateX(Math.PI / 2);
    for (const sx of [-0.9, 0.9]) {
      const e = new THREE.Mesh(esqui, metal); e.position.set(sx, 0.05, 0.3); g.add(e);
      for (const z of [-0.6, 1.2]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), metal); t.position.set(sx, 0.5, z); g.add(t); }
    }
    g.scale.set(esc, esc, esc);
    this.heli = g; this.scene.add(g);
    this.ac = ac;
    return g;
  }

  // ---------- marcadores de fase ----------
  limparMarcadores() { while (this.marcadores.children.length) this.marcadores.remove(this.marcadores.children[0]); }
  caixaAlvo(x, y, z, w = 6, h = 4, cor = 0xff6a00) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.18 }));
    b.position.set(x, y, z); this.marcadores.add(b);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, w)), new THREE.LineBasicMaterial({ color: cor })); e.position.set(x, y, z); this.marcadores.add(e);
    return b;
  }
  anel(x, y, z, raio = 12, cor = 0xff6a00, rotY = 0) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(raio, 0.5, 8, 32), new THREE.MeshBasicMaterial({ color: cor }));
    a.position.set(x, y, z); a.rotation.y = rotY; this.marcadores.add(a); return a;
  }
  cone(x, z, cor = 0xff6a00, alt = 2) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.6, alt, 8), new THREE.MeshLambertMaterial({ color: cor })); c.position.set(x, alt / 2, z); this.marcadores.add(c); return c;
  }
  arvore(x, z, alt = 14) {
    const g = new THREE.Group();
    g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, alt * 0.35, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2b })), { position: new THREE.Vector3(0, alt * 0.17, 0) }));
    g.add(Object.assign(new THREE.Mesh(new THREE.ConeGeometry(alt * 0.3, alt * 0.75, 8), new THREE.MeshLambertMaterial({ color: 0x2f7a3a })), { position: new THREE.Vector3(0, alt * 0.6, 0) }));
    g.position.set(x, 0, z); this.marcadores.add(g); return g;
  }
  rotulo(texto, x, y, z, cor = '#111') { const s = textoSprite(texto, cor); s.position.set(x, y, z); this.marcadores.add(s); return s; }

  // ---------- atualização ----------
  atualizar(h, dt) {
    this.tempo += dt;
    const g = this.heli; if (!g) return;
    g.position.set(h.pos.x, h.pos.y, h.pos.z);
    g.rotation.set(h.pitch, -h.yaw, -h.roll, 'YXZ');
    const rpm = h.rrpm / 100 * this.ac.rpmRotor100;
    const sentido = this.ac.sentidoRotor === 'antihorario' ? 1 : -1;
    this.rotor.rotation.y += sentido * rpm * 2 * Math.PI / 60 * dt;
    this.rotorCauda.rotation.x += rpm * 6 * 2 * Math.PI / 60 * dt;
    this.disco.material.opacity = Math.min(0.35, rpm / 500 * 0.35);
    // inclinação do disco com o cíclico (visual)
    this.rotor.rotation.x = -h.cicY * 0.12; this.rotor.rotation.z = -h.cicX * 0.12;
    // biruta
    const w = h.vento(); const vv = Math.hypot(w.x, w.z);
    this.biruta.rotation.y = -Math.atan2(w.x, -w.z) + Math.PI / 2;
    this.birutaCone.rotation.z = Math.PI / 2 - Math.min(0.9, 0.9 - vv / 10 * 0.9 + 0.0) + 0.0;
    this.birutaCone.rotation.z = Math.PI / 2 * Math.min(1, vv / 8);
    this._camera(h, dt);
  }

  _camera(h, dt) {
    const cam = this.camera, p = h.pos;
    const vib = h.vib * 0.08;
    const jx = (Math.random() - 0.5) * vib, jy = (Math.random() - 0.5) * vib;
    const esc = this.ac.raioRotorM / 3.84;
    if (this.modoCamera === 'cabine') {
      const ex = h.eixos();
      cam.position.set(p.x + ex.f.x * 0.6 * esc + ex.up.x * 1.5 * esc + jx, p.y + ex.f.y * 0.6 * esc + ex.up.y * 1.5 * esc + jy, p.z + ex.f.z * 0.6 * esc + ex.up.z * 1.5 * esc);
      cam.quaternion.setFromEuler(new THREE.Euler(h.pitch, -h.yaw, -h.roll, 'YXZ'));
      cam.fov = 75;
    } else if (this.modoCamera === 'externa') {
      const ang = this.tempo * 0.15;
      cam.position.set(p.x + Math.sin(ang) * 18 * esc, p.y + 7 * esc, p.z + Math.cos(ang) * 18 * esc);
      cam.lookAt(p.x, p.y + 1.5, p.z); cam.fov = 55;
    } else {
      // atrás: segue a proa com suavização
      const d = 16 * esc, alt = 6 * esc;
      const alvo = new THREE.Vector3(p.x - Math.sin(h.yaw) * d, p.y + alt, p.z + Math.cos(h.yaw) * d);
      if (!this._camPos) this._camPos = alvo.clone();
      this._camPos.lerp(alvo, 1 - Math.exp(-dt * 3));
      cam.position.copy(this._camPos); cam.position.x += jx; cam.position.y += jy;
      cam.position.y = Math.max(cam.position.y, 1.5);
      cam.lookAt(p.x, p.y + 1.5, p.z); cam.fov = 60;
    }
    cam.updateProjectionMatrix();
  }

  redimensionar() {
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  render() { this.renderer.render(this.scene, this.camera); }
}
