// Aba "Tutoriais" do Hangar da Turma: vídeos que mostram como usar o Hangar.
// Os vídeos ficam no Google Drive da turma (pasta "Tutoriais em vídeo", dentro da pasta de materiais); aqui vai só o link,
// para o site continuar leve. Vídeo novo: subir na pasta do Drive e acrescentar uma linha em TUTORIAIS (o mais novo aparece primeiro).
export const TUTORIAIS_PASTA = '1MiDfnPVzufwQsT3R8PUkgxX0mLFs9UMs';
export const TUTORIAIS = [
  { id: 'apresentacao-2026-11-20', data: '2026-11-20', dur: '3 min 34 s', drive: '1Zw5lKKYGydzBVInLPJLeQ1mFD4z4ezUz',
    titulo: 'Como funciona o Hangar e o que tem de novo',
    desc: 'Um passeio pelo Hangar inteiro, com legenda: como navegar, Tempo, Conversões e calculadoras, Checklists, Treino, Estudo, Materiais e o botão Dúvidas, com o atendente de inteligência artificial.',
    topicos: ['Navegação pelos cinco assuntos', 'Tempo para o voo e Conversões', 'Checklists, Treino, Estudo e Materiais', 'Dúvidas: resposta da IA e resposta pessoal do Juan'] },
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataBR = (iso) => iso.split('-').reverse().join('/');

export function telaTutoriais() {
  const l = [...TUTORIAIS].sort((a, b) => b.data.localeCompare(a.data));
  return `<h2>Tutoriais</h2>
  <p class="intro">Vídeos curtos que mostram como usar o Hangar. Eles ficam numa pasta do Google Drive da turma, e aqui vai só o link. Toque em Assistir para abrir o vídeo.</p>
  ${l.map((t) => `<div class="caixa tut">
    <div class="cab"><h3>${esc(t.titulo)}</h3><span class="sub">${dataBR(t.data)} · ${esc(t.dur)}</span></div>
    <p>${esc(t.desc)}</p>
    ${t.topicos?.length ? `<ul class="tut-top">${t.topicos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <div class="linha-acao"><a class="btn pri" href="https://drive.google.com/file/d/${t.drive}/view" target="_blank" rel="noopener">▶ Assistir no Google Drive</a></div></div>`).join('')}
  <div class="caixa"><h3>Todos os vídeos</h3><p class="sub">A pasta tem todos os tutoriais, para assistir ou baixar.</p>
    <div class="links"><a class="pdf" href="https://drive.google.com/drive/folders/${TUTORIAIS_PASTA}" target="_blank" rel="noopener">📁 Abrir a pasta dos tutoriais no Google Drive</a></div></div>`;
}
