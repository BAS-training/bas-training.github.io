"""Server di sviluppo di Come sto: serve la pagina e fa da ponte verso intervals.icu.

Serve solo per provare l'app sul proprio computer con i propri dati, senza incollare
la chiave nel browser. La chiave si legge da un file JSON che contiene {"api_key": "..."}
e non passa mai dalla pagina.

Uso:
    python dev/server.py 8801 PERCORSO/AL/FILE_CHIAVE.json
poi apri http://localhost:8801/?dev=ponte

Il file della chiave non va MAI messo nel repository.
"""
import base64
import json
import sys
import urllib.error
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
PREFISSO = "/intervals-ponte"


def leggi_chiave(percorso):
    dati = json.loads(Path(percorso).read_text(encoding="utf-8-sig"))
    chiave = dati.get("api_key")
    if not chiave:
        raise SystemExit("Nel file manca api_key")
    return chiave


class Gestore(SimpleHTTPRequestHandler):
    chiave = None

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _ponte(self, metodo):
        corpo = None
        if metodo == "PUT":
            lunghezza = int(self.headers.get("Content-Length") or 0)
            corpo = self.rfile.read(lunghezza) if lunghezza else None
        url = "https://intervals.icu" + self.path[len(PREFISSO):]
        segreto = base64.b64encode(f"API_KEY:{self.chiave}".encode()).decode()
        richiesta = urllib.request.Request(url, data=corpo, method=metodo, headers={
            "Authorization": "Basic " + segreto,
            "Accept": "application/json",
            "Content-Type": self.headers.get("Content-Type", "application/json"),
            # intervals.icu sta dietro Cloudflare, che blocca il nome predefinito di urllib
            "User-Agent": "ComeSto-dev/1.0",
        })
        try:
            with urllib.request.urlopen(richiesta, timeout=60) as risposta:
                stato, contenuto = risposta.status, risposta.read()
        except urllib.error.HTTPError as errore:
            stato, contenuto = errore.code, errore.read()
        except urllib.error.URLError:
            stato, contenuto = 502, b'{"error":"intervals.icu non raggiungibile"}'
        self.send_response(stato)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(contenuto)))
        self.end_headers()
        self.wfile.write(contenuto)

    def do_GET(self):
        if self.path.startswith(PREFISSO + "/"):
            return self._ponte("GET")
        return super().do_GET()

    def do_PUT(self):
        if self.path.startswith(PREFISSO + "/"):
            return self._ponte("PUT")
        self.send_error(405)

    def log_message(self, formato, *argomenti):
        # niente nei registri che possa contenere dati personali: solo metodo e percorso
        sys.stderr.write(f"{self.command} {self.path.split('?')[0]}\n")


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    porta = int(sys.argv[1])
    Gestore.chiave = leggi_chiave(sys.argv[2])
    server = ThreadingHTTPServer(("127.0.0.1", porta), partial(Gestore, directory=str(RADICE)))
    print(f"Come sto in sviluppo su http://localhost:{porta}/?dev=ponte")
    server.serve_forever()


if __name__ == "__main__":
    main()
