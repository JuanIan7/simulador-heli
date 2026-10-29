// Mundo 3D (Three.js): céu HDRI (Poly Haven, CC0), terreno com relevo e texturas (ambientCG, CC0),
// vegetação instanciada (Kenney Nature Kit, CC0), modelos de helicóptero (Sketchfab/OpenGameArt, CC-BY)
// com rotor animado, sombras e marcadores das fases. Créditos em CREDITOS.md e na tela "Sobre".
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const BASE = import.meta.env.BASE_URL + 'assets/';
const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
const cache = {};
function carregarGltf(url) { return cache[url] ||= gltfLoader.loadAsync(url); }
function textura(nome, repeat = 1, srgb = true) {
  const t = texLoader.load(BASE + 'tex/' + nome);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function textoSprite(texto, cor = '#111', fundo = 'rgba(255,255,255,0.85)', tam = 64) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = fundo; g.beginPath(); g.roundRect(0, 0, 512, 128, 24); g.fill();
  g.fillStyle = cor; g.font = `bold ${tam}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto, 256, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(16, 4, 1);
  return s;
}
// ruído simples (value noise) para o relevo
function ruido(x, z) {
  const h = (i, j) => { const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return n - Math.floor(n); };
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  return (h(i, j) * (1 - sx) + h(i + 1, j) * sx) * (1 - sz) + (h(i, j + 1) * (1 - sx) + h(i + 1, j + 1) * sx) * sz;
}
export function elevacao(x, z) { // altura do terreno (m): plano até ~2,2 km do aeródromo, serra depois
  const d = Math.hypot(x, z);
  const f = Math.min(1, Math.max(0, (d - 2200) / 2500));
  let e = 0; let a = 1, fr = 1 / 2200;
  for (let o = 0; o < 4; o++) { e += a * ruido(x * fr + 7.3, z * fr + 2.1); a *= 0.5; fr *= 2.1; }
  const norte = Math.max(0, -z / 6000) * 0.6; // serra mais alta ao norte e a oeste
  const oeste = Math.max(0, -x / 6000) * 0.4;
  return f * f * (e * 650 * (1 + norte + oeste) - 120);
}

export class Cena {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fd3f5);
    this.scene.fog = new THREE.Fog(0xd6e6f2, 2500, 14000);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.5, 30000);
    this.modoCamera = 'atras';
    this.marcadores = new THREE.Group(); this.scene.add(this.marcadores);
    this.tempo = 0; this.heli = null; this.animRotor = [];
    this._luzes(); this._ceu(); this._terreno(); this._aerodromo(); this._vegetacao();
    this.redimensionar();
  }

  _luzes() {
    this.scene.add(new THREE.HemisphereLight(0xdff3ff, 0x5a7a3a, 0.55));
    const sol = new THREE.DirectionalLight(0xfff4e0, 2.2); sol.position.set(400, 700, 300);
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    const sc = sol.shadow.camera; sc.near = 50; sc.far = 2500; sc.left = sc.bottom = -60; sc.right = sc.top = 60; sol.shadow.bias = -0.0005;
    this.sol = sol; this.scene.add(sol); this.scene.add(sol.target);
  }
  _ceu() {
    const movel = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    new RGBELoader().load(BASE + 'ceu/' + (movel ? 'ceu_1k.hdr' : 'ceu_2k.hdr'), (t) => {
      console.log('céu HDRI carregado');
      t.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.background = t;
      const pm = new THREE.PMREMGenerator(this.renderer); this.scene.environment = pm.fromEquirectangular(t).texture; pm.dispose();
      this.scene.environmentIntensity = 0.9;
    }, undefined, (e) => console.warn('céu não carregou', e));
  }
  _terreno() {
    const s = this.scene;
    // chão plano texturizado (aeródromo e arredores)
    const grama = textura('grama_cor.jpg', 600), gramaN = textura('grama_normal.jpg', 600, false);
    const chao = new THREE.Mesh(new THREE.CircleGeometry(2600, 64), new THREE.MeshStandardMaterial({ map: grama, normalMap: gramaN, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1 }));
    chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; s.add(chao);
    // relevo ao redor (serra), com cores por altura
    const N = 180, L = 30000; const geo = new THREE.PlaneGeometry(L, L, N, N); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position; const cores = new Float32Array(pos.count * 3);
    const cVerde = new THREE.Color(0xa8c87a), cMato = new THREE.Color(0x7fa35a), cRocha = new THREE.Color(0xb8ad9c), cNeve = new THREE.Color(0xf2efe8);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i); const y = elevacao(x, z); pos.setY(i, y - 0.3);
      const t = Math.max(0, Math.min(1, y / 900)); const c = new THREE.Color();
      if (t < 0.25) c.lerpColors(cVerde, cMato, t / 0.25); else if (t < 0.7) c.lerpColors(cMato, cRocha, (t - 0.25) / 0.45); else c.lerpColors(cRocha, cNeve, (t - 0.7) / 0.3);
      cores[i * 3] = c.r; cores[i * 3 + 1] = c.g; cores[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cores, 3)); geo.computeVertexNormals();
    const serraTex = textura('grama_cor.jpg', 900);
    const serra = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: serraTex, vertexColors: true, roughness: 1 }));
    serra.receiveShadow = true; s.add(serra);
    // lagoa com reflexo do céu
    const lagoa = new THREE.Mesh(new THREE.CircleGeometry(420, 48), new THREE.MeshStandardMaterial({ color: 0x2f6f9f, roughness: 0.08, metalness: 0.1 }));
    lagoa.rotation.x = -Math.PI / 2; lagoa.position.set(-900, 0.05, 1400); s.add(lagoa);
  }
  _aerodromo() {
    const s = this.scene;
    const asfalto = textura('asfalto_cor.jpg', 1), asfaltoN = textura('asfalto_normal.jpg', 1, false);
    asfalto.repeat.set(3, 100); asfaltoN.repeat.set(3, 100);
    const pista = new THREE.Mesh(new THREE.PlaneGeometry(30, 1000), new THREE.MeshStandardMaterial({ map: asfalto, normalMap: asfaltoN, roughness: 0.95 }));
    pista.rotation.x = -Math.PI / 2; pista.position.set(60, 0.06, 0); pista.receiveShadow = true; s.add(pista);
    const mBranco = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 });
    for (let i = -14; i <= 14; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 18), mBranco); f.rotation.x = -Math.PI / 2; f.position.set(60, 0.09, i * 30); s.add(f); }
    for (const [z, rot] of [[470, 0], [-470, Math.PI]]) { for (let k = 0; k < 2; k++) for (let j = -2; j <= 2; j++) { const t = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 14), mBranco); t.rotation.x = -Math.PI / 2; t.position.set(60 + j * 4 + (k ? 0 : 0), 0.09, z - (k ? 0 : 0)); if (k === 1) continue; s.add(t); } }
    const n36 = textoSprite('36', '#fff', 'rgba(0,0,0,0)', 90); n36.position.set(60, 3, 440); s.add(n36);
    const n18 = textoSprite('18', '#fff', 'rgba(0,0,0,0)', 90); n18.position.set(60, 3, -440); s.add(n18);
    // pátio e taxiway em concreto
    const concreto = textura('concreto_cor.jpg', 1), concretoN = textura('concreto_normal.jpg', 1, false); concreto.repeat.set(10, 8); concretoN.repeat.set(10, 8);
    const patio = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), new THREE.MeshStandardMaterial({ map: concreto, normalMap: concretoN, roughness: 0.9, color: 0x8f8f8f }));
    patio.rotation.x = -Math.PI / 2; patio.position.set(0, 0.05, 0); patio.receiveShadow = true; s.add(patio);
    const tx = new THREE.Mesh(new THREE.PlaneGeometry(50, 14), new THREE.MeshStandardMaterial({ map: asfalto.clone(), roughness: 0.95 })); tx.material.map.repeat.set(5, 1.4); tx.material.map.needsUpdate = true;
    tx.rotation.x = -Math.PI / 2; tx.position.set(45, 0.055, 0); s.add(tx);
    this.heliponto(0, 0, 'H');
    // hangares e torre
    const mParede = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.85 });
    const mTelhado = new THREE.MeshStandardMaterial({ color: 0xff6a00, roughness: 0.6, metalness: 0.2 });
    const mVidro = new THREE.MeshStandardMaterial({ color: 0x6fa8d6, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 3; i++) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(32, 10, 26), mParede); h.position.set(-75, 5, -45 + i * 42); h.castShadow = true; h.receiveShadow = true; s.add(h);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 34, 3, 1, false, 0, Math.PI), mTelhado); t.rotation.z = Math.PI / 2; t.rotation.y = Math.PI / 2; t.position.set(-75, 10, -45 + i * 42); t.scale.set(0.35, 1, 1); s.add(t);
      const porta = new THREE.Mesh(new THREE.PlaneGeometry(22, 8), new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.7, metalness: 0.5 })); porta.position.set(-58.9, 4, -45 + i * 42); porta.rotation.y = Math.PI / 2; s.add(porta);
    }
    const torre = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 22, 16), mParede); torre.position.set(-40, 11, 80); torre.castShadow = true; s.add(torre);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 5.5, 5, 16), mVidro); cab.position.set(-40, 24.5, 80); s.add(cab);
    const topo = new THREE.Mesh(new THREE.CylinderGeometry(7, 6.8, 1, 16), mTelhado); topo.position.set(-40, 27.5, 80); s.add(topo);
    // biruta
    this.biruta = new THREE.Group();
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8), mParede); mastro.position.y = 4; this.biruta.add(mastro);
    this.birutaCone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xff6a00, side: THREE.DoubleSide })); this.birutaCone.position.set(2, 8, 0); this.biruta.add(this.birutaCone);
    this.biruta.position.set(40, 0, 40); s.add(this.biruta);
    // cidade a leste (prédios com vidro)
    const mPredio = new THREE.MeshStandardMaterial({ color: 0xc9ced3, roughness: 0.6, metalness: 0.2 });
    for (let i = 0; i < 70; i++) {
      const w = 15 + Math.random() * 25, h = 15 + Math.random() * 80;
      const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), i % 3 ? mPredio : mVidro);
      p.position.set(1500 + Math.random() * 1000, h / 2, (Math.random() - 0.5) * 1600); s.add(p);
    }
  }
  async _vegetacao() {
    const tipos = [['tree_pineTallA', 16], ['tree_pineTallB', 15], ['tree_pineDefaultA', 12], ['tree_oak', 11], ['tree_detailed', 12], ['tree_default', 10], ['tree_fat', 10], ['tree_tall', 14]];
    const pontos = [];
    for (let i = 0; i < 1400; i++) {
      const x = (Math.random() - 0.5) * 5200, z = (Math.random() - 0.5) * 5200;
      if (Math.abs(x - 60) < 70 && Math.abs(z) < 580) continue;
      if (Math.abs(x) < 140 && Math.abs(z) < 140) continue;
      if (x > 1350 && Math.abs(z) < 900) continue;              // cidade
      if (Math.hypot(x + 900, z - 1400) < 460) continue;        // lagoa
      if (Math.hypot(x + 600, z - 500) < 36 && Math.hypot(x + 600, z - 500) > 28) continue; // clareira da fase 9 fica para os marcadores
      pontos.push({ x, z, y: elevacao(x, z), tipo: Math.floor(Math.random() * tipos.length), esc: 0.75 + Math.random() * 0.6, rot: Math.random() * Math.PI * 2 });
    }
    for (let ti = 0; ti < tipos.length; ti++) {
      const [nome, alturaM] = tipos[ti];
      let g; try { g = await carregarGltf(BASE + 'natureza/' + nome + '.glb'); } catch { continue; }
      const raiz = g.scene; const caixa = new THREE.Box3().setFromObject(raiz); const tam = caixa.getSize(new THREE.Vector3());
      const escBase = alturaM / tam.y; const meus = pontos.filter(p => p.tipo === ti);
      raiz.updateMatrixWorld(true);
      raiz.traverse((o) => {
        if (!o.isMesh) return;
        const nome = (o.material && o.material.name || '').toLowerCase();
        const cor = /leaf|folha/.test(nome) ? (nome.includes('dark') ? 0x2f6b2f : 0x3f8a3a) : /bark|wood|trunk/.test(nome) ? 0x6b4a2b : /rock|stone/.test(nome) ? 0x8a8378 : 0x4f8a3f;
        const mat = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.95, metalness: 0 });
        const inst = new THREE.InstancedMesh(o.geometry, mat, meus.length);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
        meus.forEach((pt, k) => {
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pt.rot); const e = escBase * pt.esc; sc.set(e, e, e); p.set(pt.x, pt.y - caixa.min.y * e, pt.z);
          m.compose(p, q, sc).multiply(o.matrixWorld); inst.setMatrixAt(k, m);
        });
        inst.castShadow = true; inst.frustumCulled = false; this.scene.add(inst);
      });
    }
  }

  heliponto(x, z, letra = 'H', cor = 0xffffff, raio = 9) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8 });
    const circ = new THREE.Mesh(new THREE.RingGeometry(raio - 0.6, raio, 48), mat); circ.rotation.x = -Math.PI / 2; circ.position.y = 0.08; g.add(circ);
    const b1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 7), mat), b2 = b1.clone(), b3 = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), mat);
    b1.position.x = -2; b2.position.x = 2;
    [b1, b2, b3].forEach(b => { b.rotation.x = -Math.PI / 2; b.position.y = 0.09; g.add(b); });
    if (letra !== 'H') { const sp = textoSprite(letra, '#fff', 'rgba(0,0,0,0)', 80); sp.position.y = 3; g.add(sp); }
    g.position.set(x, 0, z); this.scene.add(g); return g;
  }

  // ---------- helicóptero: modelo carregado (CC-BY) com rotor animado; o procedural é a reserva ----------
  async criarHeli(ac) {
    if (this.heli) this.scene.remove(this.heli);
    this.ac = ac; this.animRotor = [];
    const g = new THREE.Group(); this.heli = g; this.scene.add(g);
    this._procedural(g, ac); // aparece na hora; o modelo substitui quando carregar
    const arquivo = ac.pasRotor === 3 ? 'as350.glb' : 'r44.gltf'; // família Robinson usa o modelo do R44 (CC-BY); Esquilo usa o AS350 (CC-BY)
    try {
      const gl = await carregarGltf(BASE + 'modelos/' + arquivo);
      if (this.ac !== ac) return g;
      const modelo = gl.scene.clone(true);
      this._prepararModelo(modelo, ac, arquivo);
      while (g.children.length) g.remove(g.children[0]);
      this.animRotor = this.animRotor.filter(r => r.doModelo);
      g.add(modelo); this.procedural = false;
    } catch (e) { console.warn('modelo não carregou, usando o procedural', e); }
    return g;
  }
  _prepararModelo(modelo, ac, arquivo) {
    modelo.updateMatrixWorld(true);
    // remove planos de chão/sombra embutidos no modelo (malha plana com pouquíssimos vértices)
    const lixo = []; modelo.traverse(o => { if (o.isMesh && o.geometry.attributes.position.count <= 8) { o.geometry.computeBoundingBox(); const s = o.geometry.boundingBox.getSize(new THREE.Vector3()); if (Math.min(s.x, s.y, s.z) < 0.01 * Math.max(s.x, s.y, s.z)) lixo.push(o); } });
    lixo.forEach(o => o.parent.remove(o));
    // escala: envergadura do rotor = maior dimensão horizontal
    const caixa = new THREE.Box3().setFromObject(modelo); const tam = caixa.getSize(new THREE.Vector3());
    const esc = (ac.raioRotorM * 2) / Math.max(tam.x, tam.z);
    modelo.scale.setScalar(esc);
    // nariz para −Z: a cauda é a parte mais longa e fina; descobrimos de que lado ela está pelo centro de massa dos vértices
    const meshes = []; modelo.traverse(o => { if (o.isMesh) meshes.push(o); });
    let somaZ = 0, n = 0;
    for (const m of meshes) { const b = new THREE.Box3().setFromObject(m); const c = b.getCenter(new THREE.Vector3()); const s = b.getSize(new THREE.Vector3()); somaZ += c.z * s.x * s.y * s.z; n += s.x * s.y * s.z; }
    const cauda = somaZ / Math.max(n, 1e-6);
    if (cauda < 0) modelo.rotation.y = Math.PI; // cauda em −Z no modelo original → gira para a cauda ficar em +Z (nariz em −Z)
    modelo.updateMatrixWorld(true);
    const caixa2 = new THREE.Box3().setFromObject(modelo);
    modelo.position.y -= caixa2.min.y; modelo.position.x -= (caixa2.min.x + caixa2.max.x) / 2;
    modelo.updateMatrixWorld(true);
    // rotor principal: malha mais larga e fina no topo; rotor de cauda: malha fina e vertical na cauda
    let principal = null, maiorL = 0, cauda2 = null, melhorC = 0;
    const topoY = caixa2.max.y;
    for (const m of meshes) {
      const b = new THREE.Box3().setFromObject(m); const s = b.getSize(new THREE.Vector3()); const c = b.getCenter(new THREE.Vector3());
      const L = Math.max(s.x, s.z), fino = s.y < L * 0.08;
      if (fino && L > maiorL && c.y > topoY - L * 0.6) { maiorL = L; principal = { m, c, eixo: 'y' }; }
      const Lv = Math.max(s.y, s.z); const finoX = s.x < Lv * 0.15 && s.x < 0.3 && c.z > 0.4 * caixa2.max.z;
      if (finoX && Lv > melhorC && Lv > 0.3 * ac.raioRotorM * 0.28 && Lv < ac.raioRotorM * 0.8) { melhorC = Lv; cauda2 = { m, c, eixo: 'x' }; }
    }
    for (const r of [principal, cauda2]) {
      if (!r) continue;
      const pai = r.m.parent; const pivo = new THREE.Group();
      pai.updateMatrixWorld(true);
      const cLocal = pai.worldToLocal(r.c.clone()); pivo.position.copy(cLocal); pai.add(pivo);
      pivo.attach(r.m); this.animRotor.push({ pivo, eixo: r.eixo, fator: r.eixo === 'y' ? 1 : 6, doModelo: true });
    }
    // disco borrado no rotor principal
    if (principal) {
      const disco = new THREE.Mesh(new THREE.CircleGeometry(ac.raioRotorM, 48), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false }));
      disco.rotation.x = -Math.PI / 2; disco.position.copy(principal.c).y += 0.02; this.disco = disco; this.heli.add(disco);
    }
    // material e sombras
    const porArea = meshes.map(m => { const s = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()); return [s.x * s.y * s.z, m]; }).sort((a, b) => b[0] - a[0]);
    if (arquivo === 'r44.gltf' && porArea[0]) {
      const mat = porArea[0][1].material; if (mat && mat.color) { porArea[0][1].material = mat.clone(); porArea[0][1].material.color.setHex(ac.cores.fuselagem); porArea[0][1].material.roughness = 0.35; porArea[0][1].material.metalness = 0.15; }
    }
    modelo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; if (o.material && o.material.isMeshStandardMaterial) { o.material.envMapIntensity = 0.9; } } });
  }
  _procedural(g, ac) {
    const esc = ac.raioRotorM / 3.84;
    const corF = new THREE.MeshStandardMaterial({ color: ac.cores.fuselagem, roughness: 0.35, metalness: 0.1 });
    const corFaixa = new THREE.MeshStandardMaterial({ color: ac.cores.faixa, roughness: 0.5 });
    const vidro = new THREE.MeshStandardMaterial({ color: 0x88bbee, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.3 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.6 });
    const cab = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 14), corF); cab.scale.set(1.1, 1.0, 1.45); cab.position.set(0, 1.45, 0.2); g.add(cab);
    const bolha = new THREE.Mesh(new THREE.SphereGeometry(0.98, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), vidro); bolha.scale.set(1.08, 1.0, 1.42); bolha.position.set(0, 1.5, -0.1); bolha.rotation.x = -Math.PI / 2; g.add(bolha);
    const motor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.4), corFaixa); motor.position.set(0, 1.35, 1.5); g.add(motor);
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8), metal); mastro.position.set(0, 2.5, 0.3); g.add(mastro);
    const rotor = new THREE.Group(); rotor.position.set(0, 3.1, 0.3);
    const pa = new THREE.BoxGeometry(ac.raioRotorM, 0.05, 0.2); pa.translate(ac.raioRotorM / 2, 0, 0);
    for (let i = 0; i < ac.pasRotor; i++) { const p = new THREE.Mesh(pa, metal); p.rotation.y = i * 2 * Math.PI / ac.pasRotor; rotor.add(p); }
    g.add(rotor);
    const cauda = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 4.4 * esc, 10), corF); cauda.rotation.x = Math.PI / 2; cauda.position.set(0, 1.5, 2.2 + 2.2 * esc); g.add(cauda);
    const deriva = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.5), corFaixa); deriva.position.set(0, 2.0, 4.3 * esc + 0.3); g.add(deriva);
    const rc = new THREE.Group(); rc.position.set(0.25, 1.9, 4.4 * esc + 0.2);
    const pc = new THREE.BoxGeometry(0.05, ac.raioRotorM * 0.28, 0.1); for (let i = 0; i < 2; i++) { const p = new THREE.Mesh(pc, metal); p.rotation.x = i * Math.PI / 2; rc.add(p); } g.add(rc);
    const esqui = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6); esqui.rotateX(Math.PI / 2);
    for (const sx of [-0.9, 0.9]) { const e = new THREE.Mesh(esqui, metal); e.position.set(sx, 0.05, 0.3); g.add(e); for (const z of [-0.6, 1.2]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), metal); t.position.set(sx, 0.5, z); g.add(t); } }
    g.children.forEach(c => { c.castShadow = true; c.scale.multiplyScalar(1); });
    const wrap = new THREE.Group(); while (g.children.length) wrap.add(g.children[0]); wrap.scale.setScalar(esc); g.add(wrap);
    this.disco = new THREE.Mesh(new THREE.CircleGeometry(ac.raioRotorM, 48), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.disco.rotation.x = -Math.PI / 2; this.disco.position.set(0, 3.1 * esc, 0.3 * esc); g.add(this.disco);
    this.animRotor = [{ pivo: rotor, eixo: 'y', fator: 1 }, { pivo: rc, eixo: 'x', fator: 6 }];
    this.procedural = true;
  }

  // ---------- marcadores de fase ----------
  limparMarcadores() { while (this.marcadores.children.length) this.marcadores.remove(this.marcadores.children[0]); }
  caixaAlvo(x, y, z, w = 6, h = 4, cor = 0xff6a00) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.18, depthWrite: false }));
    b.position.set(x, y, z); this.marcadores.add(b);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, w)), new THREE.LineBasicMaterial({ color: cor })); e.position.set(x, y, z); this.marcadores.add(e);
    return b;
  }
  anel(x, y, z, raio = 12, cor = 0xff6a00, rotY = 0) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(raio, 0.6, 8, 40), new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.5 }));
    a.position.set(x, y, z); a.rotation.y = rotY; this.marcadores.add(a); return a;
  }
  cone(x, z, cor = 0xff6a00, alt = 2) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.6, alt, 8), new THREE.MeshStandardMaterial({ color: cor })); c.position.set(x, alt / 2, z); c.castShadow = true; this.marcadores.add(c); return c;
  }
  arvore(x, z, alt = 14) {
    const g = new THREE.Group();
    g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, alt * 0.35, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2b })), { position: new THREE.Vector3(0, alt * 0.17, 0) }));
    g.add(Object.assign(new THREE.Mesh(new THREE.ConeGeometry(alt * 0.3, alt * 0.75, 8), new THREE.MeshStandardMaterial({ color: 0x2f7a3a })), { position: new THREE.Vector3(0, alt * 0.6, 0) }));
    g.children.forEach(c => c.castShadow = true);
    g.position.set(x, 0, z); this.marcadores.add(g);
    carregarGltf(BASE + 'natureza/tree_pineTallA.glb').then(gl => { const m = gl.scene.clone(true); const b = new THREE.Box3().setFromObject(m); const s = b.getSize(new THREE.Vector3()); const e = alt / s.y; m.scale.setScalar(e); m.position.y = -b.min.y * e; m.traverse(o => { if (o.isMesh) o.castShadow = true; }); while (g.children.length) g.remove(g.children[0]); g.add(m); }).catch(() => {});
    return g;
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
    for (const r of this.animRotor) { const d = sentido * rpm * r.fator * 2 * Math.PI / 60 * dt; if (r.eixo === 'y') r.pivo.rotation.y += d; else r.pivo.rotation.x += d; }
    if (this.disco) this.disco.material.opacity = Math.min(0.3, rpm / 500 * 0.3);
    const w = h.vento(); const vv = Math.hypot(w.x, w.z);
    this.biruta.rotation.y = -Math.atan2(w.x, -w.z) + Math.PI / 2;
    this.birutaCone.rotation.z = Math.PI / 2 * Math.min(1, vv / 8) - Math.PI / 2 + Math.PI / 2;
    // sombra acompanha o helicóptero
    this.sol.position.set(h.pos.x + 400, h.pos.y + 700, h.pos.z + 300); this.sol.target.position.set(h.pos.x, 0, h.pos.z); this.sol.target.updateMatrixWorld();
    this._camera(h, dt);
  }
  vitrine(dt) { // menu: aeronave no pátio com câmera girando devagar
    this.tempo += dt;
    if (this.heli) { for (const r of this.animRotor) if (r.eixo === 'y') r.pivo.rotation.y += dt * 0.6; }
    const ang = this.tempo * 0.18, esc = this.ac ? this.ac.raioRotorM / 3.84 : 1;
    this.camera.position.set(Math.sin(ang) * 14 * esc, 4.5 * esc, Math.cos(ang) * 14 * esc);
    this.camera.lookAt(0, 1.6 * esc, 0); this.camera.fov = 45; this.camera.updateProjectionMatrix();
    this.sol.position.set(400, 700, 300); this.sol.target.position.set(0, 0, 0); this.sol.target.updateMatrixWorld();
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
      const d = 16 * esc, alt = 6 * esc;
      const alvo = new THREE.Vector3(p.x - Math.sin(h.yaw) * d, p.y + alt, p.z + Math.cos(h.yaw) * d);
      if (!this._camPos) this._camPos = alvo.clone();
      this._camPos.lerp(alvo, 1 - Math.exp(-dt * 3));
      cam.position.copy(this._camPos); cam.position.x += jx; cam.position.y += jy;
      cam.position.y = Math.max(cam.position.y, elevacao(cam.position.x, cam.position.z) + 1.5, 1.5);
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
