#!/bin/bash

# Exit on error
set -e

# Backend Directory
BACKEND_DIR="./backend"

# SSL paths BE(update if different)
CERT_PATHBE=../frontend/localhost-cert.pem
KEY_PATHBE=../frontend/localhost-key.pem

# SSL paths FE (update if different)
CERT_PATH=./frontend/localhost-cert.pem
KEY_PATH=./frontend/localhost-key.pem


# Starting HTTPS proxy for backend (5002 → 5000)
echo "🔁 Starting HTTPS proxy for backend (5002 → 5000)..."
local-ssl-proxy --source 5002 --target 5000 --cert $CERT_PATH --key $KEY_PATH &

# Start Flask backend
echo "🖥 Starting Flask backend on port 5000..."
cd $BACKEND_DIR
FLASK_APP=app.py flask run --host=0.0.0.0 --port=5000