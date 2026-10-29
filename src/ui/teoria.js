// Telas das fases de teoria: fonia (diálogo), METAR (Go/No-Go), SIPAER (ordem das ações) e exercícios.
import { montarQuiz, embaralhar } from './quiz.js';

// ----- Fase 19: fonia -----
export function montarFonia(root, cartoes, aoTerminar) {
  let c = 0, p = 0, acertos = 0, total = 0;
  const render = () => {
    const cart = cartoes[c]; const passo = cart.passos[p];
    const hist = cart.passos.slice(0, p).map(x => `<div class="fon-linha ${x.quem.toLowerCase()}"><span class="fon-quem">${x.quem === 'ATC' ? '🗼 ' + (x.orgao || 'ATC') : '🎧 PIL'}</span>${x.quem === 'ATC' ? x.t : x.opcoes.find(o => o.ok).t}${x.en ? `<div class="fon-en">${x.en}</div>` : ''}</div>`).join('');
    root.innerHTML = `<div class="fon">
      <div class="fon-topo"><b>${cart.titulo}</b><span>${cart.orgao}</span></div>
      <div class="fon-ctx">${cart.contexto}</div>
      <div class="fon-hist" id="fonHist">${hist}</div>
      <div class="fon-atual" id="fonAtual"></div>
      <div class="fon-rodape"><span>cartão ${c + 1}/${cartoes.length} · acertos ${acertos}/${total}</span><button class="btn btn-laranja" id="fonProx" hidden>Continuar</button></div>
    </div>`;
    const atual = root.querySelector('#fonAtual'); const prox = root.querySelector('#fonProx');
    if (passo.quem === 'ATC') {
      atual.innerHTML = `<div class="fon-linha atc"><span class="fon-quem">🗼 ATC</span>${passo.t}${passo.en ? `<div class="fon-en">${passo.en}</div>` : ''}</div>`;
      prox.hidden = false; prox.onclick = avancar;
    } else {
      const ops = embaralhar(passo.opcoes.map((o, k) => ({ ...o, k })));
      atual.innerHTML = `${passo.pergunta ? `<div class="fon-perg">${passo.pergunta}</div>` : '<div class="fon-perg">Sua vez. Escolha a frase certa:</div>'}<div class="quiz-ops">${ops.map(o => `<button class="quiz-op" data-k="${o.k}">${o.t}</button>`).join('')}</div><div class="quiz-exp" id="fonExp" hidden></div>`;
      atual.querySelectorAll('.quiz-op').forEach(b => b.addEventListener('click', () => {
        const o = passo.opcoes[+b.dataset.k]; total++; if (o.ok) acertos++;
        atual.querySelectorAll('.quiz-op').forEach(bb => { bb.disabled = true; const oo = passo.opcoes[+bb.dataset.k]; if (oo.ok) bb.classList.add('certa'); else if (bb === b) bb.classList.add('errada'); });
        const exp = atual.querySelector('#fonExp'); exp.hidden = false;
        exp.innerHTML = o.ok ? `<b>Correto.</b>${passo.en ? ` <span class="fon-en">EN: ${passo.en}</span>` : ''}` : `<b>Erro de fraseologia:</b> ${o.erro}<br>Certo: "${passo.opcoes.find(x => x.ok).t}"`;
        prox.hidden = false; prox.onclick = avancar;
      }));
    }
    root.querySelector('#fonHist').scrollTop = 1e6;
  };
  const avancar = () => { p++; if (p >= cartoes[c].passos.length) { c++; p = 0; } if (c >= cartoes.length) aoTerminar({ acertos, total }); else render(); };
  render();
}

