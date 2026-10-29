// Missões das fases de voo: condições iniciais, marcadores na cena, objetivos, dicas do instrutor e pontuação.
const KT = 0.514444, FT = 0.3048;
const dist2 = (a, bx, bz) => Math.hypot(a.x - bx, a.z - bz);
const difProa = (a, b) => { let d = (a - b) * 180 / Math.PI; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };
const SINAL = (h) => h.sinal === 1 ? { torque: 'DIREITA', pedal: 'ESQUERDO', pane: 'ESQUERDA' } : { torque: 'ESQUERDA', pedal: 'DIREITO', pane: 'DIREITA' };

class Missao {
  constructor(cena, h, ctx) {
    this.cena = cena; this.h = h; this.ctx = ctx; this.t = 0;
    this.objetivos = []; this.estado = 'andamento'; this.estrelas = 0; this.resumo = '';
    this.msgs = []; this._ultimaMsg = {}; this.botoes = []; this.cmdExtra = {};
    cena.limparMarcadores();
  }
  obj(texto) { const o = { texto, feito: false }; this.objetivos.push(o); return o; }
  dica(chave, texto, intervalo = 6) { const t = this.t; if ((this._ultimaMsg[chave] ?? -99) + intervalo > t) return; this._ultimaMsg[chave] = t; this.msgs.push(texto); }
  concluir(estrelas, resumo) { this.estado = 'sucesso'; this.estrelas = estrelas; this.resumo = resumo; }
  falhar(resumo) { this.estado = 'falha'; this.estrelas = 0; this.resumo = resumo; }
  // dicas gerais que valem em qualquer fase
  dicasGerais() {
    const h = this.h, s = SINAL(h);
    for (const e of h.eventos.splice(0)) {
      if (e.nome === 'buzina') this.dica('buzina', `Buzina de baixa RPM (< ${h.ac.buzinaBaixaRpm} %): baixe o coletivo AGORA. Potência é proporcional à RPM (SN-10).`, 4);
      if (e.nome === 'vrs') this.dica('vrs', 'Anel de vórtice: você desce rápido com pouca velocidade. Subir o coletivo piora. Ganhe velocidade à frente com o cíclico (SN-22).', 8);
      if (e.nome === 'estolPa') this.dica('estolPa', `Acima da Vne (${h.vneKt().toFixed(0)} kt): estol da pá que recua. Reduza o coletivo e a velocidade.`, 8);
      if (e.nome === 'baixoG') this.dica('baixoG', 'BAIXO G: o rotor descarregou. Cíclico PARA TRÁS, suave, antes de qualquer correção lateral (SN-11).', 8);
      if (e.nome === 'hvEntrou' && !this.semHv) this.dica('hv', 'Você entrou na zona sombreada do diagrama H-V: pouca altura para a velocidade. Acelere ou desça.', 12);
      if (e.nome === 'altaRpm') this.dica('altaRpm', 'RPM alta: suba um pouco o coletivo para frear o rotor.', 6);
      if (e.nome === 'pousoDuro') { this.dica('pousoDuro', 'Pouso duro. Amorteça o toque com o coletivo e zere a deriva antes de tocar.', 6); this.onPousou?.({ ...e, duro: true }); }
      if (e.nome === 'decolou') this.onDecolou?.(e);
      if (e.nome === 'pousou') this.onPousou?.(e);
      if (e.nome === 'paneSeca') this.dica('seca', 'PANE SECA: o combustível acabou. SN-15: nunca voe até acender a LOW FUEL.', 10);
      if (e.nome === 'crash') { this.falhar(e.texto); }
    }
  }
  update(dt) { this.t += dt; this.dicasGerais(); if (this.estado === 'andamento') this.passo(dt); }
  passo() {}
  guia() { return null; }
}

// ---------- Fase 2: torque ----------
export class M2 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 0, oatC: 25, ventoKt: 0 });
    this.semHv = true; this.proa0 = h.yaw; this.o1 = this.obj('Ficar "leve nos esquis" e subir ao pairado (3–5 ft)'); this.o2 = this.obj('Segurar a proa (±15°) por 10 s no pairado'); this.seg = 0; this.desvioMax = 0;
    c.caixaAlvo(0, 1.2, 0, 8, 1.5, 0x2ecc71);
    const s = SINAL(h); this.msgs.push(`Suba o coletivo devagar. O nariz vai querer ir para a ${s.torque}: use o pedal ${s.pedal}.`);
  }
  passo(dt) {
    const h = this.h, d = Math.abs(difProa(h.yaw, this.proa0)); this.desvioMax = Math.max(this.desvioMax, d);
    if (!h.noSolo && h.alturaFt > 2) this.o1.feito = true;
    if (d > 15) this.dica('proa', `A proa fugiu ${d.toFixed(0)}°. Lembre: torque empurra o nariz para a ${SINAL(h).torque}; pedal ${SINAL(h).pedal} junto com o coletivo.`, 5);
    if (this.o1.feito && !h.noSolo && h.alturaFt > 2 && h.alturaFt < 12 && d < 15) this.seg += dt; else if (d >= 15) this.seg = Math.max(0, this.seg - dt);
    if (this.seg >= 10) { this.o2.feito = true; this.concluir(this.desvioMax < 15 ? 3 : this.desvioMax < 40 ? 2 : 1, `Pairado segurado. Maior desvio de proa: ${this.desvioMax.toFixed(0)}°.`); }
    if (h.alturaFt > 40) this.dica('alto', 'Alto demais: o objetivo é pairado baixo (3–5 ft). Baixe um pouco o coletivo.', 6);
  }
  guia() { const h = this.h; return { modo: 'pairado', x: 0, z: 0, altFt: 4, proa: this.proa0, texto: this.o1.feito ? 'Segure o pairado a 3–5 ft com a proa parada' : 'Suba o coletivo devagar até o pairado; pedal contra o torque' }; }
}

