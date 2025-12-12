#!/usr/bin/env bash
set -euo pipefail

# Deploy/update the shared stack (ACR) in the shared resource group.
# Requires: AZURE_SUBSCRIPTION_ID, LOCATION, SHARED_RESOURCE_GROUP_NAME.
# Optional: DRY_RUN=true, SHARED_PARAMS_FILE (default params/main.development.shared.bicepparam).

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

DRY_RUN=${DRY_RUN:-false}
SHARED_PARAMS_FILE=${SHARED_PARAMS_FILE:-params/main.development.shared.bicepparam}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env / .envrc if they exist
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -o allexport
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +o allexport
fi

if [ -f "$SCRIPT_DIR/.envrc" ]; then
  set -o allexport
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.envrc"
  set +o allexport
fi

: "${AZURE_SUBSCRIPTION_ID:?AZURE_SUBSCRIPTION_ID is required}"
: "${LOCATION:?LOCATION is required}"
: "${SHARED_RESOURCE_GROUP_NAME:?SHARED_RESOURCE_GROUP_NAME is required}"

log "=== [deploy-shared.sh] Shared ACR deployment starting ==="
log "Subscription: $AZURE_SUBSCRIPTION_ID"
log "Location:     $LOCATION"
log "Shared RG:    $SHARED_RESOURCE_GROUP_NAME"
log "Params file:  $SHARED_PARAMS_FILE"

# Basic validations
command -v jq >/dev/null 2>&1 || { log "Error: jq is required but not found."; exit 1; }
if ! az bicep version >/dev/null 2>&1; then
  log "Error: Azure CLI Bicep extension is required (run: az bicep install)."
  exit 1
fi

# Select subscription
if [ "$DRY_RUN" = "true" ]; then
  log "[DRY RUN] Would execute: az account set --subscription $AZURE_SUBSCRIPTION_ID"
else
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi

# Create/verify shared resource group
log "Ensuring shared resource group exists..."
if [ "$DRY_RUN" = "true" ]; then
  log "[DRY RUN] Would execute: az group create --name $SHARED_RESOURCE_GROUP_NAME --location $LOCATION"
else
  az group create --name "$SHARED_RESOURCE_GROUP_NAME" --location "$LOCATION" >/dev/null
fi

# Read ACR parameters from the shared stack bicepparam file
PARAMS_JSON=$(az bicep build-params --file "$SCRIPT_DIR/$SHARED_PARAMS_FILE" --stdout)

get_param() {
  local param_name="$1"
  echo "$PARAMS_JSON" | jq -r "
    if .parameters then
      .parameters.${param_name}.value // empty
    elif .parametersJson then
      (.parametersJson | fromjson | .parameters.${param_name}.value // empty)
    else empty end
  "
}

ACR_NAME="${ACR_NAME:-$(get_param "acrName")}"
ACR_SKU_PARAM="$(get_param "acrSku")"
ACR_SKU="${ACR_SKU:-${ACR_SKU_PARAM:-Basic}}"
SHARED_STACK_NAME="undp-huella-latam-stack-shared"

if [ -z "$ACR_NAME" ]; then
  log "Error: acrName not found in $SHARED_PARAMS_FILE"
  exit 1
fi

log "ACR Name: $ACR_NAME"
log "ACR SKU:  $ACR_SKU"

if [ "$DRY_RUN" = "true" ]; then
  log "[DRY RUN] Would execute: az stack group create --name $SHARED_STACK_NAME --resource-group $SHARED_RESOURCE_GROUP_NAME \\"
  log "[DRY RUN]   --template-file $SCRIPT_DIR/main.shared.bicep --parameters $SCRIPT_DIR/$SHARED_PARAMS_FILE \\"
  log "[DRY RUN]   --parameters acrName=$ACR_NAME --parameters acrSku=$ACR_SKU --deny-settings-mode none --action-on-unmanage detachAll --yes"
else
  az stack group create \
    --name "$SHARED_STACK_NAME" \
    --resource-group "$SHARED_RESOURCE_GROUP_NAME" \
    --template-file "$SCRIPT_DIR/main.shared.bicep" \
    --parameters "$SCRIPT_DIR/$SHARED_PARAMS_FILE" \
    --parameters acrName="$ACR_NAME" \
    --parameters acrSku="$ACR_SKU" \
    --deny-settings-mode "none" \
    --action-on-unmanage "detachAll" \
    --yes >/dev/null
  log "Shared ACR stack deployed/updated successfully."
fi

log "=== [deploy-shared.sh] Done ==="

