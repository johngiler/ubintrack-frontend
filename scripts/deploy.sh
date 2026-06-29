#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE_HOST="${PUBLIVALLA_FRONTEND_SSH:-webapp}"
REMOTE_PATH="/home/git/ubintrack"
STAGE_DIR="$FRONTEND_DIR/.next/ubintrack-deploy-bundle"

cd "$FRONTEND_DIR"

# Next carga .env.local también en `next build`; suele apuntar a 127.0.0.1:8000 y tapa .env.production.
# Las variables ya definidas en el shell tienen prioridad: forzamos el API público antes del build.
PROD_ENV="$FRONTEND_DIR/.env.production"
if [[ -f "$PROD_ENV" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROD_ENV"
  set +a
fi
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.ubintrack.com}"
echo "[deploy] Build con NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL (no uses solo .env.local para prod)"

echo "[deploy] Building (production, standalone)..."
NODE_ENV=production npm run build

STANDALONE="$FRONTEND_DIR/.next/standalone"
if [[ ! -f "$STANDALONE/server.js" ]]; then
  echo "[deploy] ERROR: no existe $STANDALONE/server.js (revisa next.config output: standalone)" >&2
  exit 1
fi

echo "[deploy] Preparando bundle (standalone + .next/static + public + unit systemd)..."
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/ops"
cp -a "$STANDALONE"/. "$STAGE_DIR/"
mkdir -p "$STAGE_DIR/.next"
cp -a "$FRONTEND_DIR/.next/static" "$STAGE_DIR/.next/static"
cp -a "$FRONTEND_DIR/public" "$STAGE_DIR/public"
cp "$SCRIPT_DIR/systemd/ubintrack-frontend.service" "$STAGE_DIR/ops/ubintrack-frontend.service"

echo "[deploy] Creando directorio remoto..."
ssh "$REMOTE_HOST" "mkdir -p $REMOTE_PATH && chown -R git:git /home/git/ubintrack 2>/dev/null || true"

echo "[deploy] rsync bundle -> $REMOTE_HOST:$REMOTE_PATH"
rsync -avz --delete -e ssh "$STAGE_DIR/" "$REMOTE_HOST:$REMOTE_PATH/"

echo "[deploy] Permisos para lectura (git + recorrido nginx si aplica)..."
ssh "$REMOTE_HOST" "chown -R git:git $REMOTE_PATH && chmod 755 /home/git /home/git/ubintrack 2>/dev/null || true"

echo "[deploy] Reiniciando servicio Node..."
ssh "$REMOTE_HOST" "set -e
  UNIT=/etc/systemd/system/ubintrack-frontend.service
  BUNDLE_UNIT=$REMOTE_PATH/ops/ubintrack-frontend.service
  if [[ ! -f \"\$BUNDLE_UNIT\" ]]; then
    echo '[deploy] ERROR: falta ops/ubintrack-frontend.service en el bundle' >&2
    exit 1
  fi
  sudo rm -f \"\$UNIT\"
  sudo cp \"\$BUNDLE_UNIT\" \"\$UNIT\"
  sudo systemctl daemon-reload
  sudo systemctl enable ubintrack-frontend
  sudo systemctl restart ubintrack-frontend
  sudo systemctl is-active --quiet ubintrack-frontend
  echo '[deploy] ubintrack-frontend activo'
"

echo "[deploy] Listo."
