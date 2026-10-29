// Mundo 3D (Three.js): céu HDRI (Poly Haven, CC0), relevo com mata, granito, lagoa, mar e praia; cidade com fachadas;
// aeródromo sinalizado; vegetação instanciada (Kenney Nature Kit, CC0); modelos de helicóptero (Sketchfab, CC-BY)
// com rotor animado; auxílios de navegação (seta, farol no alvo e linha da rota). Créditos em CREDITOS.md e na tela "Sobre".
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { elevacao, lagoaRaio, LAGOA, PEDRAS, HELIPONTOS, MIRANTE, costaZ, ruidoFbm, suave } from './terreno.js';
export { elevacao };

const FT = 0.3048;
const BASE = import.meta.env.BASE_URL + 'assets/';
const MOVEL = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
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
function canvasTex(w, h, desenhar, srgb = true, repetir = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; desenhar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function textoSprite(texto, cor = '#111', fundo = 'rgba(255,255,255,0.85)', tam = 64) {
  const t = canvasTex(512, 128, (g) => {
    g.fillStyle = fundo; g.beginPath(); g.roundRect(0, 0, 512, 128, 24); g.fill();
    g.fillStyle = cor; g.font = `bold ${tam}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto, 256, 64);
  }, true, false);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(16, 4, 1);
  return s;
}
// pintura no chão (letras e números de pista), plano deitado com a "cabeça" do texto para o norte (−z)
function pintura(texto, larguraM, alturaM, cor = '#ffffff', tam = 200) {
  const t = canvasTex(256, 256, (g) => { g.fillStyle = cor; g.font = `bold ${tam}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto, 128, 136); }, true, false);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(larguraM, alturaM), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.8, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; return m;
}

// ---------- texturas geradas por código ----------
function texRuidoMacro() { // variação de cor em grande escala (quebra a repetição das texturas)
  return canvasTex(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      // ruído periódico (tileável): soma de senos com frequências inteiras
      const u = x / w * Math.PI * 2, v = y / h * Math.PI * 2;
      const n = 0.5 + 0.22 * Math.sin(u * 2 + 1.3) * Math.cos(v * 3 + 0.4) + 0.14 * Math.sin(u * 5 + v * 4 + 2.1) + 0.09 * Math.cos(u * 11 - v * 7) + 0.05 * Math.sin(u * 23 + v * 19);
      const c = Math.max(0, Math.min(255, n * 255)); const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = c; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
}
function texNormalAgua() { // mapa de normais de marolas: ruído de valor periódico (tileável), sem padrão de grade
  const N = 256, alt = new Float32Array(N * N);
  let sem = 3; const rnd = () => { sem = (sem * 16807) % 2147483647; return (sem - 1) / 2147483646; };
  for (const [P, amp] of [[8, 1], [16, 0.5], [32, 0.25], [64, 0.12]]) {
    const g = Array.from({ length: P * P }, rnd), cel = N / P;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const gx = x / cel, gy = y / cel, i = Math.floor(gx), j = Math.floor(gy), fx = gx - i, fy = gy - j;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), v = (a, b) => g[((b % P) * P) + (a % P)];
      alt[y * N + x] += amp * ((v(i, j) * (1 - sx) + v(i + 1, j) * sx) * (1 - sy) + (v(i, j + 1) * (1 - sx) + v(i + 1, j + 1) * sx) * sy);
    }
  }
  return canvasTex(N, N, (g) => {
    const img = g.createImageData(N, N), h = (x, y) => alt[((y + N) % N) * N + ((x + N) % N)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 3, dy = (h(x, y + 1) - h(x, y - 1)) * 3, l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
      img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, false);
}
const FACHADAS = {
  branco: { fundo: '#e8e2d6', vidro: ['#3b4a57', '#4d5f6e', '#2e3a44', '#8fa3b3'], moldura: '#cfc7b8' },
  creme: { fundo: '#d9c7a3', vidro: ['#3a3f45', '#55606a', '#2c3136', '#9aa7b0'], moldura: '#c2ae8a' },
  vidro: { fundo: '#5d7f99', vidro: ['#7fa3bf', '#6a8fae', '#9ec0d8', '#4f7390'], moldura: '#3f5a70', corrido: true },
  tijolo: { fundo: '#b5654a', vidro: ['#3d3330', '#57493f', '#2e2724', '#8a7a6c'], moldura: '#e0d6c8' },
};
function texFachada(tipo) { // 4 colunas × 4 andares; o jogo repete conforme o tamanho do prédio
  const f = FACHADAS[tipo];
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = f.fundo; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 4; r++) {
      g.fillStyle = f.moldura; g.fillRect(0, r * 64, w, 4); // laje
      for (let c = 0; c < 4; c++) {
        g.fillStyle = f.vidro[(r * 7 + c * 3 + (r * c) % 3) % f.vidro.length];
        if (f.corrido) g.fillRect(c * 64, r * 64 + 10, 64, 48); else g.fillRect(c * 64 + 12, r * 64 + 14, 40, 38);
        if (!f.corrido) { g.fillStyle = f.moldura; g.fillRect(c * 64 + 30, r * 64 + 14, 3, 38); }
      }
      if (f.corrido) { g.fillStyle = f.moldura; for (let c = 0; c <= 4; c++) g.fillRect(c * 64 - 1, r * 64, 3, 64); }
    }
  });
}

