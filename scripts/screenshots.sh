#!/usr/bin/env bash
#
# Regenera las capturas de la guía de usuario.
#
# Existe porque cada rediseño deja las 21 imágenes desactualizadas, y rehacerlas
# a mano es media tarde. Con esto es un comando.
#
#   VITE_CARTO_KEY=... npm run dev    # en otra terminal
#   ./scripts/screenshots.sh          # usa http://localhost:5173
#   ./scripts/screenshots.sh <url>    # o la que le pases
#
# IMPORTANTE: levanta el servidor con la llave de CARTO puesta. Sin ella los
# mapas salen con el respaldo de Esri, y las capturas quedarían con un mapa
# distinto al que ve la gente.
#
# Requiere agent-browser: npm i -g agent-browser
#
# Carga los datos de demostración, así las capturas salen con contenido y no
# con pantallas vacías.

set -uo pipefail

BASE="${1:-http://localhost:5173}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/docs/screenshots"
SESSION="docs-shots"

if ! command -v agent-browser >/dev/null 2>&1; then
  echo "Falta agent-browser. Instálalo con: npm i -g agent-browser" >&2
  exit 1
fi

ab() { agent-browser --session "$SESSION" "$@" >/dev/null 2>&1; }

shot() { # shot <nombre> <ruta> [espera_ms]
  local name="$1" path="$2" wait_ms="${3:-3500}"
  ab open "$BASE/$path"
  ab wait "$wait_ms"
  ab screenshot --screenshot-dir "$OUT"
  local newest
  newest="$(ls -t "$OUT"/screenshot-*.png 2>/dev/null | head -1)"
  if [ -n "$newest" ]; then
    mv "$newest" "$OUT/$name.png"
    echo "  $name.png"
  else
    echo "  !! no se pudo capturar $name" >&2
  fi
}

echo "Capturando desde $BASE"
echo "Salida: $OUT"

# Sesión limpia: un daemon de una corrida anterior deja las capturas colgadas.
agent-browser close --all >/dev/null 2>&1 || true
sleep 1

# Modo sin conexión con los datos de demostración
ab open "$BASE"
ab wait 3000
ab find text "Usar sin conexión" click
ab wait 2000
ab find text "Cargar Demo" click
ab wait 3000

shot tut-welcome-mode      "#/welcome"
shot tut-main-list         "#/"                      5000
shot main-territories-dark "#/"                      5000
shot tut-territory-detail  "#/territories/1"         5000
shot tut-landmarks-map     "#/territories/1"         5000
shot tut-notes             "#/territories/2"         5000
shot tut-manzanas          "#/territories/1"         5000
shot tut-assignment        "#/territories/2"         4000
shot tut-draw-polygon      "#/territories/1/edit"    5000
shot tut-qr-toggle         "#/territories/1/edit"    5000
shot tut-card-view         "#/territories/1/card"    5000
shot tut-card-qr           "#/territories/1/card"    5000
shot tut-print-all         "#/print"                 7000
shot tut-settings          "#/settings"              4000

agent-browser close --all >/dev/null 2>&1 || true

echo
echo "Listo. Revisa las imágenes antes de commitear:"
echo "  $OUT"
echo
echo "Las que necesitan sesión en la nube (panel de administración, inicio de"
echo "sesión, compartir, vista pública) no se capturan aquí: hay que hacerlas"
echo "a mano con la sesión abierta."