// ---------- Fase 3: pairado IGE/OGE ----------
export class M3 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 0, oatC: 25, ventoKt: 0 });
    this.semHv = true; this.o1 = this.obj('Pairar dentro da caixa (3–8 ft) por 20 s'); this.o2 = this.obj('Subir e pairar a 50–80 ft (fora do efeito solo) por 10 s');
    this.caixa = c.caixaAlvo(0, 1.7, 0, 7, 1.6); this.caixa2 = c.caixaAlvo(0, 65 * FT, 0, 12, 30 * FT, 0x3fa9f5);
    this.s1 = 0; this.s2 = 0; this.mapIge = null; this.mapOge = null; this.fora = 0;
  }
  passo(dt) {
    const h = this.h, r = dist2(h.pos, 0, 0);
    if (!this.o1.feito) {
      if (!h.noSolo && h.alturaFt >= 3 && h.alturaFt <= 8 && r < 3.5) { this.s1 += dt; const v = h.ac.indicadorPotencia === 'MAP' ? h.map : h.tq; this.mapIge = this.mapIge == null ? v : this.mapIge + (v - this.mapIge) * Math.min(1, dt / 3); }
      else if (!h.noSolo) { this.fora += dt; if (r >= 3.5) this.dica('fora', 'Saiu da caixa: corrija com cíclico pequeno, contra a deriva. O rotor de cauda empurra o helicóptero para o lado.', 5); }
      if (this.s1 >= 20) { this.o1.feito = true; this.msgs.push(`Bom. ${h.ac.indicadorPotencia} no efeito solo: ${this.mapIge.toFixed(1)}. Agora suba para 50–80 ft e compare.`); }
    } else {
      if (h.alturaFt >= 50 && h.alturaFt <= 80 && r < 6) { this.s2 += dt; const v = h.ac.indicadorPotencia === 'MAP' ? h.map : h.tq; this.mapOge = this.mapOge == null ? v : this.mapOge + (v - this.mapOge) * Math.min(1, dt / 3); }
      if (this.s2 >= 10) { this.o2.feito = true; const d = (this.mapOge - this.mapIge); this.concluir(this.fora < 10 ? 3 : this.fora < 25 ? 2 : 1, `Fora do efeito solo o ${h.ac.indicadorPotencia} subiu de ${this.mapIge.toFixed(1)} para ${this.mapOge.toFixed(1)} (+${d.toFixed(1)}). É o preço de pairar sem o chão ajudando.`); }
    }
  }
  guia() { return this.o1.feito ? { modo: 'pairado', x: 0, z: 0, altFt: 65, proa: 0, texto: 'Suba para 50–80 ft (fora do efeito solo) e segure' } : { modo: 'pairado', x: 0, z: 0, altFt: 5, proa: 0, texto: 'Pairado dentro da caixa, 3–8 ft' }; }
}

