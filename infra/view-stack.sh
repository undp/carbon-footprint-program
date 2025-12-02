#!/usr/bin/env bash
set -euo pipefail

echo "=== View Deployment Stack ==="

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/.env" ]; then
  set -o allexport
  source "$SCRIPT_DIR/.env"
  set +o allexport
fi

if [ -f "$SCRIPT_DIR/.envrc" ]; then
  set -o allexport
  source "$SCRIPT_DIR/.envrc"
  set +o allexport
fi

: "${AZURE_SUBSCRIPTION_ID:?AZURE_SUBSCRIPTION_ID is required}"
: "${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP is required}"
: "${ENVIRONMENT:?ENVIRONMENT is required}"

# Validate ENVIRONMENT format (must be lowercase)
if [[ "$ENVIRONMENT" =~ [A-Z] ]]; then
  echo "ERROR: ENVIRONMENT must be lowercase (got: $ENVIRONMENT)"
  echo "Valid examples: production, staging, development"
  exit 1
fi

STACK_NAME="undp-huella-latam-stack-$ENVIRONMENT"

az account set --subscription "$AZURE_SUBSCRIPTION_ID"

echo ""
echo "=== Stack Information ==="
az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --output table

echo ""
echo "=== Managed Resources ==="
az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "resources[].{Name:id, Type:resourceType, Status:status}" \
  --output table

echo ""
echo "=== Stack Outputs ==="
az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "outputs" \
  --output json
