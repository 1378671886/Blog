#!/bin/bash
# certbot renew 后执行：启动 nginx
docker start blog-nginx || true
