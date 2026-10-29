// Piloto automático didático. Serve a dois modos:
//  - "Ver demonstração": ele voa a fase e os comandos aparecem na tela com legenda;
//  - "Com ajuda": ele calcula o que faria e o jogo transforma a diferença em dica ("suba o coletivo", "pedal esquerdo"...).
// Cada missão descreve o alvo do momento (guia): pairado num ponto, waypoint, pouso, autorrotação, etc.
const KT = 0.514444, FT = 0.3048;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const difProa = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

export class PilotoAutomatico {
  constructor(h) { this.h = h; this.colInt = 0.5; this.proaInt = 0; this.ultimo = { coletivo: 0, cicX: 0, cicY: 0, pedal: 0 }; this.fase = null; }
  reset() { this.colInt = this.h.coletivo || 0.5; this.proaInt = 0; this.fase = null; }

  // devolve { coletivo, cicX, cicY, pedal, extra:{} , acoes:[texto] }
  calcular(alvo, dt) {
    const h = this.h; if (!alvo) return null;
    const alt = h.pos.y, altFt = h.alturaFt, vz = h.vel.y, ex = h.eixos();
    const vFwd = h.vFwd ?? 0, vRight = h.vRight ?? 0, kias = h.kias ?? 0;
    const cmd = { coletivo: this.colInt, cicX: 0, cicY: 0, pedal: 0, extra: {} };
    const hoverCol = () => this.colInt;
    // ---- utilidades
    const segurarProa = (proaAlvo, ganho = 1) => {
      if (proaAlvo == null) { cmd.pedal = clamp(-h.sinal * 0.42 * clamp(h.potEng / h.ac.potMcpW, 0, 1.2) - 2.2 * h.r, -1, 1); return; }
      const e = difProa(proaAlvo, h.yaw);
      if (Math.abs(e) < 0.5) this.proaInt = clamp(this.proaInt + e * 0.25 * dt, -0.5, 0.5); // integral só perto do alvo (sem windup)
      // antecipação do torque: quanto mais potência, mais pedal contra o torque (R22: esquerdo; Esquilo: direito)
      const ff = -h.sinal * 0.42 * clamp(h.potEng / h.ac.potMcpW, 0, 1.2);
      cmd.pedal = clamp(ff + 1.2 * e * ganho + this.proaInt - 2.2 * h.r, -1, 1);
    };
    const segurarAltitude = (altAlvoFt, vMax = 2.5) => {
      const vzCmd = clamp((altAlvoFt * FT - alt) * 0.35, -vMax, vMax);
      const e = vzCmd - vz;
      this.colInt = clamp(this.colInt + e * 0.12 * dt, 0, 1);
      cmd.coletivo = clamp(this.colInt + 0.06 * e, 0, 1);
      protegerRpm();
    };
    const protegerRpm = () => {
      const lim = h.ac.buzinaBaixaRpm + 1.5;
      if (h.rrpm < lim) { const d = (lim - h.rrpm) * 0.06; cmd.coletivo = clamp(cmd.coletivo - d, 0, 1); this.colInt = clamp(this.colInt - d * 0.5, 0, 1); }
    };
    // velocidade no solo no referencial do corpo (o vento vira só um deslocamento pequeno)
    const vFwdSolo = h.vel.x * ex.f.x + h.vel.z * ex.f.z, vRightSolo = h.vel.x * ex.right.x + h.vel.z * ex.right.z;
    const atitude = (pitchDes, rollDes) => { // comanda atitude: cíclico à frente baixa o nariz (pitch negativo)
      cmd.cicY = clamp(3.5 * (h.pitch - pitchDes) + 0.35 * h.q, -0.8, 0.8);
      cmd.cicX = clamp(3.0 * (rollDes - h.roll) - 0.35 * h.p, -0.7, 0.7);
    };
    const velocidadeCorpo = (vFwdDes, vRightDes) => {
      const pitchDes = clamp(-0.05 * (vFwdDes - vFwdSolo), -0.22, 0.22);
      const rollDes = clamp(0.05 * (vRightDes - vRightSolo), -0.22, 0.22);
      atitude(pitchDes, rollDes);
    };
    const pairarEm = (x, z, vMax = 3.5) => {
      const dx = x - h.pos.x, dz = z - h.pos.z;
      let vx = dx * 0.45, vzz = dz * 0.45; const n = Math.hypot(vx, vzz); if (n > vMax) { vx *= vMax / n; vzz *= vMax / n; }
      // sem vento no alvo: queremos velocidade de solo; converte para o corpo (usa velocidade no ar, aproximação)
      const vFwdDes = vx * ex.f.x + vzz * ex.f.z, vRightDes = vx * ex.right.x + vzz * ex.right.z;
      velocidadeCorpo(vFwdDes, vRightDes);
    };
    const irPara = (x, z, kiasAlvo) => {
      const dx = x - h.pos.x, dz = z - h.pos.z; const proaAlvo = Math.atan2(dx, -dz); const e = difProa(proaAlvo, h.yaw);
      const vDes = (Math.abs(e) > 0.6 ? Math.min(kiasAlvo, 40) : kiasAlvo) * KT; // em curva fechada, devagar
      const pitchDes = clamp(-0.06 * (vDes - vFwd), -0.3, 0.2);
      if (kias > 25) { const rollDes = clamp(e * 0.9 - 0.8 * h.r, -0.45, 0.45); atitude(pitchDes, rollDes); segurarProa(proaAlvo, 0.3); cmd.pedal = clamp(cmd.pedal, -0.5, 0.5); }
      else { atitude(pitchDes, clamp(-0.05 * vRightSolo, -0.2, 0.2)); segurarProa(proaAlvo); }
    };

    // SN-11: em voo à frente, nunca descarregar o rotor (baixo G). Se o G cair, segura o coletivo e só depois corrige o rolamento.
    const protegerG = () => {
      if (kias < 35 || h.noSolo) return;
      if (h.nG < 0.7) { cmd.coletivo = Math.max(cmd.coletivo, h.coletivo); this.colInt = Math.max(this.colInt, h.coletivo); cmd.cicY = Math.min(cmd.cicY, 0); }
      if (h.baixoG > 0) { cmd.cicY = Math.min(cmd.cicY, -0.3); cmd.cicX = clamp(cmd.cicX, -0.3, 0.3); }
    };

    switch (alvo.modo) {
      case 'solo': cmd.coletivo = 0; this.colInt = 0; cmd.pedal = 0; break;
      case 'pairado': {
        pairarEm(alvo.x, alvo.z); segurarProa(alvo.proa ?? null); segurarAltitude(alvo.altFt, 2.5);
        if (h.noSolo) { this.colInt = Math.min(this.colInt + 0.18 * dt, 0.9); cmd.coletivo = this.colInt; cmd.cicX = 0; cmd.cicY = 0; } // decolagem em dois tempos: coletivo devagar
        break;
      }
      case 'subidaVertical': { pairarEm(alvo.x, alvo.z); segurarProa(alvo.proa ?? null); segurarAltitude(alvo.altFt, 2.0); if (h.noSolo) { this.colInt = Math.min(this.colInt + 0.18 * dt, 0.9); cmd.coletivo = this.colInt; } break; }
      case 'descidaVertical': { pairarEm(alvo.x, alvo.z, 1.5); segurarProa(alvo.proa ?? null); this.colInt = clamp(this.colInt - 0.05 * dt, 0.3, 1); cmd.coletivo = this.colInt; if (h.descidaFtMin > (alvo.descidaFtMin ?? 900)) cmd.coletivo = this.colInt + 0.05; break; }
      case 'recuperarVrs': { atitude(-0.3, 0); segurarProa(alvo.proa ?? null); cmd.coletivo = clamp(this.colInt - 0.1, 0, 1); if (kias > 25) segurarAltitude(alvo.altFt, 3); break; }
      case 'waypoint': { irPara(alvo.x, alvo.z, alvo.kias); segurarAltitude(alvo.altFt, alvo.vMax ?? 4); protegerG(); if (h.noSolo) { this.colInt = Math.min(this.colInt + 0.18 * dt, 0.9); cmd.coletivo = this.colInt; cmd.cicY = 0; cmd.cicX = 0; } break; }
      case 'decolagemCorrida': { // acelera rente ao solo, sobe só depois de kiasSubida
        irPara(alvo.x, alvo.z, alvo.kias);
        const altAlvo = kias < (alvo.kiasSubida ?? 50) ? 15 : alvo.altFt;
        segurarAltitude(altAlvo, kias < (alvo.kiasSubida ?? 50) ? 1.5 : 4);
        if (h.noSolo) { this.colInt = Math.min(this.colInt + 0.15 * dt, 0.9); cmd.coletivo = this.colInt; cmd.cicY = 0.15; cmd.cicX = 0; }
        break;
      }
      case 'aproximacao': { // desce em rampa até o ponto e pousa
        const d = Math.hypot(alvo.x - h.pos.x, alvo.z - h.pos.z);
        const altRampa = clamp(d * Math.tan((alvo.anguloDeg ?? 10) * Math.PI / 180) / FT + 8, 8, 2000);
        const vDesc = kias < 32 ? (altFt > 80 ? 1.2 : 0.9) : 4; // abaixo de 30 kt: menos de ~300 ft/min (anel de vórtice)
        if (d > 90) { const kiasAlvo = clamp(d / 12, 20, alvo.kias ?? 60); irPara(alvo.x, alvo.z, kiasAlvo); segurarAltitude(Math.min(altRampa, alvo.altFt ?? 2000), vDesc); protegerG(); }
        else if (d > 4) { pairarEm(alvo.x, alvo.z, clamp(d / 8, 1.5, 7)); segurarProa(alvo.proa ?? null); segurarAltitude(Math.min(altRampa, alvo.altFt ?? 2000), vDesc); }
        else { pairarEm(alvo.x, alvo.z, 1.5); segurarProa(alvo.proa ?? null); segurarAltitude(-3, 0.8); if (h.noSolo) { this.colInt = clamp(this.colInt - 0.4 * dt, 0, 1); cmd.coletivo = this.colInt; cmd.cicX = 0; cmd.cicY = 0; } }
        break;
      }
      case 'pouso': { pairarEm(alvo.x, alvo.z, 2); segurarProa(alvo.proa ?? null); const d = Math.hypot(alvo.x - h.pos.x, alvo.z - h.pos.z); segurarAltitude(d > 3 ? 10 : -3, d > 3 ? 1.2 : 0.8); if (h.noSolo) { this.colInt = clamp(this.colInt - 0.4 * dt, 0, 1); cmd.coletivo = this.colInt; cmd.cicX = 0; cmd.cicY = 0; } break; }
      case 'autorrotacao': {
        // coletivo segura a RPM do rotor; cíclico segura 60–70 kt; flare a 40 ft; nivela a 8 ft e amortece
        const rpmAlvo = 100;
        if (altFt > 100) this.fase = null;
        if (this.fase !== 'amortecer' && altFt <= (alvo.nivelarFt ?? 9) + 3) this.fase = 'amortecer'; // uma vez nivelado, não volta ao flare
        if (this.fase === 'amortecer') { // nivela e segura ~150 ft/min de descida até o toque
          const descida = -vz; cmd.coletivo = h.noSolo ? 0 : clamp(0.45 + 0.18 * (descida - 0.8) + Math.max(0, 1.5 - descida) * 0, 0.3, 0.95);
          atitude(kias > 15 ? 0.16 : 0.06, clamp(-0.05 * vRightSolo, -0.15, 0.15)); segurarProa(alvo.proa ?? h.yaw, 0.6);
        } else if (altFt > (alvo.flareFt ?? 42) + 15) {
          this.colInt = clamp(this.colInt + (h.rrpm - rpmAlvo) * 0.05 * dt, 0, 0.45);
          cmd.coletivo = clamp(this.colInt + (h.rrpm - rpmAlvo) * 0.01, 0, 0.5);
          atitude(clamp(-0.03 * ((alvo.kias ?? 65) * KT - vFwd), -0.2, 0.2), 0); segurarProa(alvo.proa ?? h.yaw, 0.6);
          if (alvo.x != null && altFt > 200) { const dx = alvo.x - h.pos.x, dz = alvo.z - h.pos.z; const pa = Math.atan2(dx, -dz); cmd.cicX = clamp(difProa(pa, h.yaw) * 0.6, -0.3, 0.3); }
        } else if (altFt > (alvo.nivelarFt ?? 9) + 3) { cmd.coletivo = Math.min(this.colInt, 0.3); atitude(0.5, clamp(-0.05 * vRightSolo, -0.15, 0.15)); segurarProa(alvo.proa ?? h.yaw, 0.6); } // flare: nariz ~28° para cima
        else { this.fase = 'amortecer'; }
        break;
      }
      case 'acelerar': { // além da Vne: potência alta e mergulho raso (é assim que se passa da Vne sem querer)
        irPara(alvo.x, alvo.z, alvo.kias); atitude(-0.5, 0); cmd.coletivo = clamp(this.colInt + 0.15, 0, 0.85); protegerRpm(); break;
      }
      case 'recuperar': { cmd.coletivo = clamp(this.colInt - 0.25, 0, 1); cmd.cicY = -0.35; cmd.cicX = 0; segurarProa(alvo.proa ?? null, 0.5); break; }
      case 'puxar': { pairarEm(alvo.x, alvo.z); segurarProa(alvo.proa ?? null); this.colInt = clamp(this.colInt + 0.08 * dt, 0, 1); cmd.coletivo = this.colInt; break; }
      case 'recuperarRpm': { pairarEm(alvo.x, alvo.z); segurarProa(alvo.proa ?? null); this.colInt = clamp(this.colInt - 0.3 * dt, 0, 1); cmd.coletivo = this.colInt; break; }
      case 'livre': default: { cmd.coletivo = h.coletivo; cmd.cicX = h.cicX; cmd.cicY = h.cicY; cmd.pedal = h.pedal; }
    }
    if (alvo.botao) cmd.extra[alvo.botao] = true;
    cmd.acoes = this._acoes(cmd);
    this.ultimo = { coletivo: cmd.coletivo, cicX: cmd.cicX, cicY: cmd.cicY, pedal: cmd.pedal };
    return cmd;
  }
  // descreve em palavras o que o comando está fazendo (para a legenda da demonstração)
  _acoes(cmd) {
    const h = this.h, a = [];
    if (cmd.coletivo - h.coletivo > 0.03) a.push({ ctl: 'col', t: 'Coletivo: subindo' }); else if (h.coletivo - cmd.coletivo > 0.03) a.push({ ctl: 'col', t: 'Coletivo: baixando' });
    if (cmd.pedal < -0.15) a.push({ ctl: 'ped', t: 'Pedal ESQUERDO' }); else if (cmd.pedal > 0.15) a.push({ ctl: 'ped', t: 'Pedal DIREITO' });
    if (cmd.cicY > 0.12) a.push({ ctl: 'cic', t: 'Cíclico à FRENTE' }); else if (cmd.cicY < -0.12) a.push({ ctl: 'cic', t: 'Cíclico para TRÁS' });
    if (cmd.cicX > 0.12) a.push({ ctl: 'cic', t: 'Cíclico à DIREITA' }); else if (cmd.cicX < -0.12) a.push({ ctl: 'cic', t: 'Cíclico à ESQUERDA' });
    return a;
  }
}

