"""Mette lo stesso numero di versione su tutti i file della pagina, prima di pubblicare.

GitHub Pages tiene i file in memoria per qualche minuto: senza un numero di versione, subito dopo
un aggiornamento un telefono potrebbe mescolare file vecchi e nuovi. Lo script aggiunge ?v=AAAAMMGGHHMM
a ogni import tra i file in js/ e a tutti i collegamenti di index.html ai file css/ e js/, così tutti
cambiano insieme.

Uso:  python strumenti/versione.py
"""
import re
import time
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
versione = time.strftime("%Y%m%d%H%M")

IMPORT = re.compile(r'''((?:from|import)\s*["'])(\.{1,2}/[^"'?]+\.js)(?:\?v=\w+)?(["'])''')
for file in sorted((RADICE / "js").rglob("*.js")):
    testo = file.read_text(encoding="utf-8")
    nuovo = IMPORT.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={versione}{m.group(3)}", testo)
    if nuovo != testo:
        file.write_text(nuovo, encoding="utf-8")

# Tutti i fogli di stile e gli script della pagina, anche quelli che arrivano dopo.
COLLEGAMENTO = re.compile(r'''((?:href|src)=")((?:css|js)/[^"?]+\.(?:css|js))(?:\?v=\w+)?(")''')
indice = RADICE / "index.html"
testo = indice.read_text(encoding="utf-8")
indice.write_text(COLLEGAMENTO.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={versione}{m.group(3)}", testo), encoding="utf-8")
print(f"versione {versione}")
