#!/usr/bin/env bash
set -euo pipefail

# Simple deploy script for API container to Azure App Service (Linux)
# Assumes:
# - The ACR and role assignments were created by infra/deploy.sh (AcrPull on App Service MI)
# - Docker is installed locally
# - Azure CLI is logged in

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Required env vars
: "${AZURE_SUBSCRIPTION_ID:?AZURE_SUBSCRIPTION_ID is required}"
: "${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP is required}"
: "${ENVIRONMENT:?ENVIRONMENT is required}"

# Optional env vars
IMAGE_NAME="${IMAGE_NAME:-api}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"
API_PORT="${API_PORT:-8080}"

STACK_NAME="undp-huella-latam-stack-$ENVIRONMENT"

log "Setting subscription..."
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

log "Fetching stack outputs..."
APP_SERVICE_NAME=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "outputs.api.value.appService.name" -o tsv 2>/dev/null || echo "")

ACR_LOGIN_SERVER=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "outputs.acrLoginServer.value" -o tsv 2>/dev/null || echo "")

if [ -z "$APP_SERVICE_NAME" ] || [ "$APP_SERVICE_NAME" = "null" ]; then
  log "Error: App Service name not found in stack outputs."
  exit 1
fi

if [ -z "$ACR_LOGIN_SERVER" ] || [ "$ACR_LOGIN_SERVER" = "null" ]; then
  log "Error: ACR login server not found in stack outputs."
  exit 1
fi

ACR_NAME="${ACR_LOGIN_SERVER%%.azurecr.io}"
FULL_IMAGE="$ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG"

log "App Service: $APP_SERVICE_NAME"
log "ACR: $ACR_NAME ($ACR_LOGIN_SERVER)"
log "Image: $FULL_IMAGE"

log "Logging into ACR..."
az acr login -n "$ACR_NAME"

log "Building image..."
docker build -f "$REPO_ROOT/apps/api/Dockerfile" -t "$FULL_IMAGE" "$REPO_ROOT"

log "Pushing image..."
docker push "$FULL_IMAGE"

log "Configuring App Service container..."
az webapp config container set \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME" \
  --docker-custom-image-name "$FULL_IMAGE" \
  --docker-registry-server-url "https://$ACR_LOGIN_SERVER"

log "Enabling managed identity pull..."
az resource update \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME" \
  --resource-type Microsoft.Web/sites \
  --set properties.siteConfig.acrUseManagedIdentityCreds=true >/dev/null

log "Setting app settings..."
az webapp config appsettings set \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME" \
  --settings WEBSITES_PORT="$API_PORT" NODE_ENV=production >/dev/null

log "Restarting app..."
az webapp restart -g "$AZURE_RESOURCE_GROUP" -n "$APP_SERVICE_NAME"

log "Deployment complete. App Service hostname:"
az webapp show -g "$AZURE_RESOURCE_GROUP" -n "$APP_SERVICE_NAME" --query defaultHostName -o tsv