// material do terreno: cor por vértice (mata, grama, granito, areia) × textura de detalhe em coordenadas do mundo,
// misturada em duas escalas e modulada por um ruído de grande escala (sem a "colcha" de textura repetida)
function materialTerreno(tGrama, tRocha, tMacro) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { tGrama: { value: tGrama }, tRocha: { value: tRocha }, tMacro: { value: tMacro } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aRocha;\nvarying float vRocha;\nvarying vec3 vMundo;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvRocha = aRocha;\nvMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tGrama; uniform sampler2D tRocha; uniform sampler2D tMacro;\nvarying float vRocha;\nvarying vec3 vMundo;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 g1 = texture2D(tGrama, vMundo.xz / 7.0).rgb, g2 = texture2D(tGrama, vMundo.xz / 41.0 + 0.37).rgb;
        vec3 gr = mix(g1, g2, 0.45);
        vec3 rx = texture2D(tRocha, vMundo.zy / 23.0).rgb, rz = texture2D(tRocha, vMundo.xy / 23.0).rgb, ry = texture2D(tRocha, vMundo.xz / 23.0).rgb;
        vec3 ro = (rx + rz + ry) / 3.0;
        // só o brilho da textura (luminância média medida: grama 0,145; rocha 0,012); a cor vem do relevo
        float lg = dot(gr, vec3(0.2126, 0.7152, 0.0722)) / 0.145, lr = dot(ro, vec3(0.2126, 0.7152, 0.0722)) / 0.0123;
        float det = clamp(mix(lg, lr, vRocha), 0.45, 1.7);
        float mac = texture2D(tMacro, vMundo.xz / 3100.0).r * 0.6 + texture2D(tMacro, vMundo.xz / 690.0 + 0.5).r * 0.4;
        diffuseColor.rgb *= det * mix(0.75, 1.12, mac);`);
  };
  return m;
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
    this.scene.fog = new THREE.FogExp2(0xc9d9e6, 0.000085); // névoa seca: dá profundidade à serra distante
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.5, 40000);
    this.modoCamera = 'atras';
    this.marcadores = new THREE.Group(); this.scene.add(this.marcadores);
    this.tempo = 0; this.heli = null; this.animRotor = []; this.aguas = []; this.navLigado = true;
    this.tMacro = texRuidoMacro(); this.tNormalAgua = texNormalAgua();
    this._luzes(); this._ceu(); this._terreno(); this._agua(); this._aerodromo(); this._cidade(); this._marcos(); this._vegetacao(); this._nav();
    this._pronta = true; this.redimensionar();
  }

  _luzes() {
    this.scene.add(new THREE.HemisphereLight(0xdcecff, 0x55623f, 0.45));
    const sol = new THREE.DirectionalLight(0xfff1dc, 2.1); sol.position.set(400, 700, 300);
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    const sc = sol.shadow.camera; sc.near = 50; sc.far = 2500; sc.left = sc.bottom = -70; sc.right = sc.top = 70; sol.shadow.bias = -0.0005;
    this.sol = sol; this.scene.add(sol); this.scene.add(sol.target);
  }
  _ceu() {
    new RGBELoader().load(BASE + 'ceu/' + (MOVEL ? 'ceu_1k.hdr' : 'ceu_2k.hdr'), (t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.background = t;
      const pm = new THREE.PMREMGenerator(this.renderer); this.scene.environment = pm.fromEquirectangular(t).texture; pm.dispose();
      this.scene.environmentIntensity = 0.9;
    }, undefined, (e) => console.warn('céu não carregou', e));
  }

  // ---------- relevo ----------
  _terreno() {
    const mat = materialTerreno(textura('grama_cor.jpg'), textura('rocha_cor.jpg'), this.tMacro);
    this.scene.add(this._malha(12000, MOVEL ? 200 : 260, mat, 0));      // perto: 46–60 m entre vértices
    this.scene.add(this._malha(42000, 150, mat, -3));                     // longe: horizonte (fica por baixo do de perto)
  }
  _malha(L, N, mat, dy) {
    const geo = new THREE.PlaneGeometry(L, L, N, N); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, n = pos.count;
    for (let i = 0; i < n; i++) pos.setY(i, elevacao(pos.getX(i), pos.getZ(i)) - 0.25 + dy);
    geo.computeVertexNormals();
    const nor = geo.attributes.normal, cores = new Float32Array(n * 3), rocha = new Float32Array(n);
    const cGrama = new THREE.Color(0x5e8636), cGrama2 = new THREE.Color(0x4f7531), cMata = new THREE.Color(0x30552a), cMata2 = new THREE.Color(0x24431f);
    const cSeco = new THREE.Color(0x8f8a4c), cMataBaixa = new THREE.Color(0x2f5226), cRocha = new THREE.Color(0x8c877d), cAreia = new THREE.Color(0xdccb9f), cFundo = new THREE.Color(0x5c6a55), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i) + 0.25 - dy, inc = 1 - nor.getY(i);
      const r1 = ruidoFbm(x / 420, z / 420, 3), r2 = ruidoFbm(x / 90 + 3.1, z / 90 - 1.7, 2);
      // baixada: grama; morros: mata atlântica; flancos íngremes e pedras: granito
      const mato = suave(4, 40, y) * (0.75 + 0.25 * r1);
      c.lerpColors(cGrama, cGrama2, r2);
      c.lerp(cSeco, suave(0.5, 0.68, ruidoFbm(x / 260 + 9.1, z / 260 + 4.4, 3)) * 0.65);         // pasto seco
      c.lerp(cMataBaixa, suave(0.5, 0.6, ruidoFbm(x / 180 - 2.3, z / 180 + 7.7, 3)) * 0.85);    // capões de mata
      c.lerp(new THREE.Color().lerpColors(cMata, cMata2, r1), mato);
      let pedra = suave(0.38, 0.62, inc);
      for (const p of PEDRAS) { const u = Math.hypot(x - p.x, z - p.z) / p.r; if (u < 1.05) pedra = Math.max(pedra, suave(1.12, 0.8, u) * (0.8 + 0.2 * r2)); }
      const praia = (1 - suave(2.5, 6, y)) * suave(costaZ(x) - 500, costaZ(x) - 150, z);
      const lr = lagoaRaio(x, z), margem = lr < 1.12 && lr > 0.9 ? 0.9 : 0;
      c.lerp(cAreia, Math.max(praia, margem));
      c.lerp(cRocha, pedra);
      if (y < -0.6) c.lerp(cFundo, 0.85);
      cores[i * 3] = c.r; cores[i * 3 + 1] = c.g; cores[i * 3 + 2] = c.b; rocha[i] = pedra;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cores, 3)); geo.setAttribute('aRocha', new THREE.BufferAttribute(rocha, 1));
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; return m;
  }

  // ---------- água: lagoa e mar ----------
  _materialAgua(cor, repeat) {
    const nm = this.tNormalAgua.clone(); nm.repeat.set(repeat, repeat); nm.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.06, metalness: 0.05, normalMap: nm, normalScale: new THREE.Vector2(0.3, 0.3), envMapIntensity: 1.1 });
    this.aguas.push(nm); return m;
  }
  _contornoLagoa(nivel) { // pontos onde lagoaRaio = nivel, por bisseção ao longo de raios a partir do centro
    const pts = [];
    for (let k = 0; k < 160; k++) {
      const a = k / 160 * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
      let lo = 0, hi = 2000; for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (lagoaRaio(LAGOA.x + dx * mid, LAGOA.z + dz * mid) < nivel) lo = mid; else hi = mid; }
      pts.push(new THREE.Vector2(LAGOA.x + dx * lo, -(LAGOA.z + dz * lo))); // shape no plano XY; vira chão com rotateX(−90°)
    }
    return pts;
  }
  _agua() {
    const s = this.scene;
    const agua = this._contornoLagoa(1.0);
    const lagoa = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(agua)), this._materialAgua(0x2a6a7f, 1));
    lagoa.geometry.rotateX(-Math.PI / 2); lagoa.position.y = 0.02;
    // UVs em metros para as marolas
    { const p = lagoa.geometry.attributes.position, uv = lagoa.geometry.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 60, p.getZ(i) / 60); }
    s.add(lagoa);
    // calçadão de areia em volta da lagoa
    const fora = new THREE.Shape(this._contornoLagoa(1.1)); fora.holes.push(new THREE.Path(agua));
    const areia = new THREE.Mesh(new THREE.ShapeGeometry(fora), new THREE.MeshStandardMaterial({ color: 0xd8c79c, roughness: 1 }));
    areia.geometry.rotateX(-Math.PI / 2); areia.position.y = -0.08; areia.receiveShadow = true; s.add(areia);
    // mar ao sul
    const mar = new THREE.Mesh(new THREE.PlaneGeometry(48000, 22000, 1, 1), this._materialAgua(0x1d5670, 420));
    mar.rotation.x = -Math.PI / 2; mar.position.set(0, 0, 5400 + 11000); s.add(mar);
  }

  // ---------- aeródromo ----------
  _aerodromo() {
    const s = this.scene;
    const asfalto = textura('asfalto_cor.jpg', 1), asfaltoN = textura('asfalto_normal.jpg', 1, false);
    asfalto.repeat.set(3, 100); asfaltoN.repeat.set(3, 100);
    const mAsf = new THREE.MeshStandardMaterial({ map: asfalto, normalMap: asfaltoN, roughness: 0.95 });
    const plano = (w, l, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat); m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, y, z); m.receiveShadow = true; s.add(m); return m; };
    // acostamento (grama mais curta) e pista
    plano(70, 1080, new THREE.MeshStandardMaterial({ color: 0x7a9350, roughness: 1 }), 60, -0.2, 0);
    plano(30, 1000, mAsf, 60, 0.06, 0);
    const mBranco = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 }), mAmarelo = new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.8 });
    const faixas = [];
    for (let i = -13; i <= 13; i++) faixas.push(new THREE.PlaneGeometry(0.9, 18).translate(60, -i * 30, 0)); // eixo
    for (const sx of [-14.2, 14.2]) faixas.push(new THREE.PlaneGeometry(0.9, 1000).translate(60 + sx, 0, 0)); // bordas
    for (const zc of [-482, 482]) for (let j = 0; j < 8; j++) { const x = 60 - 12 + j * 3.4 + (j >= 4 ? 3.2 : 0); faixas.push(new THREE.PlaneGeometry(1.8, 30).translate(x, -zc, 0)); } // cabeceiras ("piano")
    const mFaixas = new THREE.Mesh(mergeGeometries(faixas), mBranco); mFaixas.rotation.x = -Math.PI / 2; mFaixas.position.y = 0.09; s.add(mFaixas);
    const n36 = pintura('36', 12, 12); n36.position.set(60, 0.1, 440); s.add(n36);
    const n18 = pintura('18', 12, 12); n18.rotation.z = Math.PI; n18.position.set(60, 0.1, -440); s.add(n18);
    // pátio e taxiway
    const concreto = textura('concreto_cor.jpg', 1), concretoN = textura('concreto_normal.jpg', 1, false); concreto.repeat.set(10, 8); concretoN.repeat.set(10, 8);
    plano(90, 70, new THREE.MeshStandardMaterial({ map: concreto, normalMap: concretoN, roughness: 0.9, color: 0x9a9a9a }), 0, 0.05, 0);
    const tx = plano(50, 14, new THREE.MeshStandardMaterial({ map: asfalto.clone(), roughness: 0.95 }), 45, 0.055, 0); tx.material.map.repeat.set(5, 1.4); tx.material.map.needsUpdate = true;
    const linhaTx = new THREE.Mesh(new THREE.PlaneGeometry(50, 0.5), mAmarelo); linhaTx.rotation.x = -Math.PI / 2; linhaTx.position.set(45, 0.07, 0); s.add(linhaTx);
    for (const [x, z] of [[-28, -22], [28, -22], [-28, 22]]) { const r = new THREE.Mesh(new THREE.RingGeometry(7.6, 8.1, 48), mAmarelo); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.07, z); s.add(r); }
    this.heliponto(0, 0, 'H');
    // hangares (vermelho CBMERJ), torre, caminhões
    const mParede = new THREE.MeshStandardMaterial({ color: 0xdedbd4, roughness: 0.75, metalness: 0.15 });
    const mFaixaV = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.6 });
    const mTelhado = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.5 });
    const mPorta = new THREE.MeshStandardMaterial({ map: canvasTex(256, 128, (g) => { g.fillStyle = '#8e9296'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#7b7f83'; for (let i = 0; i < 256; i += 16) g.fillRect(i, 0, 3, 128); }), roughness: 0.6, metalness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const z = -45 + i * 42;
      const h = new THREE.Mesh(new THREE.BoxGeometry(32, 10, 26), mParede); h.position.set(-75, 5, z); h.castShadow = h.receiveShadow = true; s.add(h);
      const fx = new THREE.Mesh(new THREE.BoxGeometry(32.3, 1.4, 26.3), mFaixaV); fx.position.set(-75, 8.6, z); s.add(fx);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 32, 24, 1, false, 0, Math.PI), mTelhado); t.rotation.z = Math.PI / 2; t.position.set(-75, 10, z); t.scale.set(0.32, 1, 1); t.castShadow = true; s.add(t);
      const porta = new THREE.Mesh(new THREE.PlaneGeometry(22, 8), mPorta); porta.position.set(-58.9, 4, z); porta.rotation.y = Math.PI / 2; s.add(porta);
    }
    const placa = textoSprite('GOA · CBMERJ', '#fff', 'rgba(200,16,46,0.95)', 70); placa.material.depthTest = true; placa.scale.set(14, 3.5, 1); placa.position.set(-58.7, 11.5, -45); s.add(placa);
    const torre = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 22, 16), mParede); torre.position.set(-40, 11, 80); torre.castShadow = true; s.add(torre);
    const mVidro = new THREE.MeshStandardMaterial({ color: 0x6fa8d6, roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.8 });
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 5.5, 5, 16), mVidro); cab.position.set(-40, 24.5, 80); s.add(cab);
    const topo = new THREE.Mesh(new THREE.CylinderGeometry(7, 6.8, 1, 16), mFaixaV); topo.position.set(-40, 27.5, 80); s.add(topo);
    this._caminhao(-45, -78, 0xc8102e); this._caminhao(-45, -66, 0xf2f2f2);
    // biruta
    this.biruta = new THREE.Group();
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8), mParede); mastro.position.y = 4; this.biruta.add(mastro);
    this.birutaCone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xff6a00, side: THREE.DoubleSide })); this.birutaCone.position.set(2, 8, 0); this.biruta.add(this.birutaCone);
    this.biruta.position.set(40, 0, 40); s.add(this.biruta);
    // estradas: base → cidade (hospital) e base → lagoa
    this._estrada(110, -200, 1440, -200, 14); this._estrada(-20, 45, HELIPONTOS.lagoa.x + 40, HELIPONTOS.lagoa.z - 40, 10);
  }
  _caminhao(x, z, cor) {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5, metalness: 0.2 }), pneu = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.4, 2.2), m); cab.position.set(0, 1.6, -3); g.add(cab);
    const tq = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 5, 16), m); tq.rotation.x = Math.PI / 2; tq.position.set(0, 1.8, 0.8); g.add(tq);
    for (const [px, pz] of [[-1.2, -3], [1.2, -3], [-1.2, 1.5], [1.2, 1.5]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12), pneu); p.rotation.z = Math.PI / 2; p.position.set(px, 0.5, pz); g.add(p); }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.position.set(x, 0, z); g.rotation.y = Math.PI / 2; this.scene.add(g);
  }
  _estrada(x0, z0, x1, z1, w) {
    const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
    const t = textura('asfalto_cor.jpg', 1); t.repeat.set(1, L / 12);
    const e = new THREE.Mesh(new THREE.PlaneGeometry(w, L), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, color: 0xb8b8b8 }));
    e.rotation.set(-Math.PI / 2, 0, ang); e.position.set((x0 + x1) / 2, 0.035, (z0 + z1) / 2); e.receiveShadow = true; this.scene.add(e);
    const dashes = []; for (let d = 6; d < L - 6; d += 12) dashes.push(new THREE.PlaneGeometry(0.25, 5).translate(0, d - L / 2, 0));
    const f = new THREE.Mesh(mergeGeometries(dashes), new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.8 })); f.rotation.copy(e.rotation); f.position.copy(e.position); f.position.y = 0.045; this.scene.add(f);
  }

  // ---------- cidade a leste (fachadas com janelas), hospital e heliponto da Lagoa ----------
  _cidade() {
    const s = this.scene, lotes = { branco: [], creme: [], vidro: [], tijolo: [] }, tetos = [];
    let semente = 7; const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };
    for (let bx = 1520; bx < 2700; bx += 115) for (let bz = -880; bz < 880; bz += 115) {
      const dc = Math.hypot(bx - 2050, bz) / 900; // mais altos no centro
      for (const [ox, oz] of [[0, 0], [52, 0], [0, 52], [52, 0 + 52]]) {
        if (rnd() < 0.18) continue;
        const w = 22 + rnd() * 24, d = 22 + rnd() * 24, h = 10 + Math.pow(rnd(), 1.6) * 95 * Math.max(0.25, 1.2 - dc);
        const x = bx + ox + 25, z = bz + oz + 25;
        const tipo = h > 55 && rnd() < 0.55 ? 'vidro' : h < 22 && rnd() < 0.5 ? 'tijolo' : rnd() < 0.5 ? 'branco' : 'creme';
        lotes[tipo].push([x, z, w, h, d]); tetos.push([x, z, w, h, d]);
      }
    }
    // hospital (paredes brancas, faixa e cruz vermelhas) logo na entrada da cidade
    const hx = 1480, hz = -260; lotes.branco.push([hx, hz, 60, 32, 50]); tetos.push([hx, hz, 60, 32, 50]);
    for (const [tipo, lista] of Object.entries(lotes)) {
      const geo = this._predios(lista); if (!geo) continue;
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texFachada(tipo), roughness: tipo === 'vidro' ? 0.25 : 0.8, metalness: tipo === 'vidro' ? 0.4 : 0.05 }));
      m.castShadow = true; m.receiveShadow = true; s.add(m);
    }
    const geoT = mergeGeometries(tetos.map(([x, z, w, h, d]) => new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(x, h + 0.05, z)));
    s.add(new THREE.Mesh(geoT, new THREE.MeshStandardMaterial({ color: 0x8c8c88, roughness: 0.9 })));
    // ruas da cidade
    const ruas = []; for (let x = 1500; x <= 2720; x += 115) ruas.push(new THREE.PlaneGeometry(14, 1800).rotateX(-Math.PI / 2).translate(x, 0.03, 0));
    for (let z = -900; z <= 900; z += 115) ruas.push(new THREE.PlaneGeometry(1240, 14).rotateX(-Math.PI / 2).translate(2110, 0.032, z));
    const tr = textura('asfalto_cor.jpg', 1); tr.repeat.set(4, 4);
    s.add(new THREE.Mesh(mergeGeometries(ruas), new THREE.MeshStandardMaterial({ color: 0x77797b, roughness: 0.95 })));
    // marcas do hospital
    const mV = new THREE.MeshStandardMaterial({ color: 0xd61f26, roughness: 0.6 });
    const faixa = new THREE.Mesh(new THREE.BoxGeometry(60.4, 2.2, 50.4), mV); faixa.position.set(hx, 28, hz); s.add(faixa);
    for (const lado of [-1, 1]) { const cz = new THREE.Group(); cz.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 9, 3), mV), new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 9), mV)); cz.position.set(hx - 30.3, 18, hz + lado * 14); s.add(cz); }
    const ph = textoSprite('HOSPITAL', '#fff', 'rgba(214,31,38,0.95)', 72); ph.material.depthTest = true; ph.scale.set(18, 4.5, 1); ph.position.set(hx - 30.5, 34.5, hz); s.add(ph);
    this.heliponto(HELIPONTOS.hospital.x, HELIPONTOS.hospital.z, '+', 0xffffff, 10);
    // heliponto da Lagoa (GOA): H com faixa vermelha e um pequeno hangar
    const L = HELIPONTOS.lagoa; this.heliponto(L.x, L.z, 'H', 0xffffff, 10, { borda: 0xc8102e });
    const hg = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 16), new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.8 })); hg.position.set(L.x + 40, 3.5, L.z); hg.castShadow = true; s.add(hg);
    const hgf = new THREE.Mesh(new THREE.BoxGeometry(18.2, 1.2, 16.2), mV); hgf.position.set(L.x + 40, 6.2, L.z); s.add(hgf);
  }
  _predios(lista) { // junta todos os prédios de uma fachada numa malha; UV em "andares" para as janelas repetirem certo
    if (!lista.length) return null;
    const P = [], N = [], U = [], I = []; let v = 0;
    const quad = (a, b, c, d, nx, ny, nz, uw, vh) => { P.push(...a, ...b, ...c, ...d); for (let k = 0; k < 4; k++) N.push(nx, ny, nz); U.push(0, 0, uw, 0, uw, vh, 0, vh); I.push(v, v + 1, v + 2, v, v + 2, v + 3); v += 4; };
    for (const [x, z, w, h, d] of lista) {
      const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, uw = w / 14, ud = d / 14, vh = h / 12.8;
      quad([x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1], 0, 0, 1, uw, vh);
      quad([x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0], 0, 0, -1, uw, vh);
      quad([x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1], 1, 0, 0, ud, vh);
      quad([x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0], -1, 0, 0, ud, vh);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
    return g;
  }

  // ---------- marcos: Cristo no Corcovado e bandeira-alvo do mirante ----------
  _marcos() {
    const p = PEDRAS.find(q => q.cristo); if (!p) return;
    const y = elevacao(p.x, p.z), m = new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.7 });
    const g = new THREE.Group();
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(9, 8, 9), m); pedestal.position.y = 4; g.add(pedestal);
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.2, 30, 10), m); corpo.position.y = 23; g.add(corpo);
    const bracos = new THREE.Mesh(new THREE.BoxGeometry(30, 3.2, 3.2), m); bracos.position.y = 34; g.add(bracos);
    const cab = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 10), m); cab.position.y = 40; g.add(cab);
    g.position.set(p.x, y - 1, p.z); g.rotation.y = 0.4; this.scene.add(g);
  }

  // ---------- vegetação (instanciada, cor variando de árvore para árvore) ----------
  async _vegetacao() {
    const tipos = [['tree_pineTallA', 16], ['tree_pineTallB', 15], ['tree_pineDefaultA', 12], ['tree_oak', 11], ['tree_detailed', 12], ['tree_default', 10], ['tree_fat', 10], ['tree_tall', 14]];
    let semente = 11; const rnd = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };
    const livre = (x, z) => {
      if (Math.abs(x - 60) < 75 && Math.abs(z) < 600) return false;              // pista
      if (Math.abs(x) < 150 && Math.abs(z) < 150) return false;                  // pátio e hangares
      if (x > 1350 && x < 2800 && Math.abs(z) < 950) return false;               // cidade e hospital
      if (lagoaRaio(x, z) < 1.2) return false;                                    // lagoa e calçadão
      if (Math.abs(z + 200) < 20 && x > 100 && x < 1460) return false;            // estrada da cidade
      for (const h of Object.values(HELIPONTOS)) if (Math.hypot(x - h.x, z - h.z) < 70) return false;
      if (Math.hypot(x - MIRANTE.x, z - MIRANTE.z) < MIRANTE.r) return false;     // clareira do resgate
      const d9 = Math.hypot(x + 600, z - 500); if (d9 < 36 && d9 > 26) return false; // clareira da fase 9
      const e = elevacao(x, z); if (e < 0.3 && Math.hypot(x, z) > 2400) return false; // praia e mar
      const inc = Math.abs(elevacao(x + 15, z) - e) + Math.abs(elevacao(x, z + 15) - e); if (inc > 14) return false; // íngreme demais (granito)
      for (const p of PEDRAS) if (Math.hypot(x - p.x, z - p.z) < p.r * 0.85) return false;
      return true;
    };
    const pontos = [];
    const total = MOVEL ? 3200 : 4600;
    for (let i = 0; pontos.length < total && i < total * 6; i++) {
      // metade perto do aeródromo (referência de altura), metade nos morros
      const perto = i % 2 === 0; const a = rnd() * Math.PI * 2, r = perto ? Math.sqrt(rnd()) * 2600 : 2300 + Math.sqrt(rnd()) * 3900;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (perto && ruidoFbm(x / 180 - 2.3, z / 180 + 7.7, 3) < 0.52 && rnd() > 0.06) continue; // na planície as árvores ficam nos capões de mata
      if (!livre(x, z)) continue;
      const y = elevacao(x, z); if (!perto && y < 6) continue;
      pontos.push({ x, z, y, tipo: Math.floor(rnd() * tipos.length), esc: 0.75 + rnd() * 0.6, rot: rnd() * Math.PI * 2, var: rnd() });
    }
    const cor = new THREE.Color(), hsl = {};
    for (let ti = 0; ti < tipos.length; ti++) {
      const [nome, alturaM] = tipos[ti];
      let g; try { g = await carregarGltf(BASE + 'natureza/' + nome + '.glb'); } catch { continue; }
      const raiz = g.scene; const caixa = new THREE.Box3().setFromObject(raiz); const tam = caixa.getSize(new THREE.Vector3());
      const escBase = alturaM / tam.y; const meus = pontos.filter(p => p.tipo === ti); if (!meus.length) continue;
      raiz.updateMatrixWorld(true);
      raiz.traverse((o) => {
        if (!o.isMesh) return;
        const nm = (o.material && o.material.name || '').toLowerCase();
        const folha = /leaf|folha/.test(nm), tronco = /bark|wood|trunk/.test(nm);
        const base = folha ? (nm.includes('dark') ? 0x2f6b2f : 0x3f8a3a) : tronco ? 0x6b4a2b : /rock|stone/.test(nm) ? 0x8a8378 : 0x4f8a3f;
        const inst = new THREE.InstancedMesh(o.geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 }), meus.length);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
        meus.forEach((pt, k) => {
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pt.rot); const e = escBase * pt.esc; sc.set(e, e, e); p.set(pt.x, pt.y - 0.3 - caixa.min.y * e, pt.z);
          m.compose(p, q, sc).multiply(o.matrixWorld); inst.setMatrixAt(k, m);
          cor.setHex(base); if (folha || !tronco) { cor.getHSL(hsl); cor.setHSL(hsl.h + (pt.var - 0.5) * 0.06, hsl.s * (0.8 + pt.var * 0.35), hsl.l * (0.78 + pt.var * 0.4)); }
          inst.setColorAt(k, cor);
        });
        inst.castShadow = true; inst.frustumCulled = false; this.scene.add(inst);
      });
    }
    // tufos de capim perto do pátio: dão noção de altura no pairado
    try {
      const g = await carregarGltf(BASE + 'natureza/grass_large.glb'); const raiz = g.scene; raiz.updateMatrixWorld(true);
      const capim = (x, z) => Math.hypot(x, z) > 52 && Math.abs(x - 60) > 38 && !(x > -105 && x < -48 && Math.abs(z) < 75) && Math.hypot(x + 40, z - 80) > 12 && Math.abs(z + 200) > 12 && !(Math.abs(x - 15) < 4 && Math.abs(z) < 4) && !(Math.abs(x) < 4 && Math.abs(z - 15) < 4);
      const pts = []; for (let i = 0; pts.length < (MOVEL ? 900 : 1600) && i < 9000; i++) { const a = rnd() * Math.PI * 2, r = 25 + Math.sqrt(rnd()) * 650, x = Math.cos(a) * r, z = Math.sin(a) * r; if (capim(x, z)) pts.push({ x, z, rot: rnd() * 6.28, esc: 1.2 + rnd() * 1.4, var: rnd() }); }
      raiz.traverse((o) => {
        if (!o.isMesh) return;
        const inst = new THREE.InstancedMesh(o.geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), pts.length);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
        pts.forEach((pt, k) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pt.rot); sc.setScalar(pt.esc); p.set(pt.x, -0.25, pt.z); m.compose(p, q, sc).multiply(o.matrixWorld); inst.setMatrixAt(k, m); cor.setHex(0x6f9a3c); cor.offsetHSL((pt.var - 0.5) * 0.05, 0, (pt.var - 0.5) * 0.12); inst.setColorAt(k, cor); });
        inst.frustumCulled = false; this.scene.add(inst);
      });
    } catch { /* sem capim */ }
  }

  heliponto(x, z, letra = 'H', cor = 0xffffff, raio = 9, op = {}) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8 });
    const piso = new THREE.Mesh(new THREE.CircleGeometry(raio + 2.5, 48), new THREE.MeshStandardMaterial({ color: 0x6c6f72, roughness: 0.9 })); piso.rotation.x = -Math.PI / 2; piso.position.y = 0.06; piso.receiveShadow = true; g.add(piso);
    if (op.borda) { const b = new THREE.Mesh(new THREE.RingGeometry(raio + 0.6, raio + 2.2, 48), new THREE.MeshStandardMaterial({ color: op.borda, roughness: 0.7 })); b.rotation.x = -Math.PI / 2; b.position.y = 0.075; g.add(b); }
    if (letra === '+') { // heliponto hospitalar: cruz vermelha com o H branco
      const mV = new THREE.MeshStandardMaterial({ color: 0xd61f26, roughness: 0.7 });
      for (const [w, l] of [[4.2, 12], [12, 4.2]]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mV); c.rotation.x = -Math.PI / 2; c.position.y = 0.08; g.add(c); }
    }
    const circ = new THREE.Mesh(new THREE.RingGeometry(raio - 0.6, raio, 48), mat); circ.rotation.x = -Math.PI / 2; circ.position.y = 0.085; g.add(circ);
    const b1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 7), mat), b2 = b1.clone(), b3 = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), mat);
    b1.position.x = -2; b2.position.x = 2;
    [b1, b2, b3].forEach(b => { b.rotation.x = -Math.PI / 2; b.position.y = 0.09; g.add(b); });
    if (letra !== 'H' && letra !== '+') { const sp = textoSprite(letra, '#fff', 'rgba(0,0,0,0)', 80); sp.position.y = 3; g.add(sp); }
    g.position.set(x, 0, z); (this._pronta && !op.fixo ? this.marcadores : this.scene).add(g); return g;
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
      // o recorte das pás do Esquilo altera a geometria: clona para não estragar o cache
      if (arquivo === 'as350.glb') modelo.traverse(o => { if (o.isMesh) o.geometry = o.geometry.clone(); });
      while (g.children.length) g.remove(g.children[0]);
      this.animRotor = []; this.disco = null; this.discoCauda = null;
      this._prepararModelo(modelo, ac, arquivo);
      g.add(modelo); if (this.disco) g.add(this.disco); if (this.discoCauda) g.add(this.discoCauda); this.procedural = false;
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
    modelo.scale.setScalar((ac.raioRotorM * 2) / Math.max(tam.x, tam.z));
    // nariz para −Z: a cauda é a parte mais longa e fina; descobrimos de que lado ela está pelo centro de massa dos volumes
    const meshes = []; modelo.traverse(o => { if (o.isMesh) meshes.push(o); });
    let somaZ = 0, n = 0;
    for (const m of meshes) { const b = new THREE.Box3().setFromObject(m); const c = b.getCenter(new THREE.Vector3()); const s = b.getSize(new THREE.Vector3()); somaZ += c.z * s.x * s.y * s.z; n += s.x * s.y * s.z; }
    if (somaZ / Math.max(n, 1e-6) < 0) modelo.rotation.y = Math.PI; // cauda em −Z no modelo original → gira (nariz em −Z)
    modelo.updateMatrixWorld(true);
    const caixa2 = new THREE.Box3().setFromObject(modelo);
    modelo.position.y -= caixa2.min.y; modelo.position.x -= (caixa2.min.x + caixa2.max.x) / 2;
    modelo.updateMatrixWorld(true);
    let principal = null;
    if (arquivo === 'as350.glb') principal = this._separarRotorEsquilo(modelo, ac);
    else {
      // modelos com peças separadas: rotor principal = malha mais larga e fina no topo; rotor de cauda = malha fina e vertical na cauda
      let maiorL = 0, cauda2 = null, melhorC = 0; const topoY = caixa2.max.y;
      for (const m of meshes) {
        const b = new THREE.Box3().setFromObject(m); const s = b.getSize(new THREE.Vector3()); const c = b.getCenter(new THREE.Vector3());
        const L = Math.max(s.x, s.z), fino = s.y < L * 0.08;
        if (fino && L > maiorL && c.y > topoY - L * 0.6) { maiorL = L; principal = { m, c, eixo: 'y' }; }
        const Lv = Math.max(s.y, s.z); const finoX = s.x < Lv * 0.15 && s.x < 0.3 && c.z > 0.4 * caixa2.max.z;
        if (finoX && Lv > melhorC && Lv > 0.3 * ac.raioRotorM * 0.28 && Lv < ac.raioRotorM * 0.8) { melhorC = Lv; cauda2 = { m, c, eixo: 'x' }; }
      }
      for (const r of [principal, cauda2]) {
        if (!r) continue;
        const pai = r.m.parent; const pivo = new THREE.Group(); pai.updateMatrixWorld(true);
        pivo.position.copy(pai.worldToLocal(r.c.clone())); pai.add(pivo);
        const mats = []; r.m.material = r.m.material.clone(); mats.push(r.m.material);
        pivo.attach(r.m); this.animRotor.push({ pivo, eixo: r.eixo, fator: r.eixo === 'y' ? 1 : 6, doModelo: true, mats: r.eixo === 'y' ? mats : [] });
      }
    }
    // disco borrado no rotor principal (aparece com a RPM)
    if (principal) {
      this.disco = new THREE.Mesh(new THREE.CircleGeometry(ac.raioRotorM * 0.98, 48), new THREE.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false }));
      this.disco.rotation.x = -Math.PI / 2; this.disco.position.copy(principal.c); this.disco.position.y += 0.03;
    }
    modelo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; if (o.material && o.material.isMeshStandardMaterial) o.material.envMapIntensity = 0.9; } });
  }
  // Recorta da malha única as pás do rotor principal (camada fina no topo, mais larga que a fuselagem) e o rotor de cauda,
  // e as coloca em pivôs próprios para girar. O cubo é o centro das três pás (são simétricas).
  _separarRotorEsquilo(modelo, ac) {
    let mesh = null; modelo.traverse(o => { if (o.isMesh && (!mesh || o.geometry.attributes.position.count > mesh.geometry.attributes.position.count)) mesh = o; });
    if (!mesh) return null;
    const geo = mesh.geometry, pos = geo.attributes.position, n = pos.count, idx = geo.index ? geo.index.array : null;
    const nTri = idx ? idx.length / 3 : n / 3, P = new Float32Array(n * 3), v = new THREE.Vector3();
    let maxY = -1e9, maxZ = -1e9;
    mesh.updateMatrixWorld(true);
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); P[3 * i] = v.x; P[3 * i + 1] = v.y; P[3 * i + 2] = v.z; if (v.y > maxY) maxY = v.y; if (v.z > maxZ) maxZ = v.z; }
    const tri = (t) => idx ? [idx[3 * t], idx[3 * t + 1], idx[3 * t + 2]] : [3 * t, 3 * t + 1, 3 * t + 2];
    // 1) faixa de altura das pás: vértices no topo que passam da largura da fuselagem
    let yb = 1e9, yt = -1e9, cnt = 0;
    for (let i = 0; i < n; i++) { const x = P[3 * i], y = P[3 * i + 1]; if (y > maxY - 1.2 && Math.abs(x) > 1.4) { cnt++; yb = Math.min(yb, y); yt = Math.max(yt, y); } }
    if (cnt < 40) return null;
    const corte = yb - 0.05;
    const pas = [], resto = []; let sx = 0, sz = 0, sa = 0;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    for (let t = 0; t < nTri; t++) {
      const [a, b, c] = tri(t);
      if (P[3 * a + 1] > corte && P[3 * b + 1] > corte && P[3 * c + 1] > corte) {
        pas.push(a, b, c);
        A.set(P[3 * a], P[3 * a + 1], P[3 * a + 2]); B.set(P[3 * b], P[3 * b + 1], P[3 * b + 2]); C.set(P[3 * c], P[3 * c + 1], P[3 * c + 2]);
        const ar = B.clone().sub(A).cross(C.clone().sub(A)).length() / 2; sa += ar; sx += ar * (A.x + B.x + C.x) / 3; sz += ar * (A.z + B.z + C.z) / 3;
      } else resto.push(a, b, c);
    }
    if (pas.length < 300) return null;
    // cubo: onde as pás se encontram há muitos vértices juntos (cabeça do rotor) → célula mais densa do histograma em XZ
    const cel = 0.12, hist = new Map(); let melhor = null, nMax = 0;
    for (const i of pas) { const k = Math.round(P[3 * i] / cel) + ',' + Math.round(P[3 * i + 2] / cel); const c = (hist.get(k) || 0) + 1; hist.set(k, c); if (c > nMax) { nMax = c; melhor = k; } }
    const [kx, kz] = melhor.split(',').map(Number); let mx = 0, mz = 0, mn = 0;
    for (const i of pas) { const x = P[3 * i], z = P[3 * i + 2]; if (Math.hypot(x - kx * cel, z - kz * cel) < 0.3) { mx += x; mz += z; mn++; } }
    const cubo = new THREE.Vector3(mx / mn, (yb + yt) / 2, mz / mn);
    geo.setIndex(resto);
    const pai = modelo; pai.updateMatrixWorld(true);
    const g = new THREE.BufferGeometry(); for (const k in geo.attributes) g.setAttribute(k, geo.attributes[k]); g.setIndex(pas);
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).clone(); mat.transparent = true;
    const m = new THREE.Mesh(g, mat); mesh.parent.add(m); m.position.copy(mesh.position); m.quaternion.copy(mesh.quaternion); m.scale.copy(mesh.scale);
    const pivo = new THREE.Group(); pivo.position.copy(pai.worldToLocal(cubo.clone())); pai.add(pivo); pivo.attach(m);
    this.animRotor.push({ pivo, eixo: 'y', fator: 1, doModelo: true, mats: [mat] });
    // rotor de cauda: a malha não separa bem a cauda (estabilizador e deriva colados), então ele fica fixo
    // e um disco translúcido girando perto da ponta da cauda dá a sensação de movimento
    let zc = -1e9, yc = 0, xs = 0, nc = 0;
    for (let i = 0; i < n; i++) if (P[3 * i + 2] > maxZ - 0.6 && P[3 * i + 1] < corte) { zc = Math.max(zc, P[3 * i + 2]); yc += P[3 * i + 1]; xs += P[3 * i]; nc++; }
    if (nc) {
      const rTr = ac.raioRotorM * 0.17, disco = new THREE.Mesh(new THREE.CircleGeometry(rTr, 24), new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      disco.rotation.y = Math.PI / 2; const lado = xs / nc >= 0 ? 1 : -1;
      disco.position.set(lado * 0.42, yc / nc + rTr * 0.6, maxZ - rTr * 1.1); // coordenadas do helicóptero (escala real)
      this.discoCauda = disco;
    }
    return { c: cubo };
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
    const pa = new THREE.BoxGeometry(ac.raioRotorM, 0.05, 0.2); pa.translate(ac.raioRotorM / 2, 0, 0); const matPa = metal.clone();
    for (let i = 0; i < ac.pasRotor; i++) { const p = new THREE.Mesh(pa, matPa); p.rotation.y = i * 2 * Math.PI / ac.pasRotor; rotor.add(p); }
    g.add(rotor);
    const cauda = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 4.4 * esc, 10), corF); cauda.rotation.x = Math.PI / 2; cauda.position.set(0, 1.5, 2.2 + 2.2 * esc); g.add(cauda);
    const deriva = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.5), corFaixa); deriva.position.set(0, 2.0, 4.3 * esc + 0.3); g.add(deriva);
    const rc = new THREE.Group(); rc.position.set(0.25, 1.9, 4.4 * esc + 0.2);
    const pc = new THREE.BoxGeometry(0.05, ac.raioRotorM * 0.28, 0.1); for (let i = 0; i < 2; i++) { const p = new THREE.Mesh(pc, metal); p.rotation.x = i * Math.PI / 2; rc.add(p); } g.add(rc);
    const esqui = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6); esqui.rotateX(Math.PI / 2);
    for (const sx of [-0.9, 0.9]) { const e = new THREE.Mesh(esqui, metal); e.position.set(sx, 0.05, 0.3); g.add(e); for (const z of [-0.6, 1.2]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), metal); t.position.set(sx, 0.5, z); g.add(t); } }
    g.children.forEach(c => { c.castShadow = true; });
    const wrap = new THREE.Group(); while (g.children.length) wrap.add(g.children[0]); wrap.scale.setScalar(esc); g.add(wrap);
    this.disco = new THREE.Mesh(new THREE.CircleGeometry(ac.raioRotorM, 48), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.disco.rotation.x = -Math.PI / 2; this.disco.position.set(0, 3.1 * esc, 0.3 * esc); g.add(this.disco);
    this.animRotor = [{ pivo: rotor, eixo: 'y', fator: 1, mats: [matPa] }, { pivo: rc, eixo: 'x', fator: 6, mats: [] }];
    this.procedural = true;
  }

  // ---------- marcadores de fase e de rota ----------
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
  cone(x, z, cor = 0xff6a00, alt = 2, y0 = 0) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.6, alt, 8), new THREE.MeshStandardMaterial({ color: cor })); c.position.set(x, y0 + alt / 2, z); c.castShadow = true; this.marcadores.add(c); return c;
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
  // caminho da rota: traços laranja (cilindros) ligando os pontos, visíveis de longe
  linhaRota(pts) {
    const pecas = [], cima = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = new THREE.Vector3(pts[i].x, pts[i].y, pts[i].z), b = new THREE.Vector3(pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      const d = b.clone().sub(a), L = d.length(); if (L < 1) continue; d.normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(cima, d);
      for (let s = 10; s < L - 10; s += 45) {
        const len = Math.min(26, L - 10 - s); const c = a.clone().addScaledVector(d, s + len / 2);
        const geo = new THREE.CylinderGeometry(0.9, 0.9, len, 6, 1, true); geo.applyQuaternion(q); geo.translate(c.x, c.y, c.z); pecas.push(geo);
      }
    }
    if (!pecas.length) return;
    const m = new THREE.Mesh(mergeGeometries(pecas), new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.6, depthWrite: false }));
    this.marcadores.add(m);
  }

  // ---------- auxílios de navegação: farol no alvo e seta sobre o helicóptero ----------
  _nav() {
    this.nav = new THREE.Group(); this.nav.visible = false; this.scene.add(this.nav);
    const mag = 0xe040fb;
    this.farol = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: mag, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    this.farolTopo = new THREE.Mesh(new THREE.OctahedronGeometry(5), new THREE.MeshBasicMaterial({ color: mag }));
    this.nav.add(this.farol, this.farolTopo);
    // seta chata (chevron) deitada no plano horizontal, apontando para +Z: legível vista de trás e de cima
    const sh = new THREE.Shape(); sh.moveTo(0, 3.2); sh.lineTo(1.6, 1.0); sh.lineTo(0.55, 1.0); sh.lineTo(0.55, -1.6); sh.lineTo(-0.55, -1.6); sh.lineTo(-0.55, 1.0); sh.lineTo(-1.6, 1.0); sh.closePath();
    const gSeta = new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: false }); gSeta.rotateX(Math.PI / 2); gSeta.rotateY(Math.PI); gSeta.scale(1, 1, -1); gSeta.translate(0, 0, 0.5);
    const seta = new THREE.Group(); seta.add(new THREE.Mesh(gSeta, new THREE.MeshBasicMaterial({ color: mag, transparent: true, opacity: 0.92, side: THREE.DoubleSide })));
    this.seta = seta; this.scene.add(seta); seta.visible = false;
  }
  atualizarNav(alvo, h) {
    const tem = this.navLigado && alvo && alvo.x != null && h;
    if (!tem) { this.nav.visible = false; this.seta.visible = false; return null; }
    const chaoA = Math.max(0, elevacao(alvo.x, alvo.z)), yA = alvo.altFt != null ? Math.max(alvo.altFt * FT, chaoA + 3) : chaoA + 30;
    const dx = alvo.x - h.pos.x, dz = alvo.z - h.pos.z, d = Math.hypot(dx, dz);
    const alto = Math.max(yA - chaoA, 12);
    this.nav.visible = d > 18; this.farol.scale.set(1, alto, 1); this.farol.position.set(alvo.x, chaoA + alto / 2, alvo.z);
    this.farolTopo.position.set(alvo.x, yA + 6, alvo.z); this.farolTopo.rotation.y = this.tempo * 1.5;
    const esc = Math.max(1, d / 900); this.farolTopo.scale.setScalar(esc); this.farol.scale.x = this.farol.scale.z = Math.max(1, d / 1200);
    const e = this.ac ? this.ac.raioRotorM / 3.84 : 1;
    this.seta.visible = d > 30 && this.modoCamera !== 'cabine';
    if (this.seta.visible) { this.seta.position.set(h.pos.x, h.pos.y + 4.2 * e, h.pos.z); this.seta.scale.setScalar(e * 1.4); this.seta.lookAt(alvo.x, Math.min(Math.max(yA, h.pos.y - d * 0.3), h.pos.y + d * 0.3) + 4.2 * e, alvo.z); }
    let proa = Math.atan2(dx, -dz) * 180 / Math.PI; if (proa < 0) proa += 360;
    return { dist: d, proaDeg: proa, altFt: alvo.altFt != null ? alvo.altFt : null };
  }

  // ---------- atualização ----------
  _girarRotor(rpm, dt) {
    const sentido = this.ac.sentidoRotor === 'antihorario' ? 1 : -1;
    // velocidade "visual" limitada: a 60 quadros por segundo a rotação real das pás cria o efeito estroboscópico
    // (parecem paradas ou girando para trás). Acima disso, o disco borrado e as pás translúcidas dão a sensação de giro.
    for (const r of this.animRotor) {
      let d = sentido * rpm * r.fator * 2 * Math.PI / 60 * dt; const lim = 0.42; if (Math.abs(d) > lim) d = Math.sign(d) * lim;
      if (r.eixo === 'y') r.pivo.rotation.y += d; else r.pivo.rotation.x += d;
      if (r.mats) for (const m of r.mats) { m.transparent = true; m.opacity = 1 - 0.55 * Math.min(1, rpm / 300); m.depthWrite = m.opacity > 0.9; }
    }
    if (this.disco) this.disco.material.opacity = Math.min(0.22, rpm / 400 * 0.22);
    if (this.discoCauda) this.discoCauda.material.opacity = Math.min(0.3, rpm / 400 * 0.3);
  }
  _animarAgua(dt) { for (const t of this.aguas) { t.offset.x += dt * 0.012; t.offset.y += dt * 0.007; } }
  atualizar(h, dt) {
    this.tempo += dt;
    const g = this.heli; if (!g) return;
    g.position.set(h.pos.x, h.pos.y, h.pos.z);
    g.rotation.set(h.pitch, -h.yaw, -h.roll, 'YXZ');
    this._girarRotor(h.rrpm / 100 * this.ac.rpmRotor100, dt); this._animarAgua(dt);
    const w = h.vento(); const vv = Math.hypot(w.x, w.z);
    this.biruta.rotation.y = -Math.atan2(w.x, -w.z) + Math.PI / 2;
    this.birutaCone.rotation.z = Math.PI / 2 * Math.min(1, vv / 8) - Math.PI / 2 + Math.PI / 2;
    // sombra acompanha o helicóptero
    this.sol.position.set(h.pos.x + 400, h.pos.y + 700, h.pos.z + 300); this.sol.target.position.set(h.pos.x, 0, h.pos.z); this.sol.target.updateMatrixWorld();
    this._camera(h, dt);
  }
  vitrine(dt) { // menu: aeronave no pátio com o rotor girando devagar (marcha lenta) e a câmera passeando
    this.tempo += dt;
    if (this.heli && this.ac) this._girarRotor(this.ac.rpmRotor100 * 0.18, dt);
    this._animarAgua(dt); this.nav.visible = false; this.seta.visible = false;
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
      cam.position.y = Math.max(cam.position.y, Math.max(0, elevacao(cam.position.x, cam.position.z)) + 1.5);
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
