#!/bin/sh
set -e

# Render nginx config from template with env vars (CSP)
# Debug: print CSP variable to verify it's being passed correctly
echo "CSP variable received:"
env | grep -E '^CSP=' || echo "CSP not set, will use default"

# Use envsubst to substitute CSP variable in nginx template
envsubst '${CSP}' < /nginx.tmpl.conf > /etc/nginx/nginx.conf

# Debug: verify CSP was applied correctly
echo "Generated nginx config CSP line:"
grep "Content-Security-Policy" /etc/nginx/nginx.conf || echo "CSP header not found in config"

exec nginx -g 'daemon off;'

