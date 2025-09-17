#!/bin/bash

# Script pour démarrer le serveur de développement en HTTPS

echo "🔐 Starting Team Dash Manager in HTTPS mode..."

# Vérifier si les certificats existent
if [ ! -f "./certs/cert.pem" ] || [ ! -f "./certs/key.pem" ]; then
    echo "📜 Generating self-signed SSL certificate..."
    mkdir -p certs
    openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes \
        -subj "/C=FR/ST=France/L=Paris/O=TeamDash/CN=localhost"
    echo "✅ SSL certificate generated"
fi

# Tuer l'ancien processus s'il existe
echo "🛑 Stopping any existing dev server..."
pkill -f "vite" 2>/dev/null
sleep 2

# Démarrer le serveur
echo "🚀 Starting HTTPS dev server on port 8081..."
PORT=8081 npm run dev