// ---------- Fase 4: giro e deslocamentos ----------
export class M4 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 0, oatC: 25, ventoKt: 8, ventoDirDeg: 300 });
    this.semHv = true; this.o1 = this.obj('Girar 360° no pairado (3–10 ft)'); this.o2 = this.obj('Deslocar de lado até o cone à direita (15 m)'); this.o3 = this.obj('Voltar de ré até o cone atrás (15 m)');
    c.cone(15, 0, 0xff6a00); c.cone(0, 15, 0x3fa9f5); c.rotulo('DIREITA', 15, 4, 0); c.rotulo('RÉ', 0, 4, 15);
    this.giro = 0; this.yawAnt = h.yaw; this.toques = 0;
  }
  passo(dt) {
    const h = this.h; const pair = !h.noSolo && h.alturaFt > 2 && h.alturaFt < 15;
    if (!this.o1.feito) { if (pair) { this.giro += Math.abs(difProa(h.yaw, this.yawAnt)); } this.yawAnt = h.yaw; if (this.giro >= 350) { this.o1.feito = true; this.msgs.push('Giro completo. Agora de lado, para a direita, com cíclico suave e proa constante.'); } }
    else if (!this.o2.feito) { if (pair && dist2(h.pos, 15, 0) < 3) { this.o2.feito = true; this.msgs.push('Chegou. Agora de ré até o cone azul. Cuidado com o efeito pendular: comandos pequenos.'); } }
    else if (!this.o3.feito) { if (pair && dist2(h.pos, 0, 15) < 3) { this.o3.feito = true; this.concluir(this.toques === 0 ? 3 : this.toques < 3 ? 2 : 1, 'Manobras no pairado concluídas com vento de través.'); } }
    if (h.alturaFt > 25) this.dica('alto', 'Mantenha o pairado baixo (3–10 ft).', 6);
  }
  onPousou() { this.toques++; this.dica('toque', 'Tocou o chão durante a manobra. Segure a altura com o coletivo.', 4); }
  guia() { const h = this.h; if (!this.o1.feito) { this._proaGiro = (this._proaGiro ?? h.yaw) + 0.012; return { modo: 'pairado', x: 0, z: 0, altFt: 6, proa: this._proaGiro, texto: 'Gire 360° com os pedais, devagar, segurando a altura' }; } if (!this.o2.feito) return { modo: 'pairado', x: 15, z: 0, altFt: 6, proa: 0, texto: 'Deslocamento lateral para a DIREITA até o cone, proa no norte' }; return { modo: 'pairado', x: 0, z: 15, altFt: 6, proa: 0, texto: 'De RÉ até o cone azul, proa no norte, cíclico suave' }; }
}

// ---------- Fase 5: decolagem / ETL ----------
export class M5 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 0, oatC: 25, ventoKt: 5, ventoDirDeg: 360, x: 60, z: 450, yaw: 0 });
    this.o1 = this.obj('Acelerar rente ao solo (anel 1: 20 ft, ≥ 30 kt)'); this.o2 = this.obj('Sentir a ETL e cruzar o anel 2 (80 ft, ≥ 50 kt)'); this.o3 = this.obj('Subir a 500 ft a 60 kt, fora da zona H-V');
    this.a1 = c.anel(60, 20 * FT, 250, 12); this.a2 = c.anel(60, 80 * FT, -50, 14); c.rotulo('1', 60, 20 * FT + 10, 250); c.rotulo('2', 60, 80 * FT + 12, -50);
    this.etlVisto = false; this.hvTempo = 0;
  }
  passo(dt) {
    const h = this.h;
    if (h.etl > 0.9 && !this.etlVisto) { this.etlVisto = true; this.msgs.push('ETL: o helicóptero "ganhou" sustentação. A mesma potência agora dá mais altura. É a sustentação translacional.'); }
    if (h.fluxoTransverso > 0.6) this.dica('ft', 'Vibração: fluxo transverso (10–20 kt). Normal, continue acelerando.', 15);
    if (h.hvZona) this.hvTempo += dt;
    if (!this.o1.feito && Math.abs(h.pos.z - 250) < 8 && Math.abs(h.pos.x - 60) < 12 && h.alturaFt < 40 && h.kias >= 30) this.o1.feito = true;
    if (this.o1.feito && !this.o2.feito && Math.abs(h.pos.z + 50) < 10 && Math.abs(h.pos.x - 60) < 14 && h.alturaFt < 110 && h.kias >= 50) this.o2.feito = true;
    if (this.o2.feito && h.alturaFt >= 500) { this.o3.feito = true; this.concluir(this.hvTempo < 2 ? 3 : this.hvTempo < 6 ? 2 : 1, `Decolagem concluída. Tempo na zona H-V: ${this.hvTempo.toFixed(0)} s.`); }
    if (h.pos.z < -600 && !this.o2.feito) this.falhar('Passou do fim da pista sem cruzar os anéis. Reinicie e mantenha o eixo da pista.');
  }
  guia() { if (!this.o1.feito) return { modo: 'decolagemCorrida', x: 60, z: 250, altFt: 20, kias: 40, kiasSubida: 99, texto: 'Nariz baixo, acelere rente ao solo até o anel 1' }; if (!this.o2.feito) return { modo: 'decolagemCorrida', x: 60, z: -50, altFt: 80, kias: 60, kiasSubida: 50, texto: 'Sentiu a ETL? Continue acelerando; suba depois de 50 kt' }; return { modo: 'waypoint', x: 60, z: -2500, altFt: 520, kias: 60, texto: 'Suba a 500 ft mantendo 60 kt (Vy ≈ 53)' }; }
}

