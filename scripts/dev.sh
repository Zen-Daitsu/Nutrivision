#!/usr/bin/env bash
# Local development: API on :8000, PWA on :5173 over HTTPS.
# getUserMedia only runs in a secure context — localhost counts, a LAN IP does not.
# To test on a phone, tunnel it: `npx --yes localtunnel --port 5173`.
set -euo pipefail

(cd backend && pixi run build-kernel) || echo "Mojo kernel unavailable, backend will use NumPy postprocess"

(cd backend && uvicorn app.main:app --reload --port 8000) &
API_PID=$!
trap 'kill $API_PID' EXIT

cd frontend && python3 -m http.server 5173
