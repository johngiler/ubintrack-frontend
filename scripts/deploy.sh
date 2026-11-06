#!/usr/bin/env bash
#
# Deploy Ubintrack frontend to webapp (/home/git/ubintrack).
# Requires: npm, rsync, SSH Host webapp. Next.js output: standalone.
#
# Usage:
#   ./scripts/deploy.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE_HOST="${UBINTRACK_FRONTEND_SSH:-webapp}"
REMOTE_PATH="/home/git/ubintrack"
STAGE_DIR="$FRONTEND_DIR/.next/ubintrack-deploy-bundle"
UNIT_SRC="$SCRIPT_DIR/systemd/ubintrack-frontend.service"

cd "$FRONTEND_DIR"

# Next carga .env.local también en `next build`; suele apuntar a 127.0.0.1:8001 y tapa .env.production.
# Las variables ya definidas en el shell tienen prioridad: forzamos el API público antes del build.
PROD_ENV="$FRONTEND_DIR/.env.production"
if [[ -f "$PROD_ENV" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$PROD_ENV"
  set +a
fi
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://api.ubintrack.com}"
# .env.local suele traer WS en 127.0.0.1:9001; en prod hay que forzar el API (nginx /ws/).
# Si no, el browser pide "Access other apps…" (Local Network Access) a cada rato.
export NEXT_PUBLIC_WS_URL="${NEXT_PUBLIC_WS_URL:-https://api.ubintrack.com}"
BUILD_ID="$(git -C "$FRONTEND_DIR" rev-parse --short HEAD 2>/dev/null || true)"
if [[ -z "$BUILD_ID" ]]; then
  BUILD_ID="$(date -u +%Y%m%d%H%M%S)"
fi
export NEXT_PUBLIC_APP_BUILD_ID="$BUILD_ID"
echo "[deploy] Build con NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL BUILD_ID=$BUILD_ID"

echo "[deploy] Building (production, standalone)..."
NODE_ENV=production npm run build

STANDALONE="$FRONTEND_DIR/.next/standalone"
if [[ ! -f "$STANDALONE/server.js" ]]; then
  echo "[deploy] ERROR: no existe $STANDALONE/server.js (revisa next.config output: standalone)" >&2
  exit 1
fi

if [[ ! -f "$UNIT_SRC" ]]; then
  echo "[deploy] ERROR: falta $UNIT_SRC" >&2
  exit 1
fi

echo "[deploy] Preparando bundle (standalone + .next/static + public + unit systemd)..."
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/ops" "$STAGE_DIR/.next"
cp -a "$STANDALONE"/. "$STAGE_DIR/"
cp -a "$FRONTEND_DIR/.next/static" "$STAGE_DIR/.next/static"
if [[ -d "$FRONTEND_DIR/public" ]]; then
  cp -a "$FRONTEND_DIR/public" "$STAGE_DIR/public"
fi
cp "$UNIT_SRC" "$STAGE_DIR/ops/ubintrack-frontend.service"

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

if [[ -n "${FRONTEND_BUILD_PUBLISH_TOKEN:-}" ]]; then
  echo "[deploy] Avisando la versión nueva a las sesiones abiertas..."
  curl -fsS -X POST "${NEXT_PUBLIC_API_URL}/api/notifications/frontend-build/" \
    -H "Content-Type: application/json" \
    -H "X-Ubintrack-Build-Token: ${FRONTEND_BUILD_PUBLISH_TOKEN}" \
    -d "{\"build_id\": \"${BUILD_ID}\"}" \
    >/dev/null
  echo "[deploy] Versión publicada: $BUILD_ID"
else
  echo "[deploy] WARN: FRONTEND_BUILD_PUBLISH_TOKEN vacío — no se avisa la actualización."
fi

echo "[deploy] Listo."
