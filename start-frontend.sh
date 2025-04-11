#!/bin/bash

# Frontend Directory
FRONTEND_DIR="frontend"

# SSL cert and key files for frontend (adjust if needed)
CERT_PATH=./frontend/localhost-cert.pem
KEY_PATH=./frontend/localhost-key.pem

# Starting HTTPS proxy for frontend (3001 → 3000)
echo "🔁 Starting HTTPS proxy for frontend (3001 → 3000)..."
local-ssl-proxy --source 3001 --target 3000 --cert $CERT_PATH --key $KEY_PATH &

sleep 5

# Start React frontend
echo "🌐 Starting React frontend on port 3000..."
cd $FRONTEND_DIR
npm start


