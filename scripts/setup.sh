#!/usr/bin/env bash

set -e

export DEBIAN_FRONTEND=noninteractive

echo "[setup] Updating apt..."
apt-get update -qq

echo "[setup] Installing system packages..."
apt-get install -y nginx certbot python3-certbot-nginx git

echo "[setup] Ensuring user git and directory..."
id git 2>/dev/null || useradd -m -s /bin/bash git
mkdir -p /home/git/ubintrack
chown -R git:git /home/git
chmod 755 /home/git /home/git/ubintrack

echo "[setup] Allowing nginx to read letsencrypt challenges..."
mkdir -p /var/www/letsencrypt
chown -R www-data:www-data /var/www/letsencrypt

echo "[setup] Tip: en servidores multi-proyecto (webapp), instala también"
echo "       frontend/scripts/nginx/000-default-unconfigured.conf como catch-all"
echo "       para que subdominios sin vhost no caigan en otro proyecto."

cat <<'EOF'

[setup] Done. Siguientes pasos (ejecutar desde tu Mac / máquina de desarrollo).

Requisito: en ~/.ssh/config debe existir el host «webapp» apuntando al servidor.
Ajusta LOCAL_FRONTEND si tu repo no está en la ruta por defecto.

──────────────────────────────────────────────────────────────────────────────
0) Variables (opcional, para pegar bloques siguientes)
──────────────────────────────────────────────────────────────────────────────
LOCAL_FRONTEND="/Users/jcgiler/BlackCubeTech/Ubintrack/frontend"
REMOTE_HOST="webapp"
REMOTE_PATH="/home/git/ubintrack"
NGINX_SITE="rbcold.ubintrack.com"

──────────────────────────────────────────────────────────────────────────────
0b) Catch-all nginx en webapp (una sola vez por servidor multi-proyecto)
──────────────────────────────────────────────────────────────────────────────
scp "$LOCAL_FRONTEND/scripts/nginx/000-default-unconfigured.conf" \
  "${REMOTE_HOST}:/tmp/000-default-unconfigured.conf"

ssh "${REMOTE_HOST}" "sudo cp /tmp/000-default-unconfigured.conf /etc/nginx/sites-available/000-default-unconfigured.conf && \
  sudo ln -sf /etc/nginx/sites-available/000-default-unconfigured.conf /etc/nginx/sites-enabled/000-default-unconfigured.conf && \
  sudo nginx -t && sudo systemctl reload nginx"

──────────────────────────────────────────────────────────────────────────────
1) Primer deploy del bundle compilado (standalone + Node)
──────────────────────────────────────────────────────────────────────────────
cd "$LOCAL_FRONTEND" && ./scripts/deploy.sh

──────────────────────────────────────────────────────────────────────────────
2) Nginx + systemd (una sola vez; DNS de rbcold.ubintrack.com → servidor)
──────────────────────────────────────────────────────────────────────────────
scp "$LOCAL_FRONTEND/scripts/nginx/rbcold.ubintrack.com.conf" \
  "${REMOTE_HOST}:/tmp/${NGINX_SITE}.conf"

ssh "${REMOTE_HOST}" "sudo cp /tmp/${NGINX_SITE}.conf /etc/nginx/sites-available/${NGINX_SITE}.conf && \
  sudo ln -sf /etc/nginx/sites-available/${NGINX_SITE}.conf /etc/nginx/sites-enabled/${NGINX_SITE}.conf && \
  sudo nginx -t && sudo systemctl reload nginx"

scp "$LOCAL_FRONTEND/scripts/systemd/ubintrack-frontend.service" \
  "${REMOTE_HOST}:/tmp/ubintrack-frontend.service"

ssh "${REMOTE_HOST}" "sudo cp /tmp/ubintrack-frontend.service /etc/systemd/system/ubintrack-frontend.service && \
  sudo systemctl daemon-reload && \
  sudo systemctl enable --now ubintrack-frontend"

# TLS (solo cuando el vhost responde en HTTP y el DNS está propagado)
ssh "${REMOTE_HOST}" "sudo certbot --nginx -d ${NGINX_SITE}"

──────────────────────────────────────────────────────────────────────────────
Deploys siguientes (solo artefacto compilado; ver scripts/deploy.sh)
──────────────────────────────────────────────────────────────────────────────
cd "$LOCAL_FRONTEND" && ./scripts/deploy.sh

Nota: deploy.sh solo envía el bundle Next.js standalone y hace restart del servicio.
      Si cambias ubintrack-frontend.service o el vhost nginx, vuelve a copiarlos aquí
      y ejecuta: sudo systemctl daemon-reload && sudo systemctl restart ubintrack-frontend

EOF
