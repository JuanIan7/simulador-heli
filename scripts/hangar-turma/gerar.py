#!/usr/bin/env python3
"""Gera o Hangar da Turma (simulador-heli) a partir do Hangar CCOA pessoal, sem os dados pessoais."""
import re, sys
from pathlib import Path

hub = (Path.home() / "Projetos/hangar-ccoa/hub.tpl.html").read_text(encoding="utf-8")
sim = Path.home() / "Projetos/simulador-heli"
L = hub.split("\n")

def bloco(ini, fim):
    """Linhas do hub da que começa com `ini` até antes da que começa com `fim`."""
    a = next(i for i, l in enumerate(L) if l.startswith(ini))
    b = next(i for i, l in enumerate(L) if i > a and l.startswith(fim))
    return "\n".join(L[a:b])

css = hub[hub.index("<style>") + 7: hub.index("</style>")]
css += "\n.quadro{width:100%;border:0;display:block;min-height:70vh;background:transparent}\n.membro{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--linha)}\n.mat-turma{display:inline-flex;align-items:center;gap:4px}\n.mat-turma .sub{font-size:12px}\n.acerto{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--linha);flex-wrap:wrap}\n.acerto:last-child{border-bottom:0}\n.pix-caixa{display:flex;flex-direction:column;gap:6px}\n.pix-form{display:flex;gap:8px;flex-wrap:wrap}\n.pix-form input{flex:1 1 220px}\n.pix-tit{font-weight:700;margin-top:4px}\n"
(sim / "src/hangar").mkdir(exist_ok=True)
(sim / "src/hangar/hangar.css").write_text(css.strip() + "\n", encoding="utf-8")

revisao = bloco("revisao(){", "treino(){")
treino = bloco("treino(){", "materiais(){")
acessos = bloco("acessos(){", "};")
# fora do material da turma: CANAC, cofre de senhas e atalhos pessoais
acessos = re.sub(r'\s*<p class="sub">CANAC.*?</p>', "", acessos)
acessos = re.sub(r'\s*<div class="caixa"><h3>Meus atalhos</h3>.*?</div></div>`;', "\n  `;", acessos, flags=re.S)
metar = bloco("function decodificarMetar(txt){", "// ---------- ligações ----------")
sn = next(l for l in L if l.startswith("const SN = "))
ligar_treino = next(i for i, l in enumerate(L) if l.startswith("  treino(){ $('#mtBtn')"))
ligar_treino = "\n".join(L[ligar_treino:ligar_treino + 5])
esquilo = bloco("  { dia: 'esquilo'", "];")
ckdados = bloco("// ---------- checklists ----------", "// ---------- fim checklists ----------")
checklists = bloco("checklists(){", "revisao(){")
ligar_ck = bloco("  checklists(c){", "  treino(){ $('#mtBtn')")
for nome, txt in [("acessos", acessos), ("ligar", ligar_treino)]:
    for proibido in ["464823", "1Password", "NOTION", "PAINEL", "GDAF", "53357"]:
        assert proibido not in txt, (nome, proibido)

modelo = (Path(sys.argv[1])).read_text(encoding="utf-8")
saida = (modelo.replace("/*@SN@*/", sn).replace("/*@ESQUILO@*/", esquilo)
         .replace("/*@REVISAO@*/", revisao).replace("/*@TREINO@*/", treino).replace("/*@ACESSOS@*/", acessos)
         .replace("/*@METAR@*/", metar).replace("/*@LIGAR_TREINO@*/", ligar_treino)
         .replace("/*@CKDADOS@*/", ckdados).replace("/*@CHECKLISTS@*/", checklists).replace("/*@LIGAR_CK@*/", ligar_ck))
assert "/*@" not in saida
(sim / "src/hangar/main.js").write_text(saida, encoding="utf-8")
print("ok", len(saida))
