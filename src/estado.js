// Progresso salvo no aparelho (localStorage): estrelas por fase e aeronave, preferências.
const CHAVE = 'simheli.v1';
function ler() { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch { return {}; } }
function gravar(e) { try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch {} }
export const estado = {
  dados: ler(),
  get aeronave() { return this.dados.aeronave || 'r22'; },
  set aeronave(v) { this.dados.aeronave = v; gravar(this.dados); },
  get assist() { return this.dados.assist ?? 0.7; },
  set assist(v) { this.dados.assist = v; gravar(this.dados); },
  get giro() { return !!this.dados.giro; },
  set giro(v) { this.dados.giro = v; gravar(this.dados); },
  get camera() { return this.dados.camera || 'atras'; },
  set camera(v) { this.dados.camera = v; gravar(this.dados); },
  estrelas(fase) { return (this.dados.estrelas || {})[fase] || 0; },
  gravarEstrelas(fase, n) { this.dados.estrelas = this.dados.estrelas || {}; if (n > this.estrelas(fase)) { this.dados.estrelas[fase] = n; gravar(this.dados); } },
  registrarProva(res) { this.dados.provas = this.dados.provas || []; this.dados.provas.push(res); gravar(this.dados); },
  totalEstrelas() { return Object.values(this.dados.estrelas || {}).reduce((a, b) => a + b, 0); },
  // rotas do Simulador de voo: melhores estrelas e melhor tempo (separado das estrelas das fases)
  rota(id) { return (this.dados.rotas || {})[id] || { estrelas: 0, tempo: null }; },
  gravarRota(id, estrelas, tempo) {
    this.dados.rotas = this.dados.rotas || {}; const r = this.rota(id);
    this.dados.rotas[id] = { estrelas: Math.max(r.estrelas, estrelas), tempo: r.tempo == null ? tempo : Math.min(r.tempo, tempo) }; gravar(this.dados);
  },
  get nav() { return this.dados.nav ?? true; },
  set nav(v) { this.dados.nav = v; gravar(this.dados); },
};
