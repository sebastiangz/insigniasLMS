#!/bin/bash
# find-available-port.sh — Encuentra un puerto disponible para Node.js
# Uso: bash find-available-port.sh [puerto_inicial]

START_PORT=${1:-3100}
MAX_PORT=3200

echo "Buscando puerto disponible desde $START_PORT hasta $MAX_PORT..."

for port in $(seq $START_PORT $MAX_PORT); do
    if ! ss -tulpn 2>/dev/null | grep -q ":$port "; then
        echo "Puerto disponible: $port"
        echo ""
        echo "Edita tu .env:"
        echo "  PORT=$port"
        exit 0
    fi
done

echo "No se encontró puerto disponible en rango $START_PORT-$MAX_PORT"
exit 1
