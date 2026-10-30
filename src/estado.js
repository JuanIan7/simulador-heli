// Progresso salvo no aparelho (localStorage): estrelas por fase e aeronave, preferências.
// Com a conta Google ligada (nuvem.js), o progresso também vai para o Firebase: `aoMudar` avisa a cada gravação.
const CHAVE = 'simheli.v1';
function ler() { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch { return {}; } }
function gravar(e) { try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch {} }
export const estado = {
  dados: ler(),
  aoMudar: null,
  get aeronave() { return this.dados.aeronave || 'r22'; },
  set aeronave(v) { this.dados.aeronave = v; gravar(this.dados); },
  get assist() { return this.dados.assist ?? 0.7; },
  set assist(v) { this.dados.assist = v; gravar(this.dados); },
  get giro() { return !!this.dados.giro; },
  set giro(v) { this.dados.giro = v; gravar(this.dados); },
  get camera() { return this.dados.camera || 'atras'; },
  set camera(v) { this.dados.camera = v; gravar(this.dados); },
  estrelas(fase) { return (this.dados.estrelas || {})[fase] || 0; },
  gravarEstrelas(fase, n) { this.dados.estrelas = this.dados.estrelas || {}; this.dados.jogadas = (this.dados.jogadas || 0) + 1; if (n > this.estrelas(fase)) this.dados.estrelas[fase] = n; gravar(this.dados); this.aoMudar?.(); },
  registrarProva(res) { this.dados.provas = this.dados.provas || []; this.dados.provas.push(res); gravar(this.dados); this.aoMudar?.(); },
  totalEstrelas() { return Object.values(this.dados.estrelas || {}).reduce((a, b) => a + b, 0); },
  // rotas do Simulador de voo: melhores estrelas e melhor tempo (separado das estrelas das fases)
  rota(id) { return (this.dados.rotas || {})[id] || { estrelas: 0, tempo: null }; },
  gravarRota(id, estrelas, tempo) {
    this.dados.rotas = this.dados.rotas || {}; const r = this.rota(id);
    this.dados.jogadas = (this.dados.jogadas || 0) + 1;
    this.dados.rotas[id] = { estrelas: Math.max(r.estrelas, estrelas), tempo: r.tempo == null ? tempo : Math.min(r.tempo, tempo) }; gravar(this.dados); this.aoMudar?.();
  },
  get nav() { return this.dados.nav ?? true; },
  set nav(v) { this.dados.nav = v; gravar(this.dados); },
  // ---- conta (nuvem.js) ----
  progresso() { const d = this.dados; return { estrelas: d.estrelas || {}, rotas: d.rotas || {}, provas: (d.provas || []).slice(-20), jogadas: d.jogadas || 0 }; },
  trocarProgresso(p, extra = {}) { Object.assign(this.dados, { estrelas: p.estrelas || {}, rotas: p.rotas || {}, provas: p.provas || [], jogadas: p.jogadas || 0 }, extra); gravar(this.dados); },
  marcar(extra) { Object.assign(this.dados, extra); gravar(this.dados); },
  zerarLocal() { this.dados.estrelas = {}; this.dados.rotas = {}; this.dados.provas = []; this.dados.jogadas = 0; gravar(this.dados); this.aoMudar?.(); },
};
