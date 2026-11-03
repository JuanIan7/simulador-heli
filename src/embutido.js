// Página aberta dentro do Hangar da Turma (hangar.html, com ?embed=1): esconde topo e rodapé e avisa a altura,
// para o quadro do Hangar crescer junto com o conteúdo.
if (new URLSearchParams(location.search).has('embed') && window.parent !== window) {
  document.documentElement.classList.add('embed');
  const avisar = () => parent.postMessage({ tipo: 'altura', h: document.documentElement.scrollHeight }, location.origin);
  new ResizeObserver(avisar).observe(document.body);
  addEventListener('load', avisar);
}
