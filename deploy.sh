#!/bin/bash
set -e

# 一键部署：安装 certbot → 停旧 systemd coturn → 签发证书 → 装续期钩子 → 启动服务
# 用法：sudo ./deploy.sh

cd "$(dirname "$0")"

DOMAIN="liuzirui.top"
# 如需 Let's Encrypt 到期提醒邮件，把下面改成 --email you@example.com
EMAIL_ARG="--register-unsafely-without-email"

# 1. 安装 certbot
if ! command -v certbot >/dev/null 2>&1; then
  apt-get update
  apt-get install -y certbot
fi

# 2. 停掉旧的 systemd coturn（迁移到 docker）
if systemctl is-active --quiet coturn; then
  systemctl stop coturn
  systemctl disable coturn
fi

# 3. 签发证书（standalone，需 80 端口空闲）
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  docker compose stop nginx 2>/dev/null || true
  certbot certonly --standalone \
    -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --non-interactive --agree-tos ${EMAIL_ARG}
fi

# 4. 安装续期钩子
mkdir -p /etc/letsencrypt/renewal-hooks/pre /etc/letsencrypt/renewal-hooks/deploy /etc/letsencrypt/renewal-hooks/post
cp deploy/certbot-pre-hook.sh    /etc/letsencrypt/renewal-hooks/pre/
cp deploy/certbot-deploy-hook.sh /etc/letsencrypt/renewal-hooks/deploy/
cp deploy/certbot-post-hook.sh   /etc/letsencrypt/renewal-hooks/post/
chmod +x /etc/letsencrypt/renewal-hooks/pre/*
chmod +x /etc/letsencrypt/renewal-hooks/deploy/*
chmod +x /etc/letsencrypt/renewal-hooks/post/*

# 5. 启动全部服务
docker compose up -d --build

echo "部署完成"
