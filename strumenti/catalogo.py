"""Genera js/catalogo.js dal catalogo dei percorsi della Bike Adventure Series.

Il catalogo vive fuori dal repository, in BAS Training/03_Eventi/catalogo_eventi.json, con note,
fonti e analisi delle tracce. Nella pagina entrano solo i numeri pubblici (km, dislivello, giorni,
partenze, fine della finestra) e i campi interni del modello delle ore (1.2 della specifica), che
non si mostrano mai. Mai coordinate, punti, file GPX, note o fonti, perché i campi si scelgono
uno per uno.

Uso:  python strumenti/catalogo.py [PERCORSO/DI/catalogo_eventi.json]
Senza argomento legge il catalogo nella cartella BAS Training accanto al repository. Quando il
catalogo cambia si rilancia lo script, si fanno girare le prove e si pubblica.
"""
import json
import re
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
PREDEFINITO = RADICE.parent / "BAS Training" / "03_Eventi" / "catalogo_eventi.json"
USCITA = RADICE / "js" / "catalogo.js"

# Le sei classi di fondo, come STIMA.classi in js/parametri.js.
CLASSI = {"misto", "sterrato-ripido", "asfalto-passi", "asfalto-collinare", "asfalto-dolce", "misto-dolce"}
DATA = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def numero(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def controlla(percorsi):
    """Gli errori del catalogo, uno per riga. Le stesse regole di test/catalogo.test.mjs."""
    errori = []
    visti = set()
    for p in percorsi:
        pid = p.get("id")
        m = p.get("modello") or {}

        def errore(testo):
            errori.append(f"{pid} {testo}")

        if not isinstance(pid, str) or not pid:
            errori.append("un percorso senza id")
            continue
        if pid in visti:
            errore("compare due volte")
        visti.add(pid)
        if not numero(p.get("km")) or p["km"] <= 0:
            errore("senza km")
        tipici = p.get("giorni_tipici") or []
        giorni = [p.get("giorni_min"), p.get("giorni_max"), *tipici]
        if not tipici or not all(isinstance(g, int) and g >= 1 for g in giorni):
            errore("con i giorni sbagliati")
        elif not p["giorni_min"] <= min(tipici) <= max(tipici) <= p["giorni_max"]:
            errore("con i giorni tipici fuori dalla forbice")
        if not p.get("partenze") or not all(isinstance(d, str) and DATA.match(d) for d in p["partenze"]):
            errore("senza partenze")
        if not isinstance(p.get("fine_finestra"), str) or not DATA.match(p["fine_finestra"]):
            errore("senza fine della finestra")
        if not m:
            errore("senza il modello")
            continue
        if m.get("classe_fondo") not in CLASSI:
            errore("con una classe di fondo sconosciuta")
        if not numero(m.get("fattore_dislivello")) or not 1.0 <= m["fattore_dislivello"] <= 1.2:
            errore("con il fattore del dislivello fuori da 1,00-1,20")
        ufficiale = p.get("dislivello_m")
        lavoro = m.get("dislivello_lavoro_m")
        if not (numero(ufficiale) and ufficiale > 0) and not (numero(lavoro) and lavoro > 0):
            errore("senza dislivello, né ufficiale né di lavoro")
        if not numero(m.get("bici_kg")) or m["bici_kg"] <= 0:
            errore("senza la massa della bici")
        if not numero(m.get("borse_kg")) or m["borse_kg"] < 0:
            errore("senza le borse")
        if not numero(m.get("acqua_cibo_kg")) or m["acqua_cibo_kg"] <= 0:
            errore("senza acqua e cibo")
        if not isinstance(m.get("giorni_dal_via"), bool) or not isinstance(m.get("ebike_ammessa"), bool):
            errore("senza giorni dal via o e-bike")
        c = m.get("costante_salita")
        if c is not None and (not numero(c) or not 9 <= c <= 13):
            errore("con la costante di salita fuori da 9-13")
        fs = m.get("fattore_fondo")
        if fs is not None and (not numero(fs) or not 1.0 <= fs <= 1.6):
            errore("con il fattore di fondo fuori da 1,00-1,60")
    return errori


def per_app(p):
    """Solo i campi che servono all'app, con i nomi del codice. Tutto il resto resta fuori."""
    m = p["modello"]
    modello = {
        "classe": m["classe_fondo"],
        "fattoreDislivello": m["fattore_dislivello"],
        "dislivelloLavoro": m["dislivello_lavoro_m"] if not numero(p.get("dislivello_m")) else None,
        "biciKg": m["bici_kg"],
        "borseKg": m["borse_kg"],
        "acquaCiboKg": m["acqua_cibo_kg"],
        "giorniDalVia": m["giorni_dal_via"],
        "ebikeAmmessa": m["ebike_ammessa"],
    }
    if m.get("costante_salita") is not None:
        modello["c"] = m["costante_salita"]
    if m.get("fattore_fondo") is not None:
        modello["fs"] = m["fattore_fondo"]
    return {
        "id": p["id"],
        "eventoId": p["evento_id"],
        "evento": p["evento"],
        "nome": p["percorso"],
        "km": p["km"],
        "dislivello": p["dislivello_m"] if numero(p.get("dislivello_m")) else None,
        "giorniMin": p["giorni_min"],
        "giorniMax": p["giorni_max"],
        "giorniTipici": p["giorni_tipici"],
        "partenze": p["partenze"],
        "fineFinestra": p["fine_finestra"],
        "modello": modello,
    }


def valore(v):
    if isinstance(v, dict):
        return "{ " + ", ".join(f"{k}: {valore(x)}" for k, x in v.items()) + " }"
    if isinstance(v, list):
        return "[" + ", ".join(valore(x) for x in v) + "]"
    return json.dumps(v, ensure_ascii=False)


def scrivi(percorsi):
    righe = [
        "// Il catalogo dei percorsi della Bike Adventure Series, generato da strumenti/catalogo.py.",
        "// Non si modifica a mano. Si cambia catalogo_eventi.json, si rilancia lo script e si pubblica.",
        "// Ci sono solo i numeri pubblici (km, dislivello, giorni, partenze, fine della finestra) e i",
        "// campi interni del modello delle ore (1.2), che non si mostrano mai. Il dislivello di lavoro",
        "// serve solo al conto, quando l'ufficiale manca. Niente tracce, note o fonti.",
        "",
        "function congela(oggetto) {",
        "  for (const valore of Object.values(oggetto)) {",
        '    if (valore !== null && typeof valore === "object") congela(valore);',
        "  }",
        "  return Object.freeze(oggetto);",
        "}",
        "",
        "export const CATALOGO = congela([",
    ]
    for p in percorsi:
        righe.append("  {")
        for chiave, v in per_app(p).items():
            righe.append(f"    {chiave}: {valore(v)},")
        righe.append("  },")
    righe += [
        "]);",
        "",
        "// Un percorso dal suo id, oppure null.",
        "export function trovaPercorso(id) {",
        "  return CATALOGO.find((p) => p.id === id) || null;",
        "}",
        "",
    ]
    USCITA.write_text("\n".join(righe), encoding="utf-8", newline="\n")


def main():
    sorgente = Path(sys.argv[1]) if len(sys.argv) > 1 else PREDEFINITO
    percorsi = json.loads(sorgente.read_text(encoding="utf-8"))
    errori = controlla(percorsi)
    if errori:
        print("Il catalogo ha degli errori, js/catalogo.js non cambia.")
        for e in errori:
            print("  " + e)
        sys.exit(1)
    scrivi(percorsi)
    print(f"js/catalogo.js, {len(percorsi)} percorsi")


if __name__ == "__main__":
    main()
