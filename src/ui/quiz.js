// Quiz de múltipla escolha (usado nas fases de teoria, no mini-quiz pós-voo e na prova).
export function embaralhar(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

export function montarQuiz(root, questoes, opts = {}) {
  let i = 0, acertos = 0, puladas = 0, consultadas = 0; const respostas = [];
  const titulo = opts.titulo || 'Quiz'; const limiteS = opts.limiteS || 0; let restante = limiteS; let timer = null;
  const render = () => {
    const q = questoes[i];
    root.innerHTML = `
      <div class="quiz">
        <div class="quiz-topo"><span>${titulo}</span><span>${i + 1}/${questoes.length}${limiteS ? ` · <b id="qzTempo">${fmt(restante)}</b>` : ''}</span></div>
        <div class="quiz-p">${q.p}</div>
        <div class="quiz-ops">${q.o.map((o, k) => `<button class="quiz-op" data-k="${k}">${o}</button>`).join('')}</div>
        <div class="quiz-exp" id="qzExp" hidden></div>
        <div class="quiz-rodape"><button class="btn btn-cinza" id="qzVer">👁 Ver resposta</button><button class="btn btn-cinza" id="qzPular">⏭ Pular</button><button class="btn btn-laranja" id="qzProx" hidden>Próxima</button></div>
      </div>`;
    root.querySelectorAll('.quiz-op').forEach(b => b.addEventListener('click', () => responder(+b.dataset.k)));
    root.querySelector('#qzProx').addEventListener('click', proxima);
    root.querySelector('#qzPular').addEventListener('click', () => { puladas++; respostas.push({ q: questoes[i], k: -1, ok: false, pulada: true }); proxima(); });
    root.querySelector('#qzVer').addEventListener('click', () => { consultadas++; responder(-1); });
  };
  const responder = (k) => {
    const q = questoes[i]; const ok = k === q.r; if (ok) acertos++; respostas.push({ q, k, ok, consultada: k === -1 });
    root.querySelector('#qzVer').hidden = true; root.querySelector('#qzPular').hidden = true;
    root.querySelectorAll('.quiz-op').forEach((b, idx) => { b.disabled = true; if (idx === q.r) b.classList.add('certa'); else if (idx === k) b.classList.add('errada'); });
    const exp = root.querySelector('#qzExp'); exp.hidden = false; exp.innerHTML = `<b>${k === -1 ? 'Resposta:' : ok ? 'Certo.' : 'Errado.'}</b> ${q.e}${q.f ? `<div class="fonte">Fonte: ${q.f}</div>` : ''}`;
    const prox = root.querySelector('#qzProx'); prox.hidden = false; prox.textContent = i === questoes.length - 1 ? 'Ver resultado' : 'Próxima';
    if (opts.aoResponder) opts.aoResponder(ok);
  };
  const proxima = () => { i++; if (i >= questoes.length) fim(); else render(); };
  const fim = () => { if (timer) clearInterval(timer); opts.aoTerminar?.({ acertos, total: questoes.length, respostas, puladas, consultadas }); };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  if (limiteS) timer = setInterval(() => { restante--; const el = root.querySelector('#qzTempo'); if (el) el.textContent = fmt(restante); if (restante <= 0) fim(); }, 1000);
  render();
  return { parar: () => timer && clearInterval(timer) };
}