// ---------- Fase 6: peso, altitude e calor ----------
export class M6 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 5000, oatC: 35, ventoKt: 6, ventoDirDeg: 360, x: 60, z: 450, yaw: 0, combustivelL: h.ac.combustivelL * 0.7, cargaKg: Math.min(h.ac.pesoMaxKg - h.ac.pesoVazioKg - h.ac.combustivelL * 0.7 * h.ac.densidadeCombustivel, 175) });
    this.o1 = this.obj('Decolar sem deixar a RPM cair (buzina < 5 s)'); this.o2 = this.obj('Chegar a 300 ft e 50 kt');
    this.buzinaT = 0; this.msgs.push(`DA ≈ ${h.daFt.toFixed(0)} ft. Potência disponível ${(h.potAvail / 1000).toFixed(0)} kW de ${(h.ac.potTopW / 1000).toFixed(0)}. Não tente pairar alto: use o chão e a velocidade.`);
  }
  passo(dt) {
    const h = this.h; if (h.buzina) this.buzinaT += dt;
    if (!h.noSolo && h.alturaFt > 15 && h.kias < 20) this.dica('ogeImp', 'Sem velocidade você não tem potência para subir aqui. Volte para perto do chão e acelere.', 6);
    if (h.alturaFt >= 300 && h.kias >= 50) { this.o1.feito = this.buzinaT < 5; this.o2.feito = true; this.concluir(this.buzinaT < 2 ? 3 : this.buzinaT < 8 ? 2 : 1, `Saiu com DA ${h.daFt.toFixed(0)} ft. Buzina de baixa RPM por ${this.buzinaT.toFixed(1)} s.`); }
  }
  guia() { const h = this.h; return h.kias < 45 && h.alturaFt < 150 ? { modo: 'decolagemCorrida', x: 60, z: -600, altFt: 300, kias: 55, kiasSubida: 45, texto: 'Decolagem corrida: acelere baixo, sem puxar coletivo demais (olhe a RPM)' } : { modo: 'waypoint', x: 60, z: -2500, altFt: 320, kias: 55, texto: 'Suba a 300 ft a 50–55 kt' }; }
}

// ---------- Fase 7: circuito ----------
export class M7 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 0, oatC: 25, ventoKt: 8, ventoDirDeg: 360, x: 60, z: 450, yaw: 0 });
    this.portas = [
      { x: 60, y: 500, z: -350, n: 'contra o vento' }, { x: -250, y: 800, z: -500, n: 'través' }, { x: -450, y: 1000, z: 0, n: 'vento' },
      { x: -450, y: 1000, z: 500, n: 'vento (fim)' }, { x: -250, y: 700, z: 750, n: 'base' }, { x: 0, y: 400, z: 450, n: 'final' }];
    this.portas.forEach((p, i) => { c.anel(p.x, p.y * FT, p.z, 25, i === this.portas.length - 1 ? 0x2ecc71 : 0xff6a00); c.rotulo(`${i + 1} ${p.n}`, p.x, p.y * FT + 30, p.z); });
    c.heliponto(-120, 200, 'H', 0xffffff); c.heliponto(120, 200, '+', 0xff3b30); c.heliponto(-120, -200, 'H', 0xff6a00);
    c.rotulo('PÚBLICO', -120, 6, 200, '#fff'); c.rotulo('HOSPITAL', 120, 6, 200, '#fff'); c.rotulo('PRIVADO', -120, 6, -200, '#fff');
    this.alvo = { x: -120, z: 200 }; this.i = 0;
    this.oP = this.portas.map(p => this.obj('Anel ' + p.n)); this.oL = this.obj('Pousar no heliponto PÚBLICO');
  }
  passo() {
    const h = this.h, p = this.portas[this.i];
    if (p && dist2(h.pos, p.x, p.z) < 60 && Math.abs(h.alturaFt - p.y) < 200) { this.oP[this.i].feito = true; this.i++; if (this.i < this.portas.length) this.msgs.push(`Próximo: anel ${this.i + 1} (${this.portas[this.i].n}, ${this.portas[this.i].y} ft).`); else this.msgs.push('Final: pouse no H branco (público).'); }
  }
  onPousou(e) {
    const h = this.h; if (this.i < this.portas.length) { this.dica('cedo', 'Ainda faltam anéis do circuito. Decole e continue.', 5); return; }
    const d = dist2(h.pos, this.alvo.x, this.alvo.z);
    if (d < 12) { this.oL.feito = true; this.concluir(d < 5 ? 3 : 2, `Pousou no heliponto público a ${d.toFixed(0)} m do centro.`); }
    else if (dist2(h.pos, 120, 200) < 15) this.falhar('Pousou no heliponto do HOSPITAL: ele é exclusivo. Leia a sinalização.');
    else if (dist2(h.pos, -120, -200) < 15) this.falhar('Pousou no heliponto PRIVADO sem autorização do proprietário.');
    else this.dica('longe', 'Esse não é o heliponto. Decole e pouse no H branco.', 5);
  }
  guia() { const p = this.portas[this.i]; if (p) { const prox = this.portas[this.i + 1]; return { modo: this.i === 0 ? 'decolagemCorrida' : 'waypoint', x: p.x, z: p.z, altFt: p.y, kias: 60, kiasSubida: 50, texto: `Anel ${this.i + 1} (${p.n}) a ${p.y} ft, 60 kt` }; } return { modo: 'aproximacao', x: this.alvo.x, z: this.alvo.z, altFt: 400, kias: 55, proa: 0, texto: 'Final para o H branco (público): reduza altura e velocidade juntas' }; }
}