// ----- Fase 14: METAR Go/No-Go -----
export function montarMetar(root, mensagens, aoTerminar) {
  let i = 0, pontos = 0, total = 0;
  const render = () => {
    const m = mensagens[i]; let qi = 0; let decidido = false;
    const base = () => `<div class="met">
      <div class="met-topo"><b>${m.aerodromo}</b><span>${i + 1}/${mensagens.length}</span></div>
      <pre class="met-cod">${m.codigo}</pre>
      <div id="metCorpo"></div></div>`;
    root.innerHTML = base(); const corpo = root.querySelector('#metCorpo');
    const perg = () => {
      if (qi < m.perguntas.length) {
        montarQuiz(corpo, [m.perguntas[qi]], { titulo: 'Decodifique', aoResponder: (ok) => { total++; if (ok) pontos++; }, aoTerminar: () => { qi++; perg(); } });
      } else decisao();
    };
    const decisao = () => {
      corpo.innerHTML = `<div class="met-decod">${Object.entries(m.decod).map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
        <div class="quiz-p">O voo VFR de helicóptero sai?</div>
        <div class="met-go"><button class="btn btn-verde" data-d="GO">GO</button><button class="btn btn-vermelho" data-d="NO-GO">NO-GO</button></div>
        <div class="quiz-exp" id="metExp" hidden></div><div class="quiz-rodape"><button class="btn btn-laranja" id="metProx" hidden>Próxima</button></div>`;
      corpo.querySelectorAll('.met-go button').forEach(b => b.addEventListener('click', () => {
        if (decidido) return; decidido = true; total++; const ok = b.dataset.d === m.decisao; if (ok) pontos++;
        const exp = corpo.querySelector('#metExp'); exp.hidden = false; exp.innerHTML = `<b>${ok ? 'Decisão certa' : 'Decisão errada'}: ${m.decisao}.</b> ${m.motivo}`;
        const prox = corpo.querySelector('#metProx'); prox.hidden = false; prox.onclick = () => { i++; if (i >= mensagens.length) aoTerminar({ acertos: pontos, total }); else render(); };
      }));
    };
    perg();
  };
  render();
}

// ----- Fase 20: SIPAER, ordem das ações -----
export function montarSipaer(root, cenarios, aoTerminar) {
  let i = 0, pontos = 0, total = 0;
  const render = () => {
    const c = cenarios[i]; const itens = embaralhar([...c.passos_certos.map((t, k) => ({ t, k })), ...c.distratores.map(t => ({ t, k: -1 }))]);
    const escolhidos = [];
    root.innerHTML = `<div class="sip"><div class="met-topo"><b>${c.titulo}</b><span>${i + 1}/${cenarios.length}</span></div>
      <div class="quiz-p">Toque nas ações na ORDEM certa. Há ações que não devem ser feitas.</div>
      <div class="sip-lista" id="sipLista">${itens.map((it, idx) => `<button class="quiz-op" data-i="${idx}">${it.t}</button>`).join('')}</div>
      <div class="quiz-exp" id="sipExp" hidden></div><div class="quiz-rodape"><button class="btn btn-laranja" id="sipProx" hidden>Próximo</button></div></div>`;
    root.querySelectorAll('.sip-lista .quiz-op').forEach(b => b.addEventListener('click', () => {
      const it = itens[+b.dataset.i]; total++;
      if (it.k === escolhidos.length) { pontos++; escolhidos.push(it); b.classList.add('certa'); b.disabled = true; b.textContent = `${escolhidos.length}. ${it.t}`; }
      else { b.classList.add('errada'); setTimeout(() => b.classList.remove('errada'), 500); }
      if (escolhidos.length === c.passos_certos.length) { const exp = root.querySelector('#sipExp'); exp.hidden = false; exp.innerHTML = c.e; root.querySelectorAll('.sip-lista .quiz-op').forEach(x => x.disabled = true); const p = root.querySelector('#sipProx'); p.hidden = false; p.onclick = () => { i++; if (i >= cenarios.length) aoTerminar({ acertos: pontos, total }); else render(); }; }
    }));
  };
  render();
}

// Converte exercícios (enunciado/opcoes/r/e) para o formato do quiz
export const exParaQuiz = (ex) => ({ p: ex.enunciado, o: ex.opcoes, r: ex.r, e: ex.e, f: ex.f || '' });
