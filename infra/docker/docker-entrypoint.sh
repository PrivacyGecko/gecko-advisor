#!/bin/sh
set -e

# Render nginx config from template with env vars (CSP and BACKEND_PROXY_URL)
# Debug: print variables to verify they're being passed correctly
echo "Environment variables received:"
env | grep -E '^CSP=' || echo "CSP not set, will use default"
env | grep -E '^BACKEND_PROXY_URL=' || echo "BACKEND_PROXY_URL not set"

# Use envsubst to substitute CSP and BACKEND_PROXY_URL variables in nginx template
envsubst '${CSP} ${BACKEND_PROXY_URL}' < /nginx.tmpl.conf > /etc/nginx/nginx.conf

# Debug: verify variables were applied correctly
echo "Generated nginx config:"
grep "Content-Security-Policy" /etc/nginx/nginx.conf || echo "CSP header not found in config"
grep "proxy_pass" /etc/nginx/nginx.conf || echo "proxy_pass not found in config"

exec nginx -g 'daemon off;'

