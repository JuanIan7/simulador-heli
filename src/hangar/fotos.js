// Aba Fotos e vídeos do Hangar: a pasta do Drive onde a turma guarda o que filma e fotografa na formação.
// A prévia usa a visão "embeddedfolderview" do próprio Google Drive (miniaturas, sem baixar o arquivo).
// Só carrega a pasta de quem for escolhido, para não puxar tudo de uma vez pelo 4G.
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const FOTOS_PASTA = '1ONwa1YC0rJqJvgpZlSDmF7JXEBdW_adt'; // "Fotos e Vídeos Formação" (Drive do Juan)
// subpastas de cada um (lidas em 13/11/2026); quem criar pasta nova aparece em "Todas as pastas"
const PESSOAS = [
  ['1uwpgQdrJREf6wKUSVRiO49gOl4Qfyz9e', 'Juan Araujo'],
  ['1OWyO7zwyfIUh8ub_SJTwm9ZXX7kxu2TD', 'Juan Meira'],
  ['1zG7BbMBygcF7uvu7uRdpoIleM1bn7UPN', 'Loureiro'],
  ['1YeBw7nzx4SQNnmR4lCQq2HB5BGw-aA-D', 'Paulo Henrique'],
  ['1ERkvLUdSuH7JnB_xb6ZeKhzWhWdMWo2S', 'Vinicius Martins'],
];
const CHAVE = 'hangar-fotos';
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch { return {}; } };
const gravar = (v) => { try { localStorage.setItem(CHAVE, JSON.stringify(v)); } catch {} };
const pastaUrl = (id) => `https://drive.google.com/drive/folders/${id}`;
const embed = (id, modo) => `https://drive.google.com/embeddedfolderview?id=${id}#${modo}`;

export function telaFotos() {
  const pref = ler();
  const sel = pref.pasta || '', modo = pref.modo === 'list' ? 'list' : 'grid';
  const nome = sel === FOTOS_PASTA ? 'Todas as pastas' : (PESSOAS.find(([id]) => id === sel) || [])[1];
  return `<h2>Fotos e vídeos</h2>
  <p class="intro">O que a turma fotografa e filma na formação fica numa pasta do Google Drive, com uma pasta para cada um. Aqui dá para ver as miniaturas antes de abrir. Toque num nome para carregar só a pasta daquela pessoa.</p>
  <div class="caixa destaque">
    <div class="linha-acao"><a class="btn pri" href="${pastaUrl(FOTOS_PASTA)}" target="_blank" rel="noopener">📁 Abrir a pasta no Drive (para enviar)</a></div>
    <p class="sub">Para mandar fotos e vídeos, abra a pasta no app do Google Drive, entre na sua pasta e toque em "+" › Upload.</p>
  </div>
  <div class="caixa">
    <div class="chips" role="group" aria-label="De quem">${PESSOAS.map(([id, n]) => `<button type="button" class="chip" data-fpasta="${id}" aria-pressed="${sel === id}">${esc(n)}</button>`).join('')}<button type="button" class="chip" data-fpasta="${FOTOS_PASTA}" aria-pressed="${sel === FOTOS_PASTA}">Todas as pastas</button></div>
    ${sel ? `<div class="cab ft-cab"><b>${esc(nome || 'Pasta')}</b><span class="chips"><button type="button" class="chip" data-fmodo="grid" aria-pressed="${modo === 'grid'}">Miniaturas</button><button type="button" class="chip" data-fmodo="list" aria-pressed="${modo === 'list'}">Lista</button><a class="chip" href="${pastaUrl(sel)}" target="_blank" rel="noopener">Abrir no Drive ↗</a></span></div>
      <iframe class="ft-quadro" src="${embed(sel, modo)}" title="Fotos e vídeos: ${esc(nome || 'pasta')}" loading="lazy" referrerpolicy="no-referrer"></iframe>
      <p class="sub">Tocar numa miniatura abre o arquivo no Drive. Vídeo aparece com o ícone de filme, porque o Drive não faz prévia de vídeo grande. Vídeo da GoPro passa de 1 GB: prefira abrir no Wi-Fi. A "Lista" mostra a data de cada arquivo.</p>`
    : `<p class="sub" style="margin-top:10px">Escolha uma pasta acima para ver as miniaturas.</p>`}
  </div>`;
}

export function ligarFotos(c, render) {
  c.querySelectorAll('[data-fpasta]').forEach((b) => b.onclick = () => { gravar({ ...ler(), pasta: b.dataset.fpasta }); render(); });
  c.querySelectorAll('[data-fmodo]').forEach((b) => b.onclick = () => { gravar({ ...ler(), modo: b.dataset.fmodo }); render(); });
}
