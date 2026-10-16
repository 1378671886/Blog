#!/bin/bash
# certbot renew 前执行：停 nginx 释放 80 端口（standalone 验证需要）
docker stop blog-nginx || true
