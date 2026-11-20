#!/usr/bin/env python3
"""Gera o símbolo do Hangar da Turma (Esquilo vermelho, modelo E "Pista") em public/icons/hangar.

Uso (no Mac, precisa do Pillow): python3 scripts/hangar-turma/simbolo/gerar-icones.py
Os PNG saem do SVG pelo qlmanage, que já vem no macOS.
"""
import subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import esquilo as e

ESC, LAR, CHAO = '#1B1714', '#E8600A', '#F5F2EE'
saida = Path(__file__).resolve().parents[3] / 'public/icons/hangar'
saida.mkdir(parents=True, exist_ok=True)
heli = e.lado('e', ESC)


def svg(miolo):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs>{heli}</defs>{miolo}</svg>\n'


def pista(x, y, lado):
    return (f'<rect width="512" height="512" fill="{CHAO}"/><rect y="408" width="512" height="104" fill="{LAR}"/>'
            f'<rect y="400" width="512" height="8" fill="{ESC}"/><use href="#e-lado-e" x="{x}" y="{y}" width="{lado}" height="{lado}"/>')


ICONE = svg(pista(6, -28, 500))            # ícone quadrado (o aparelho arredonda os cantos)
SIMBOLO = svg(f'<circle cx="256" cy="256" r="256" fill="{CHAO}"/><use href="#e-lado-e" x="26" y="26" width="460" height="460"/>')

(saida / 'icone.svg').write_text(ICONE, encoding='utf-8')
(saida / 'simbolo.svg').write_text(SIMBOLO, encoding='utf-8')

with tempfile.TemporaryDirectory() as tmp:
    def png(texto, nome, lados):
        f = Path(tmp) / f'{nome}.svg'
        f.write_text(texto, encoding='utf-8')
        subprocess.run(['qlmanage', '-t', '-s', '1024', '-o', tmp, str(f)], check=True, capture_output=True)
        base = Image.open(f'{f}.png').convert('RGB')
        assert base.size == (1024, 1024), base.size
        for arquivo, lado in lados:
            base.resize((lado, lado), Image.LANCZOS).save(saida / arquivo, optimize=True)
    png(ICONE, 'icone', [('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)])
print('ok', sorted(p.name for p in saida.iterdir()))
