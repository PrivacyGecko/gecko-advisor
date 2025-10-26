#!/bin/bash

# SPDX-FileCopyrightText: 2025 Privacy Gecko
# SPDX-License-Identifier: MIT

#######################################
# Security Audit Script for Gecko Advisor
#
# This script searches the codebase for potential security issues
# before open sourcing the repository.
#
# Usage:
#   ./scripts/security-audit.sh
#   ./scripts/security-audit.sh --output report.txt
#
# Exit codes:
#   0 - No issues found
#   1 - Potential issues found (review required)
#   2 - Critical issues found (must fix before release)
#######################################

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CRITICAL_COUNT=0
WARNING_COUNT=0
INFO_COUNT=0

# Output file (optional)
OUTPUT_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Logging functions
log_critical() {
  echo -e "${RED}[CRITICAL]${NC} $1" | tee -a "$OUTPUT_FILE"
  ((CRITICAL_COUNT++))
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$OUTPUT_FILE"
  ((WARNING_COUNT++))
}

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$OUTPUT_FILE"
  ((INFO_COUNT++))
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1" | tee -a "$OUTPUT_FILE"
}

section() {
  echo "" | tee -a "$OUTPUT_FILE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$OUTPUT_FILE"
  echo -e "${BLUE}$1${NC}" | tee -a "$OUTPUT_FILE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$OUTPUT_FILE"
}

# Initialize output file
if [[ -n "$OUTPUT_FILE" ]]; then
  echo "Security Audit Report - $(date)" > "$OUTPUT_FILE"
  echo "Repository: Gecko Advisor" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
fi

echo "🔒 Starting Security Audit for Open Source Release..."
echo ""

#######################################
# 1. HARDCODED SECRETS
#######################################
section "1. Searching for Hardcoded Secrets"

echo "Searching for API keys, passwords, tokens..." | tee -a "$OUTPUT_FILE"

SECRETS=$(git grep -niE "password|secret|api[_-]?key|token|credential" -- \
  '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.yml' '*.yaml' '*.env*' \
  ':!node_modules' ':!.env.example' ':!*.md' ':!pnpm-lock.yaml' ':!LICENSE*' || true)

if [[ -n "$SECRETS" ]]; then
  echo "$SECRETS" | while IFS= read -r line; do
    # Filter out common false positives
    if echo "$line" | grep -qiE "\.env\.example|description|comment|placeholder|example|your-.*-here"; then
      log_info "Potential secret (likely safe): $line"
    else
      log_critical "Potential secret found: $line"
    fi
  done
else
  log_success "No obvious secrets found in code"
fi

#######################################
# 2. IP ADDRESSES
#######################################
section "2. Searching for IP Addresses"

echo "Searching for hardcoded IP addresses..." | tee -a "$OUTPUT_FILE"

