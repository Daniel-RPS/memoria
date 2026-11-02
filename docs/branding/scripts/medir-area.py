"""
Mede quanto da tela cada token de cor ocupa nas capturas do app (docs/branding/capturas/medir-*.png, fundo "liso").

Método: cada pixel vai para o token opaco mais próximo do tema (distância RGB); se nenhum
estiver a menos de 24 de distância (ex.: antialias, manchas do fundo Aurora fortes), conta
como "outros". As cores vêm de docs/branding/tokens.json (que vem de src/index.css).

Uso (na raiz do projeto, depois de capturar-telas.mjs):
    python docs/branding/scripts/medir-area.py
"""
import json
from collections import Counter
from pathlib import Path

from PIL import Image

LIMITE = 24
PASTA = Path("docs/branding/capturas")
TOKENS = json.loads(Path("docs/branding/tokens.json").read_text(encoding="utf-8"))

# Só as cores-base (aliases repetem o mesmo valor) e as superfícies próprias.
NOMES = [
    "nevoa", "papel", "tinta", "grafite", "pauta", "caneta", "violeta-profundo",
    "marca-texto", "alerta", "popover", "secondary", "accent", "destructive", "input", "barra",
]


def paleta(tema):
    cores = {}
    for grupo in TOKENS["cores"].values():
        for nome, token in grupo.items():
            if nome in NOMES and "alfa" not in token[tema]:
                cores.setdefault(token[tema]["hex"], nome)
    return [(nome, tuple(int(hexa[i:i + 2], 16) for i in (1, 3, 5))) for hexa, nome in cores.items()]


def medir(arquivo, tema):
    cores = paleta(tema)
    contagem = Counter()
    imagem = Image.open(arquivo).convert("RGB")
    for (r, g, b), quantos in Counter(imagem.getdata()).items():
        nome, distancia = min(
            ((nome, ((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2) ** 0.5) for nome, (cr, cg, cb) in cores),
            key=lambda par: par[1],
        )
        contagem[nome if distancia <= LIMITE else "outros"] += quantos
    total = imagem.width * imagem.height
    return {nome: quantos / total for nome, quantos in contagem.most_common()}


resultado = {}
for tema in ("claro", "escuro"):
    soma = Counter()
    for tela in ("inicio", "semana"):
        medida = medir(PASTA / f"medir-{tela}-{tema}.png", tema)
        soma.update({nome: fracao / 2 for nome, fracao in medida.items()})
        print(f"\n{tela} · {tema}")
        for nome, fracao in list(medida.items())[:6]:
            print(f"  {nome:18} {fracao * 100:5.1f}%")
    resultado[tema] = soma
    print(f"\nMÉDIA Início+Semana · {tema}")
    for nome, fracao in soma.most_common(6):
        print(f"  {nome:18} {fracao * 100:5.1f}%")
