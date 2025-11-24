#!/usr/bin/env bash
set -euo pipefail

echo "=== View Deployment Stack ==="

# Load environment variables
if [ -f "../.env" ]; then
  set -o allexport
  source ../.env
  set +o allexport
fi

if [ -f "../.envrc" ]; then
  set -o allexport
  source ../.envrc
  set +o allexport
fi

: "${AZURE_SUBSCRIPTION_ID:?AZURE_SUBSCRIPTION_ID is required}"
: "${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP is required}"
: "${APP_ENV:=dev}"

STACK_NAME="undp-huella-latam-stack-$APP_ENV"

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