// ---------- Fase 8: aproximação e pouso ----------
export class M8 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 0, oatC: 25, ventoKt: 8, ventoDirDeg: 360, x: 0, y: 500 * FT, z: 1700, yaw: 0, rrpm: 102.5 });
    h.noSolo = false; h.vel.z = -60 * KT; h.coletivo = 0.5;
    this.o1 = this.obj('Descer com razão < 300 ft/min antes de 30 kt'); this.o2 = this.obj('Pousar no H com toque suave (< 300 ft/min)');
    c.caixaAlvo(0, 2, 0, 10, 4, 0x2ecc71); this.vrsT = 0; this.violou = false;
  }
  passo(dt) {
    const h = this.h;
    if (h.kias < 30 && h.descidaFtMin > 300 && !h.noSolo && h.alturaFt > 15) { this.violou = true; this.dica('regra', 'Abaixo de 30 kt com mais de 300 ft/min de descida: risco de anel de vórtice. Reduza a descida.', 5); }
    if (h.vrsSev > 0.3) this.vrsT += dt;
  }
  onPousou(e) {
    const h = this.h, d = dist2(h.pos, 0, 0), fpm = e.vDesc / FT * 60;
    this.o1.feito = !this.violou; if (d < 8) { this.o2.feito = fpm < 300; this.concluir(fpm < 150 && d < 4 && !this.violou ? 3 : fpm < 300 && d < 8 ? 2 : 1, `Toque a ${fpm.toFixed(0)} ft/min, ${d.toFixed(0)} m do centro.${this.vrsT > 0 ? ' Entrou no anel de vórtice por ' + this.vrsT.toFixed(0) + ' s.' : ''}`); }
    else this.dica('longe', `Pousou a ${d.toFixed(0)} m do H. Decole e corrija.`, 5);
  }
  guia() { return { modo: 'aproximacao', x: 0, z: 0, altFt: 500, kias: 60, proa: 0, anguloDeg: 10, texto: 'Aproximação normal: menos de 300 ft/min antes de 30 kt; pouse no H' }; }
}

// ---------- Fase 9: área restrita ----------
export class M9 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 0, oatC: 28, ventoKt: 5, ventoDirDeg: 360, x: -600, y: 300 * FT, z: 900, yaw: 0 });
    h.noSolo = false; h.vel.z = -40 * KT; h.coletivo = 0.5;
    this.cx = -600, this.cz = 500;
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; c.arvore(this.cx + Math.cos(a) * 32, this.cz + Math.sin(a) * 32, 14); }
    c.caixaAlvo(this.cx, 1.5, this.cz, 8, 3, 0xff6a00); c.rotulo('RESGATE', this.cx, 20, this.cz, '#ff6a00');
    this.o1 = this.obj('Pousar dentro da clareira'); this.o2 = this.obj('Decolar na vertical e sair acima das árvores (> 60 ft)'); this.pousou = false; this.colidiu = false;
  }
  passo() {
    const h = this.h, d = dist2(h.pos, this.cx, this.cz);
    if (!this.colidiu && d > 26 && d < 38 && h.alturaFt < 14 / FT && !h.noSolo) { this.colidiu = true; this.falhar('Bateu nas árvores. Na área restrita, passe com margem sobre as copas e desça íngreme dentro da clareira.'); }
    if (this.pousou && !h.noSolo && h.alturaFt > 60 && d < 26) { this.o2.feito = true; this.concluir(3, 'Resgate concluído: entrada e saída da clareira com decolagem de máxima performance.'); }
  }
  onPousou() { const d = dist2(this.h.pos, this.cx, this.cz); if (d < 6) { this.pousou = true; this.o1.feito = true; this.msgs.push('Pousou na clareira. Agora decole na vertical até passar das copas (60 ft) antes de inclinar.'); } }
  guia() { const h = this.h; if (!this.pousou) return { modo: 'aproximacao', x: this.cx, z: this.cz, altFt: 300, kias: 45, proa: 0, anguloDeg: 25, texto: 'Aproximação íngreme sobre as copas, pouso no centro da clareira' }; return { modo: 'subidaVertical', x: this.cx, z: this.cz, altFt: 90, proa: 0, texto: 'Decolagem de máxima performance: na vertical até passar as copas' }; }
}

