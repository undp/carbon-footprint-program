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

# Stack for the current environment (App Service, DB, etc.)
STACK_NAME_ENV="undp-huella-latam-stack-$ENVIRONMENT"

# Derive shared stack and RG for ACR based on environment
# - production/staging: use same stack (ACR outputs are in main stack)
# - development (any dev name): use shared stack in shared RG
case "$ENVIRONMENT" in
  production|staging)
    STACK_NAME_SHARED="$STACK_NAME_ENV"
    SHARED_RESOURCE_GROUP="$AZURE_RESOURCE_GROUP"
    ;;
  *)
    STACK_NAME_SHARED="undp-huella-latam-stack-development"
    SHARED_RESOURCE_GROUP="undp-huella-latam-shared-rg"
    ;;
esac

log "Setting subscription..."
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

log "Fetching App Service from environment stack: $STACK_NAME_ENV (RG: $AZURE_RESOURCE_GROUP)"
APP_SERVICE_NAME=$(az stack group show \
  --name "$STACK_NAME_ENV" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "outputs.api.value.appService.name" -o tsv 2>/dev/null || echo "")

log "Fetching ACR from shared stack: $STACK_NAME_SHARED (RG: $SHARED_RESOURCE_GROUP)"
ACR_LOGIN_SERVER=$(az stack group show \
  --name "$STACK_NAME_SHARED" \
  --resource-group "$SHARED_RESOURCE_GROUP" \
  --query "outputs.acrLoginServer.value" -o tsv 2>/dev/null || echo "")

if [ -z "$APP_SERVICE_NAME" ] || [ "$APP_SERVICE_NAME" = "null" ]; then
  log "Error: App Service name not found in stack '$STACK_NAME_ENV' (resource group: $AZURE_RESOURCE_GROUP)."
  log "Make sure you have deployed the infrastructure with: ./deploy.sh"
  exit 1
fi

if [ -z "$ACR_LOGIN_SERVER" ] || [ "$ACR_LOGIN_SERVER" = "null" ]; then
  log "Error: ACR login server not found in shared stack '$STACK_NAME_SHARED' (resource group: $SHARED_RESOURCE_GROUP)."
  log "Make sure the shared ACR stack exists. Run ./deploy.sh to create it automatically."
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

log "Configurando contenedor con identidad administrada..."
az resource update \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME/config/web" \
  --resource-type "Microsoft.Web/sites/config" \
  --set properties.linuxFxVersion="DOCKER|$FULL_IMAGE" \
  --set properties.acrUseManagedIdentityCreds=true >/dev/null

log "Setting app settings..."
az webapp config appsettings set \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME" \
  --settings WEBSITES_PORT="$API_PORT" NODE_ENV=production >/dev/null

log "Restarting app..."
az webapp restart -g "$AZURE_RESOURCE_GROUP" -n "$APP_SERVICE_NAME"

log "Obteniendo hostname del App Service..."
HOSTNAME=$(az webapp show \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME" \
  --query defaultHostName -o tsv 2>/dev/null || echo "")

if [ -z "$HOSTNAME" ] || [ "$HOSTNAME" = "null" ]; then
  log "Warning: no se pudo obtener el hostname. Verifica que el App Service exista y que tengas permisos en la suscripción/RG."
else
  log "Deployment complete. App Service hostname: https://$HOSTNAME"
fi

