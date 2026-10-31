"""Server di sviluppo di Come sto: serve la pagina e fa da ponte verso intervals.icu.

Serve solo per provare l'app sul proprio computer con i propri dati, senza incollare
la chiave nel browser. La chiave si legge da un file JSON che contiene {"api_key": "..."}
e non passa mai dalla pagina.

Uso:
    python dev/server.py 8801 PERCORSO/AL/FILE_CHIAVE.json
poi apri http://localhost:8801/?dev=ponte

Il file della chiave deve stare FUORI dalla cartella del progetto e non va mai nel repository.
Il ponte risponde solo a richieste fatte dalla pagina stessa su localhost, così un altro sito
aperto nel browser non può usarlo per leggere i tuoi dati.
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
# Si servono solo i file della pagina, mai .git, dev/ o altro.
CONSENTITI = ("/", "/index.html", "/manifest.webmanifest", "/favicon.ico")
CARTELLE_CONSENTITE = ("/css/", "/js/", "/img/")


def leggi_chiave(percorso):
    percorso = Path(percorso).resolve()
    if RADICE in percorso.parents:
        raise SystemExit("Il file della chiave sta dentro il progetto: spostalo fuori, non deve mai finire nel repository.")
    dati = json.loads(percorso.read_text(encoding="utf-8-sig"))
    chiave = dati.get("api_key")
    if not chiave:
        raise SystemExit("Nel file manca api_key")
    return chiave


class Gestore(SimpleHTTPRequestHandler):
    chiave = None
    porta = None

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def _host_valido(self):
        return self.headers.get("Host") in (f"localhost:{self.porta}", f"127.0.0.1:{self.porta}")

    def _dalla_pagina(self):
        # I browser moderni dicono da dove arriva la richiesta: il ponte accetta solo la pagina stessa.
        return self.headers.get("Sec-Fetch-Site", "same-origin") == "same-origin"

    def _ponte(self, metodo):
        if not self._dalla_pagina():
            self.send_error(403)
            return
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
        if not self._host_valido():
            return self.send_error(421)
        percorso = self.path.split("?", 1)[0]
        if percorso.startswith(PREFISSO + "/"):
            return self._ponte("GET")
        if percorso in CONSENTITI or (percorso.startswith(CARTELLE_CONSENTITE) and ".." not in percorso):
            return super().do_GET()
        return self.send_error(404)

    def do_PUT(self):
        if not self._host_valido():
            return self.send_error(421)
        if self.path.startswith(PREFISSO + "/"):
            return self._ponte("PUT")
        return self.send_error(405)

    def log_message(self, formato, *argomenti):
        # niente nei registri che possa contenere dati personali: solo metodo e percorso
        sys.stderr.write(f"{self.command} {self.path.split('?')[0]}\n")


class Server(ThreadingHTTPServer):
    # il browser chiede tutti i moduli insieme: con la coda standard di 5 Windows ne rifiuta qualcuno
    request_queue_size = 64


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    porta = int(sys.argv[1])
    Gestore.chiave = leggi_chiave(sys.argv[2])
    Gestore.porta = porta
    server = Server(("127.0.0.1", porta), partial(Gestore, directory=str(RADICE)))
    print(f"Come sto in sviluppo su http://localhost:{porta}/?dev=ponte")
    server.serve_forever()


if __name__ == "__main__":
    main()