// ---------- Fase 10: autorrotação ----------
export class M10 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 0, oatC: 25, ventoKt: 6, ventoDirDeg: 360, x: 60, y: 1500 * FT, z: 2200, yaw: 0 });
    h.noSolo = false; h.vel.z = -65 * KT; h.coletivo = 0.5;
    this.o1 = this.obj('Baixar o coletivo em até 2 s após a pane'); this.o2 = this.obj('Manter RPM do rotor 90–110 % e 60–70 kt'); this.o3 = this.obj('Flare a ~40 ft, nivelar a ~8 ft e tocar suave');
    this.tPane = 6 + Math.random() * 8; this.pane = false; this.tReacao = null; this.foraFaixa = 0; this.emAuto = 0;
    c.rotulo('CAMPO', 60, 10, 300, '#ff6a00');
  }
  passo(dt) {
    const h = this.h;
    if (!this.pane && this.t > this.tPane) { this.pane = true; this.cmdExtra.motor = 'off'; this.msgs.push(`PANE DE MOTOR! Coletivo embaixo, nariz para a ${SINAL(h).pane}: pedal contrário. 60–70 kt.`); }
    if (this.pane) {
      if (this.tReacao === null && h.coletivo < 0.3) { this.tReacao = this.t - this.tPane; this.o1.feito = this.tReacao <= 2; }
      this.emAuto += dt;
      if (h.rrpm < 90 || h.rrpm > 110 || h.kias < 55 || h.kias > 75) this.foraFaixa += dt;
      if (h.alturaFt < 120 && h.alturaFt > 90) this.dica('100ft', `Cheque dos 100 ft: RPM ${h.rrpm.toFixed(0)} %, ${h.kias.toFixed(0)} kt, ${h.descidaFtMin.toFixed(0)} ft/min.`, 30);
      if (h.alturaFt < 50 && h.alturaFt > 35 && h.kias > 40) this.dica('flare', 'FLARE: cíclico para trás.', 30);
    }
  }
  onPousou(e) {
    if (!this.pane) return;
    const fpm = e.vDesc / FT * 60; this.o2.feito = this.foraFaixa < this.emAuto * 0.3; this.o3.feito = fpm < 400;
    this.concluir(fpm < 200 && this.o1.feito && this.o2.feito ? 3 : fpm < 400 ? 2 : 1, `Autorrotação completa. Reação em ${this.tReacao?.toFixed(1) ?? '?'} s, toque a ${fpm.toFixed(0)} ft/min, ${(this.foraFaixa).toFixed(0)} s fora da faixa de RPM/velocidade.`);
  }
  guia() { const h = this.h; if (!this.pane) return { modo: 'waypoint', x: 60, z: -3000, altFt: 1500, kias: 65, texto: 'Voo reto a 1500 ft e 65 kt. Fique atento...' }; return { modo: 'autorrotacao', x: 60, z: 300, kias: 65, proa: 0, flareFt: h.ac.flareFt, nivelarFt: h.ac.nivelarFt, texto: h.alturaFt > 50 ? 'Coletivo embaixo, RPM no verde, 60–70 kt, campo à frente' : h.alturaFt > 9 ? 'FLARE: cíclico para trás' : 'Nivele e suba o coletivo para amortecer' }; }
}

