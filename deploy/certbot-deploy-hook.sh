#!/bin/bash
# 证书续期成功后执行：让 nginx 和 coturn 加载新证书
docker exec blog-nginx nginx -s reload || true
docker restart blog-coturn || true