IP_ADDRESSES=$(git grep -nE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' -- \
  '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.yml' '*.yaml' '*.md' \
  ':!node_modules' ':!pnpm-lock.yaml' || true)

if [[ -n "$IP_ADDRESSES" ]]; then
  echo "$IP_ADDRESSES" | while IFS= read -r line; do
    # Filter out common safe IPs
    if echo "$line" | grep -qE "127\.0\.0\.1|0\.0\.0\.0|localhost|example|255\.255\."; then
      log_info "Safe IP address: $line"
    else
      log_warning "Hardcoded IP address: $line"
    fi
  done
else
  log_success "No hardcoded IP addresses found"
fi

#######################################
# 3. PRODUCTION DOMAINS
#######################################
section "3. Searching for Production/Stage Domains"

echo "Searching for geckoadvisor.com domains..." | tee -a "$OUTPUT_FILE"

DOMAINS=$(git grep -nE '(stage|prod)\.geckoadvisor\.com|geckoadvisor\.com' -- \
  '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.yml' '*.yaml' \
  ':!node_modules' ':!*.md' ':!CLAUDE.md' || true)

if [[ -n "$DOMAINS" ]]; then
  echo "$DOMAINS" | while IFS= read -r line; do
    log_warning "Production/stage domain found: $line"
  done
else
  log_success "No production/stage domains found in code"
fi

#######################################
# 4. DATABASE CONNECTION STRINGS
#######################################
section "4. Searching for Database Connection Strings"

echo "Searching for database URLs..." | tee -a "$OUTPUT_FILE"

DB_URLS=$(git grep -niE 'postgres://|postgresql://|redis://|mongodb://' -- \
  '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.yml' '*.yaml' \
  ':!node_modules' ':!.env.example' ':!CLAUDE.md' ':!*.md' || true)

if [[ -n "$DB_URLS" ]]; then
  echo "$DB_URLS" | while IFS= read -r line; do
    if echo "$line" | grep -qE "\.env\.example|localhost|example\.com|postgres:postgres"; then
      log_info "Safe database URL: $line"
    else
      log_critical "Hardcoded database URL: $line"
    fi
  done
else
  log_success "No hardcoded database URLs found"
fi

#######################################
# 5. ENVIRONMENT FILES
#######################################
section "5. Checking for Uncommitted Environment Files"

echo "Checking for .env files in git..." | tee -a "$OUTPUT_FILE"

ENV_FILES=$(git ls-files '*.env' '*.env.*' ':!.env.example' || true)

if [[ -n "$ENV_FILES" ]]; then
  echo "$ENV_FILES" | while IFS= read -r file; do
    log_critical "Environment file in git: $file"
  done
else
  log_success "No environment files committed (except .env.example)"
fi

#######################################
# 6. AWS/CLOUD CREDENTIALS
#######################################
section "6. Searching for AWS/Cloud Credentials"

echo "Searching for cloud provider credentials..." | tee -a "$OUTPUT_FILE"

CLOUD_CREDS=$(git grep -niE 'AKIA[0-9A-Z]{16}|aws_secret|cloud.*key|s3.*secret|access.*key.*id' -- \
  '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.yml' '*.yaml' \
  ':!node_modules' ':!.env.example' ':!*.md' || true)

if [[ -n "$CLOUD_CREDS" ]]; then
  echo "$CLOUD_CREDS" | while IFS= read -r line; do
    if echo "$line" | grep -qiE "\.env\.example|placeholder|example|your-.*-here|OBJECT_STORAGE"; then
      log_info "Cloud credential reference (likely safe): $line"
    else
      log_warning "Potential cloud credential: $line"
    fi
  done
else
  log_success "No cloud credentials found"
fi

#######################################
# 7. PRIVATE KEYS
#######################################
section "7. Searching for Private Keys"

echo "Searching for private keys..." | tee -a "$OUTPUT_FILE"

PRIVATE_KEYS=$(git grep -niE 'BEGIN.*PRIVATE KEY|BEGIN RSA PRIVATE KEY|BEGIN EC PRIVATE KEY' -- \
  ':!node_modules' || true)

if [[ -n "$PRIVATE_KEYS" ]]; then
  echo "$PRIVATE_KEYS" | while IFS= read -r line; do
    log_critical "Private key found: $line"
  done
else
  log_success "No private keys found"
fi

#######################################
# 8. JWT SECRETS
#######################################
section "8. Searching for JWT Secrets"

echo "Searching for JWT secrets..." | tee -a "$OUTPUT_FILE"

JWT_SECRETS=$(git grep -niE 'jwt.*secret|secret.*jwt' -- \
  '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.yml' '*.yaml' \
  ':!node_modules' ':!.env.example' ':!*.md' || true)

if [[ -n "$JWT_SECRETS" ]]; then
  echo "$JWT_SECRETS" | while IFS= read -r line; do
    if echo "$line" | grep -qE "\.env\.example|placeholder|example"; then
      log_info "JWT secret reference (likely safe): $line"
    else
      log_warning "JWT secret found: $line"
    fi
  done
else
  log_success "No JWT secrets found in code"
fi

#######################################
# 9. INTERNAL COMMENTS
#######################################
section "9. Searching for TODO/FIXME/HACK Comments"

echo "Searching for TODO/FIXME/HACK comments..." | tee -a "$OUTPUT_FILE"

COMMENTS=$(git grep -nE 'TODO|FIXME|HACK|XXX|NOTE:.*secret|NOTE:.*credential' -- \
  '*.ts' '*.tsx' '*.js' '*.jsx' \
  ':!node_modules' || true)

COMMENT_COUNT=$(echo "$COMMENTS" | wc -l | tr -d ' ')

if [[ -n "$COMMENTS" ]] && [[ "$COMMENT_COUNT" -gt 0 ]]; then
  log_info "Found $COMMENT_COUNT TODO/FIXME/HACK comments (review recommended)"
  if [[ "$COMMENT_COUNT" -lt 20 ]]; then
    echo "$COMMENTS" | tee -a "$OUTPUT_FILE"
  else
    echo "Too many to display. Run: git grep -nE 'TODO|FIXME|HACK' to review" | tee -a "$OUTPUT_FILE"
  fi
else
  log_success "No concerning comments found"
fi

#######################################
# 10. GIT HISTORY CHECK
#######################################
section "10. Git History Analysis"

echo "Checking recent commits for sensitive file changes..." | tee -a "$OUTPUT_FILE"

SENSITIVE_COMMITS=$(git log --all --full-history --pretty=format:"%H %s" -- \
  '*.env' '.env.*' '*secret*' '*credential*' '*password*' \
  ':!.env.example' ':!*.md' | head -10 || true)

if [[ -n "$SENSITIVE_COMMITS" ]]; then
  log_warning "Found commits touching sensitive files:"
  echo "$SENSITIVE_COMMITS" | tee -a "$OUTPUT_FILE"
  echo "" | tee -a "$OUTPUT_FILE"
  log_warning "Review these commits carefully. You may need to rewrite git history."
  log_warning "See docs/GIT_HISTORY_CLEANING.md for guidance."
else
  log_success "No obvious sensitive files in recent git history"
fi

#######################################
# SUMMARY
#######################################
section "SUMMARY"

echo "" | tee -a "$OUTPUT_FILE"
echo "Audit completed: $(date)" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"
echo -e "${RED}CRITICAL issues: $CRITICAL_COUNT${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${YELLOW}WARNING issues: $WARNING_COUNT${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}INFO items: $INFO_COUNT${NC}" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

if [[ $CRITICAL_COUNT -gt 0 ]]; then
  echo -e "${RED}❌ CRITICAL ISSUES FOUND${NC}" | tee -a "$OUTPUT_FILE"
  echo "You MUST fix all critical issues before open sourcing." | tee -a "$OUTPUT_FILE"
  echo "" | tee -a "$OUTPUT_FILE"
  exit 2
elif [[ $WARNING_COUNT -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  WARNINGS FOUND${NC}" | tee -a "$OUTPUT_FILE"
  echo "Review all warnings before proceeding with open source release." | tee -a "$OUTPUT_FILE"
  echo "" | tee -a "$OUTPUT_FILE"
  exit 1
else
  echo -e "${GREEN}✅ No critical issues found${NC}" | tee -a "$OUTPUT_FILE"
  echo "Codebase appears ready for open source release." | tee -a "$OUTPUT_FILE"
  echo "" | tee -a "$OUTPUT_FILE"
  exit 0
fi