// ---------- Fase 11: H-V ----------
export class M11 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 0, oatC: 25, ventoKt: 0, x: 60, z: 450, yaw: 0 });
    this.parte = 1; this.o1 = this.obj('Parte 1: subir na vertical até 300 ft (zona a evitar)'); this.o2 = this.obj('Parte 2: decolar pelo perfil certo e autorrotar na pane a 300 ft');
    this.pane = false; this.msgs.push('Parte 1: suba na vertical, parado, até 300 ft. Você está DENTRO da zona sombreada do H-V.');
    this.mostrarHV = true;
  }
  passo() {
    const h = this.h;
    if (this.parte === 1 && !this.pane && h.alturaFt >= 300) { this.pane = true; this.cmdExtra.motor = 'off'; this.msgs.push('PANE a 300 ft sem velocidade: tente a autorrotação...'); }
    if (this.parte === 2 && !this.pane && h.alturaFt >= 300 && h.kias >= 50) { this.pane = true; this.cmdExtra.motor = 'off'; this.msgs.push('PANE a 300 ft COM velocidade: coletivo embaixo, 60–70 kt, flare a 40 ft.'); }
    if (this.parte === 2 && h.hvZona) this.dica('hv2', 'Está na zona sombreada: acelere baixo antes de subir.', 8);
  }
  reiniciarParte2() {
    const h = this.h; this.parte = 2; this.pane = false; this.o1.feito = true; this.estado = 'andamento'; this.cmdExtra = {};
    h.reset({ hpFt: 0, oatC: 25, ventoKt: 0, x: 60, z: 450, yaw: 0 }); this.msgs.push('Parte 2: acelere rente ao solo e só suba depois de 50–60 kt.');
  }
  update(dt) {
    super.update(dt);
    if (this.parte === 1 && this.pane && (this.estado === 'falha' || this.h.noSolo && this.h.tempoNoSolo > 1)) {
      const txt = this.estado === 'falha' ? 'Como esperado: sem velocidade nem altura, a autorrotação não dá. ' : 'Conseguiu amortecer, mas foi sorte. ';
      this.msgs.push(txt + 'Agora a parte 2.'); this.reiniciarParte2();
    }
  }
  onPousou(e) {
    if (this.parte === 2 && this.pane) { const fpm = e.vDesc / FT * 60; this.o2.feito = true; this.concluir(fpm < 200 ? 3 : fpm < 400 ? 2 : 1, `Parte 2: toque a ${fpm.toFixed(0)} ft/min. Velocidade e altura fora da zona sombreada salvam a autorrotação.`); }
  }
  guia() { const h = this.h; if (this.parte === 1) return this.pane ? { modo: 'autorrotacao', kias: 60, proa: 0, flareFt: h.ac.flareFt, nivelarFt: h.ac.nivelarFt, texto: 'Pane sem velocidade: tente baixar o coletivo e amortecer...' } : { modo: 'subidaVertical', x: 60, z: 450, altFt: 320, proa: 0, texto: 'Parte 1: suba na vertical até 300 ft (dentro da zona a evitar)' }; if (!this.pane) return { modo: 'decolagemCorrida', x: 60, z: -600, altFt: 320, kias: 60, kiasSubida: 50, texto: 'Parte 2: acelere baixo e suba só depois de 50–60 kt' }; return { modo: 'autorrotacao', x: 60, z: -700, kias: 65, proa: 0, flareFt: h.ac.flareFt, nivelarFt: h.ac.nivelarFt, texto: h.alturaFt > 50 ? 'Pane com velocidade: coletivo embaixo, 60–70 kt' : h.alturaFt > 9 ? 'FLARE' : 'Nivele e amorteça' }; }
}

// ---------- Fase 12: estóis ----------
export class M12 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 0, oatC: 25, ventoKt: 0, x: 0, y: 900 * FT, z: 0 }); h.noSolo = false; h.coletivo = 0.55;
    this.o1 = this.obj('1) Entrar no anel de vórtice e sair com velocidade à frente'); this.o2 = this.obj('2) Passar da Vne, sentir o estol de pá e recuperar'); this.o3 = this.obj('3) Puxar o coletivo até a buzina e recuperar');
    this.etapa = 1; this.msgs.push('Desafio 1: a 900 ft, baixe o coletivo e desça na vertical, rápido (> 800 ft/min), sem velocidade.'); this.vrsOk = false; this.estolOk = false; this.buzOk = false;
  }
  passo() {
    const h = this.h;
    if (this.etapa === 1) {
      if (h.vrsSev > 0.5) this.vrsOk = true;
      if (this.vrsOk && h.vrsSev < 0.1 && h.kias > 25 && !h.noSolo) { this.o1.feito = true; this.etapa = 2; const altVne = h.ac.vneKt > 120 ? 5000 : 2500; h.reset({ hpFt: 0, oatC: 25, x: 0, y: altVne * FT, z: 0 }); h.noSolo = false; h.vel.z = -60 * KT; h.coletivo = 0.5; this.msgs.push(`Saiu do anel de vórtice. Desafio 2: a ${altVne} ft, potência alta e nariz baixo (mergulho raso) até passar da Vne (${h.ac.vneKt} kt).`); }
      if (h.alturaFt < 100 && this.vrsOk && h.vrsSev > 0.2) this.falhar('Baixo demais dentro do anel de vórtice. Saia dele cedo: nariz para a frente e velocidade.');
    } else if (this.etapa === 2) {
      if (h.estolPa > 0.12) this.estolOk = true;
      if (h.alturaFt < 400 && !this.estolOk) this.falhar('Desceu demais sem chegar à Vne. Refaça: potência alta e nariz baixo a partir de 2500 ft.');
      if (this.estolOk && h.estolPa < 0.05 && h.kias < h.vneKt() - 5) { this.o2.feito = true; this.etapa = 3; h.reset({ hpFt: 6000, oatC: 30, x: 0, y: 0, z: 0 }); this.msgs.push('Recuperou. Desafio 3: aeródromo a 6000 ft. Decole ao pairado e puxe o coletivo até a buzina; depois recupere baixando o coletivo.'); }
    } else {
      if (h.buzina) this.buzOk = true;
      if (this.buzOk && !h.buzina && h.rrpm > h.ac.buzinaBaixaRpm + 2 && !h.noSolo) { this.o3.feito = true; this.concluir(3, 'Três estóis reconhecidos e corrigidos: anel de vórtice, estol da pá que recua e baixa RPM.'); }
    }
  }
  guia() { const h = this.h; if (this.etapa === 1) return this.vrsOk ? { modo: 'recuperarVrs', altFt: 400, proa: 0, texto: 'Anel de vórtice: cíclico à FRENTE para ganhar velocidade (subir o coletivo piora)' } : { modo: 'descidaVertical', x: 0, z: 0, altFt: 0, proa: 0, descidaFtMin: 900, texto: 'Baixe o coletivo e desça na vertical, rápido, sem velocidade' }; if (this.etapa === 2) return this.estolOk ? { modo: 'recuperar', proa: 0, texto: 'Estol de pá: baixe o coletivo e cíclico para trás, reduza a velocidade' } : { modo: 'acelerar', x: 0, z: -9000, altFt: 2500, kias: 200, texto: 'Potência alta e nariz baixo (mergulho raso) até passar da Vne' }; return this.buzOk ? { modo: 'recuperarRpm', x: 0, z: 0, altFt: 5, proa: 0, texto: 'Buzina: BAIXE o coletivo para a RPM voltar' } : { modo: 'puxar', x: 0, z: 0, altFt: 5, proa: 0, texto: 'Puxe o coletivo até a buzina de baixa RPM' }; }
}