// Transforma a diferença entre o que o piloto automático faria e o que o jogador está fazendo em UMA dica.
export function dicaDeAjuda(cmdAuto, cmdJogador, h) {
  if (!cmdAuto) return null;
  const dc = cmdAuto.coletivo - cmdJogador.coletivo, dp = cmdAuto.pedal - cmdJogador.pedal, dy = cmdAuto.cicY - cmdJogador.cicY, dx = cmdAuto.cicX - cmdJogador.cicX;
  const itens = [];
  if (h.buzina) itens.push({ ctl: 'col', t: 'Buzina de baixa RPM: BAIXE o coletivo agora', p: 10 });
  if (Math.abs(dc) > 0.07) itens.push({ ctl: 'col', t: dc > 0 ? (dc > 0.2 ? 'Suba o coletivo' : 'Suba um pouco o coletivo') : (dc < -0.2 ? 'Baixe o coletivo' : 'Baixe um pouco o coletivo'), p: Math.abs(dc) * 3 });
  if (Math.abs(dp) > 0.18) itens.push({ ctl: 'ped', t: dp > 0 ? 'Pedal DIREITO' : 'Pedal ESQUERDO', p: Math.abs(dp) * 1.6 });
  if (Math.abs(dy) > 0.15) itens.push({ ctl: 'cic', t: dy > 0 ? 'Cíclico à FRENTE' : 'Cíclico para TRÁS', p: Math.abs(dy) * 1.4 });
  if (Math.abs(dx) > 0.15) itens.push({ ctl: 'cic', t: dx > 0 ? 'Cíclico à DIREITA' : 'Cíclico à ESQUERDA', p: Math.abs(dx) * 1.4 });
  if (!itens.length) return { ctl: null, t: 'Assim mesmo. Mantenha.' };
  itens.sort((a, b) => b.p - a.p); return itens[0];
}
