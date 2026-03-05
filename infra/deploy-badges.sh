#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════
# Deploy Badge Assets to Azure App Service
# ═══════════════════════════════════════════════════════════════════════
#
# PURPOSE:
# Seeds all badge SVG assets from infra/assets/badges/ into the deployed
# API by executing the 3-step upload flow for each BadgeType:
#   1. Request a temporary SAS upload URL
#   2. Upload the SVG directly to Azure Blob Storage
#   3. Confirm the upload to persist the DB record
#
# USAGE:
#   ENVIRONMENT=staging AZURE_RESOURCE_GROUP=my-rg bash infra/deploy-badges.sh
#   bash infra/deploy-badges.sh --local
#
# FLAGS:
#   --local               Use http://localhost:8080/api (skips Azure stack lookup)
#
# ENV VARS:
#   ENVIRONMENT           Required (unless --local). lowercase: production | staging | development
#   AZURE_RESOURCE_GROUP  Required (unless --local). Azure resource group name
#   API_URL               Optional. Override API base URL (auto-resolved from stack)
#
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BADGES_DIR="$SCRIPT_DIR/assets/badges"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
  echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# ── Parse flags ──────────────────────────────────────────────────────
LOCAL=false
for arg in "$@"; do
  case "$arg" in
    --local) LOCAL=true ;;
    *) log "${RED}Error: Unknown argument '$arg'.${NC}"; exit 1 ;;
  esac
done

# ── Dependency checks ────────────────────────────────────────────────
REQUIRED_CMDS=(curl jq)
if [ "$LOCAL" = "false" ] && [ -z "${API_URL:-}" ]; then
  REQUIRED_CMDS+=(az)
fi

for cmd in "${REQUIRED_CMDS[@]}"; do
  if ! command -v "$cmd" &>/dev/null; then
    log "${RED}Error: '$cmd' is required but not installed.${NC}"
    exit 1
  fi
done

# ── Resolve API URL ──────────────────────────────────────────────────
if [ "$LOCAL" = "true" ]; then
  API_URL="http://localhost:8080/api"
  log "${GREEN}Local mode: using API_URL=${API_URL}${NC}"
elif [ -n "${API_URL:-}" ]; then
  log "${GREEN}Using provided API_URL=${API_URL}${NC}"
else
  if [ -z "${ENVIRONMENT:-}" ]; then
    log "${RED}Error: ENVIRONMENT is required (production | staging | development).${NC}"
    exit 1
  fi

  if [ -z "${AZURE_RESOURCE_GROUP:-}" ]; then
    log "${RED}Error: AZURE_RESOURCE_GROUP is required.${NC}"
    exit 1
  fi

  STACK_NAME="undp-huella-latam-stack-$ENVIRONMENT"
  log "${YELLOW}Resolving API URL from stack '$STACK_NAME'...${NC}"

  RAW_URL=$(az stack group show \
    --name "$STACK_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query "outputs.api.value.appService.url" \
    --output tsv)

  if [ -z "$RAW_URL" ]; then
    log "${RED}Error: Could not resolve API URL from stack outputs.${NC}"
    exit 1
  fi

  API_URL="${RAW_URL%/}/api"
  log "${GREEN}Resolved API_URL=${API_URL}${NC}"
fi

echo ""

# ── Badge mappings ───────────────────────────────────────────────────
# Format: "filename:BADGE_TYPE"
BADGE_MAPPINGS=(
  "calculation-badge.svg:CARBON_INVENTORY_CALCULATION"
  "verification-badge.svg:CARBON_INVENTORY_VERIFICATION"
  "verification-badge.svg:ORGANIZATION_ACCREDITATION"
  "reduction-badge.svg:REDUCTION_PLAN_VERIFICATION"
  "neutralization-badge.svg:NEUTRALIZATION_PLAN_VERIFICATION"
)

# ── Upload function ──────────────────────────────────────────────────
upload_badge() {
  local file="$1"
  local badge_type="$2"
  local file_path="$BADGES_DIR/$file"

  if [ ! -f "$file_path" ]; then
    log "${RED}  ✗ File not found: $file_path${NC}"
    return 1
  fi

  log "${YELLOW}[$badge_type] Uploading '$file'...${NC}"

  # Common curl options: show errors, fail on HTTP errors, timeouts & retries
  local curl_opts=(--fail -S --connect-timeout 10 --max-time 60 --retry 3 --retry-delay 2)

  # Step 1: Request upload URL
  local request_response
  if ! request_response=$(jq -cn --arg originalName "$file" '{"originalName":$originalName}' \
    | curl "${curl_opts[@]}" -X POST \
    -H "Content-Type: application/json" \
    --data-binary @- \
    "$API_URL/files/badge/$badge_type/request-upload"); then
    log "${RED}  ✗ [1/3] Request upload URL failed for $badge_type${NC}"
    return 1
  fi

  local uuid upload_url
  uuid=$(echo "$request_response" | jq -r '.uuid')
  upload_url=$(echo "$request_response" | jq -r '.uploadUrl')

  if [ -z "$uuid" ] || [ "$uuid" = "null" ] || [ -z "$upload_url" ] || [ "$upload_url" = "null" ]; then
    log "${RED}  ✗ [1/3] Failed to get upload URL for $badge_type (uuid=$uuid, uploadUrl=<redacted>)${NC}"
    return 1
  fi

  log "  [1/3] Upload URL obtained (uuid=$uuid)"

  # Step 2: Upload file directly to Azure Blob Storage via SAS URL
  if ! curl "${curl_opts[@]}" -X PUT \
    -H "Content-Type: image/svg+xml" \
    -H "x-ms-blob-type: BlockBlob" \
    --data-binary "@$file_path" \
    "$upload_url" >/dev/null; then
    log "${RED}  ✗ [2/3] Blob upload failed for $badge_type${NC}"
    return 1
  fi

  log "  [2/3] File uploaded to Azure Blob"

  # Step 3: Confirm upload and persist DB record
  # No retries: confirm-upload is non-idempotent and must not be auto-retried
  if ! curl --fail -S --connect-timeout 10 --max-time 60 --retry 0 -X POST \
    -H "Content-Type: application/json" \
    -d "{\"uuid\": \"$uuid\", \"originalName\": \"$file\"}" \
    "$API_URL/files/badge/$badge_type/confirm-upload" >/dev/null; then
    log "${RED}  ✗ [3/3] Confirm upload failed for $badge_type${NC}"
    return 1
  fi

  log "${GREEN}  [3/3] Upload confirmed${NC}"
  log "${GREEN}  ✓ $badge_type → $file${NC}"
  echo ""
}

# ── Main ─────────────────────────────────────────────────────────────
log "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
log "${BLUE}Deploying badge assets to $API_URL${NC}"
log "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

SUCCESS=0
FAILED=0

for mapping in "${BADGE_MAPPINGS[@]}"; do
  file="${mapping%%:*}"
  badge_type="${mapping##*:}"

  if upload_badge "$file" "$badge_type"; then
    SUCCESS=$((SUCCESS + 1))
  else
    FAILED=$((FAILED + 1))
  fi
done

log "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
log "${GREEN}Done: $SUCCESS succeeded, $FAILED failed${NC}"
log "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