// ---------- Fase 13: ressonância com o solo ----------
export class M13 extends Missao {
  constructor(c, h, ctx) {
    super(c, h, ctx); h.reset({ hpFt: 0, oatC: 25, ventoKt: 5, ventoDirDeg: 360, x: 60, y: 200 * FT, z: 700, yaw: 0 }); h.noSolo = false; h.vel.z = -40 * KT; h.coletivo = 0.5;
    this.o1 = this.obj('Pousar na pista'); this.o2 = this.obj('Reconhecer a ressonância e agir (decolar com RPM ou CORTAR sem RPM)');
    this.botoes = [{ id: 'cortar', rotulo: 'CORTAR MOTOR' }]; this.evento = false; this.tEvento = 0; this.rpmNoEvento = 0;
  }
  passo(dt) {
    const h = this.h;
    if (this.evento) {
      this.tEvento += dt; h.ressonancia = Math.min(1.5, this.tEvento * 0.4);
      if (h.ressonancia > 0.3) this.dica('res', 'RESSONÂNCIA COM O SOLO! Com RPM no verde: DECOLE. Sem RPM: CORTE.', 30);
      if (this.cmdExtra.cortar) { h.ressonancia = 0; this.o2.feito = true; this.concluir(this.rpmNoEvento < h.ac.buzinaBaixaRpm ? 3 : 2, this.rpmNoEvento < h.ac.buzinaBaixaRpm ? 'Certo: sem RPM de voo, a saída é cortar o motor e frear o rotor.' : 'Cortou com RPM no verde: funciona, mas decolar de novo seria a saída mais rápida.'); }
      else if (!h.noSolo && h.alturaFt > 3) { h.ressonancia = 0; this.o2.feito = true; this.concluir(this.rpmNoEvento >= h.ac.buzinaBaixaRpm ? 3 : 1, this.rpmNoEvento >= h.ac.buzinaBaixaRpm ? 'Certo: com RPM de voo, tirar o helicóptero do chão interrompe a ressonância.' : 'Decolou com RPM baixa: arriscado. Sem RPM, corte o motor.'); }
      else if (this.tEvento > 6) this.falhar('A ressonância destruiu a aeronave em segundos. Decida rápido: decolar (RPM no verde) ou cortar (RPM baixa).');
    }
  }
  onPousou() {
    const h = this.h; if (this.evento) return; this.o1.feito = true; this.evento = true; this.rpmNoEvento = Math.random() < 0.5 ? h.rrpm : h.ac.buzinaBaixaRpm - 8; if (this.rpmNoEvento < h.ac.buzinaBaixaRpm) h.rrpm = this.rpmNoEvento;
    this.msgs.push('O helicóptero começou a balançar no chão...');
  }
  guia() { const h = this.h; if (!this.evento) return { modo: 'aproximacao', x: 60, z: 200, altFt: 200, kias: 45, proa: 0, anguloDeg: 10, texto: 'Aproximação e pouso na pista' }; const rpmOk = this.rpmNoEvento >= h.ac.buzinaBaixaRpm; return rpmOk ? { modo: 'subidaVertical', x: h.pos.x, z: h.pos.z, altFt: 15, proa: h.yaw, texto: 'RESSONÂNCIA com RPM no verde: DECOLE de novo' } : { modo: 'solo', botao: 'cortar', texto: 'RESSONÂNCIA com RPM baixa: CORTE o motor' }; }
}

export const MISSOES = { 2: M2, 3: M3, 4: M4, 5: M5, 6: M6, 7: M7, 8: M8, 9: M9, 10: M10, 11: M11, 12: M12, 13: M13 };
