// Crepúsculo civil (Sol 6° abaixo do horizonte) para separar tempo diurno e noturno.
// Regra brasileira: voo noturno é o realizado entre o fim do crepúsculo civil vespertino e o início do matutino.
// Algoritmo do NOAA (precisão de 1 a 2 min, suficiente para conferir a CIV). Horários em hora local (UTC−3).

export const LOCAIS = {
  piraquara: { nome: 'Piraquara / Curitiba (SISY, SBBI, SBCT)', lat: -25.47, lon: -49.16 },
  rio: { nome: 'Rio de Janeiro (SBJR, SBRJ, SBGL)', lat: -22.93, lon: -43.30 },
};
export const FUSO_MIN = -180; // Brasília, sem horário de verão desde 2019

const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;

// minutos locais (0–1440) do início (manhã) e do fim (tarde) do crepúsculo civil no dia AAAA-MM-DD
export function crepusculoCivil(dataISO, lat, lon) {
  const [a, m, d] = dataISO.split('-').map(Number);
  const N = Math.round((Date.UTC(a, m - 1, d) - Date.UTC(a, 0, 0)) / 864e5);
  const g = 2 * Math.PI / 365 * (N - 1 + 0.5);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const cosH = (Math.cos(rad(96)) - Math.sin(rad(lat)) * Math.sin(decl)) / (Math.cos(rad(lat)) * Math.cos(decl));
  const H = deg(Math.acos(Math.max(-1, Math.min(1, cosH))));
  const meioDiaUTC = 720 - 4 * lon - eqt;
  return { inicio: meioDiaUTC - 4 * H + FUSO_MIN, fim: meioDiaUTC + 4 * H + FUSO_MIN };
}

export const paraMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
export const paraHHMM = (min) => { min = Math.round(min); const s = min < 0 ? '−' : ''; min = Math.abs(min); return s + String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); };

// divide o voo (início e fim em hora local) em minutos diurnos e noturnos; o fim antes do início passa da meia-noite
export function dividirVoo(dataISO, inicio, fim, local = LOCAIS.piraquara) {
  let i = paraMin(inicio), f = paraMin(fim);
  if (i == null || f == null) return null;
  if (f <= i) f += 1440;
  const dias = [dataISO, proxDia(dataISO)];
  let noturno = 0;
  for (let k = 0; k < 2; k++) {
    const c = crepusculoCivil(dias[k], local.lat, local.lon), base = k * 1440;
    // noite do dia k: [base, base+inicio) e [base+fim, base+1440)
    noturno += sobrepor(i, f, base, base + c.inicio) + sobrepor(i, f, base + c.fim, base + 1440);
  }
  const total = f - i;
  return { total, noturno: Math.round(noturno), diurno: Math.round(total - noturno) };
}
const sobrepor = (a, b, c, d) => Math.max(0, Math.min(b, d) - Math.max(a, c));
function proxDia(iso) { const [a, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(a, m - 1, d + 1)); return t.toISOString().slice(0, 10); }
