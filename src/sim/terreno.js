// Relevo do mundo, sem Three.js: serve à cena, à física (chão sob o helicóptero) e aos testes.
// Eixos: x leste, z sul (norte = −z). Aeródromo no centro (0,0), pista em x = 60.
// Até ~2,2 km do aeródromo o terreno é plano (onde as fases acontecem); depois vêm a serra,
// as pedras de granito (marcos da navegação), a lagoa e o litoral ao sul.

export const LAGOA = { x: -900, z: 1400, rx: 540, rz: 400, ang: 0.35 };
export const PEDRAS = [
  { nome: 'Corcovado', x: 2900, z: -3500, r: 480, h: 430, cristo: true },
  { nome: 'Pão de Açúcar', x: 3700, z: 5450, r: 330, h: 380 },
  { nome: 'Pedra da Gávea', x: -4300, z: 5250, r: 600, h: 700 },
  { nome: 'Dois Irmãos', x: -2500, z: 5350, r: 380, h: 480 },
];
export const MIRANTE = { x: -2000, z: -3000, r: 120 }; // platô do resgate na serra
export const HELIPONTOS = {
  base: { x: 0, z: 0, nome: 'Base (aeródromo)' },
  lagoa: { x: -280, z: 1480, nome: 'Heliponto da Lagoa (GOA)' },
  hospital: { x: 1390, z: -260, nome: 'Heliponto do Hospital' },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const suave = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function ruido(x, z) { // value noise
  const h = (i, j) => { const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return n - Math.floor(n); };
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  return (h(i, j) * (1 - sx) + h(i + 1, j) * sx) * (1 - sz) + (h(i, j + 1) * (1 - sx) + h(i + 1, j + 1) * sx) * sz;
}
export function ruidoFbm(x, z, oct = 4) { let e = 0, a = 1, s = 0; for (let o = 0; o < oct; o++) { e += a * ruido(x, z); s += a; a *= 0.5; x *= 2.1; z *= 2.1; } return e / s; }

// relevo de fundo: plano perto do aeródromo, serra mais alta ao norte e a oeste
function base(x, z) {
  const d = Math.hypot(x, z);
  const f = Math.min(1, Math.max(0, (d - 2200) / 2500));
  if (f <= 0) return 0;
  let e = 0, a = 1, fr = 1 / 2200;
  for (let o = 0; o < 4; o++) { e += a * ruido(x * fr + 7.3, z * fr + 2.1); a *= 0.5; fr *= 2.1; }
  const norte = Math.max(0, -z / 6000) * 0.6, oeste = Math.max(0, -x / 6000) * 0.4;
  return f * f * (e * 520 * (1 + norte + oeste) - 110);
}

// lagoa: raio normalizado (< 1 = dentro d'água), contorno irregular
export function lagoaRaio(x, z) {
  const dx = x - LAGOA.x, dz = z - LAGOA.z, c = Math.cos(LAGOA.ang), s = Math.sin(LAGOA.ang);
  const u = (dx * c + dz * s) / LAGOA.rx, v = (-dx * s + dz * c) / LAGOA.rz;
  const a = Math.atan2(v, u);
  const p = 1 + 0.08 * Math.sin(3 * a + 0.7) + 0.05 * Math.sin(5 * a + 2.1) + 0.03 * Math.sin(9 * a);
  return Math.hypot(u, v) / p;
}
// linha da praia (z cresce para o sul); o mar fica depois dela
export const costaZ = (x) => 6000 + 260 * Math.sin(x / 900) + 140 * Math.sin(x / 370 + 1);

function perfilPedra(u) { // domo de granito: topo arredondado, flancos íngremes, um pé de tálus
  if (u >= 1.5) return 0;
  if (u < 1) return Math.pow(1 - u * u, 0.55);
  return 0.06 * (1 - (u - 1) / 0.5);
}

let hMirante = null;
export function elevacao(x, z) {
  let e = base(x, z);
  // litoral: aplaina até a praia e afunda no mar
  const dz = z - costaZ(x);
  if (dz > -2700) { const k = suave(-2700, -300, dz); e = e * (1 - k) + 1.5 * k; } // baixada do litoral
  if (dz > -60) { const k = suave(-60, 140, dz); e = e * (1 - k) - 14 * k; }
  // pedras
  for (const p of PEDRAS) { const u = Math.hypot(x - p.x, z - p.z) / p.r; if (u < 1.5) e += p.h * perfilPedra(u); }
  // platô do mirante (resgate)
  const rm = Math.hypot(x - MIRANTE.x, z - MIRANTE.z);
  if (rm < MIRANTE.r * 2.2) { if (hMirante === null) hMirante = base(MIRANTE.x, MIRANTE.z); const k = 1 - suave(MIRANTE.r, MIRANTE.r * 2.2, rm); e = e * (1 - k) + hMirante * k; }
  // lagoa: fundo abaixo d'água
  const l = lagoaRaio(x, z);
  if (l < 1.12) e = Math.min(e, -3 + 3 * suave(0.92, 1.12, l));
  return e;
}
export const naAgua = (x, z) => elevacao(x, z) < -0.5;
// chão para a física: a água conta como superfície (pousar nela é tratado à parte)
export const chao = (x, z) => Math.max(0, elevacao(x, z));
