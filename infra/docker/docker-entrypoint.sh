#!/bin/sh
set -e

# Render nginx config from template with env vars (CSP)
env | grep -E '^(CSP)=.*' || true
envsubst '${CSP}' < /nginx.tmpl.conf > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'

