#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# find-available-port.sh — Encuentra un puerto disponible para Node.js
# Uso: bash find-available-port.sh [puerto_inicial]
# ─────────────────────────────────────────────────────────────────────────────

set -e

START_PORT=${1:-3100}
MAX_PORT=3200

echo " Buscando puerto disponible desde $START_PORT hasta $MAX_PORT..."
echo ""

for port in $(seq $START_PORT $MAX_PORT); do
    # Verificar si el puerto está en uso
    if ! ss -tulpn 2>/dev/null | grep -q ":$port "; then
        # Verificar que no esté reservado en /etc/services
        if ! grep -q "[[:space:]]$port/tcp" /etc/services 2>/dev/null; then
            echo "OK Puerto $port está disponible"
            echo ""
            echo "Para usar este puerto, edita tu archivo .env:"
            echo "   PORT=$port"
            exit 0
        fi
    fi
done

echo "XXX No se encontró ningún puerto disponible en el rango $START_PORT-$MAX_PORT"
echo ""
echo "Puertos actualmente en uso:"
ss -tulpn | grep "LISTEN" | grep -E ":(31[0-9]{2}|32[0-9]{2})" || echo "  (ninguno en rango 3100-3200)"
exit 1
