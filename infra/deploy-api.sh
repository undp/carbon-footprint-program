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

command -v az >/dev/null 2>&1 || { log "Error: Azure CLI (az) is required but not found in PATH."; exit 1; }
command -v docker >/dev/null 2>&1 || { log "Error: Docker CLI is required but not found in PATH."; exit 1; }
if ! az account show >/dev/null 2>&1; then
  log "Error: Azure CLI not logged in. Run 'az login' before continuing."
  exit 1
fi

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
APP_VERSION="${APP_VERSION:-$IMAGE_TAG}"

# Stack for the current environment (App Service, DB, ACR, etc.)
STACK_NAME_ENV="undp-huella-latam-stack-$ENVIRONMENT"

log "Setting subscription..."
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

log "Fetching App Service from environment stack: $STACK_NAME_ENV (RG: $AZURE_RESOURCE_GROUP)"
APP_SERVICE_NAME=$(az stack group show \
  --name "$STACK_NAME_ENV" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "outputs.api.value.appService.name" -o tsv 2>/dev/null || echo "")

log "Fetching ACR outputs from environment stack: $STACK_NAME_ENV (RG: $AZURE_RESOURCE_GROUP)"
ACR_ID=$(az stack group show \
  --name "$STACK_NAME_ENV" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "outputs.containerRegistryId.value" -o tsv 2>/dev/null || echo "")
ACR_LOGIN_SERVER=$(az stack group show \
  --name "$STACK_NAME_ENV" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "outputs.acrLoginServer.value" -o tsv 2>/dev/null || echo "")

if [ -z "$APP_SERVICE_NAME" ] || [ "$APP_SERVICE_NAME" = "null" ]; then
  log "Error: App Service name not found in stack '$STACK_NAME_ENV' (resource group: $AZURE_RESOURCE_GROUP)."
  log "Make sure you have deployed the infrastructure with: ./deploy.sh"
  exit 1
fi

if [ -z "$ACR_LOGIN_SERVER" ] || [ "$ACR_LOGIN_SERVER" = "null" ]; then
  log "Error: ACR login server not found in stack '$STACK_NAME_ENV' (resource group: $AZURE_RESOURCE_GROUP)."
  log "Make sure the infrastructure stack is deployed and outputs.acrLoginServer is present. Run ./deploy.sh."
  exit 1
fi

ACR_RG=$(echo "$ACR_ID" | awk -F/ '{print $5}')
ACR_NAME="${ACR_LOGIN_SERVER%%.azurecr.io}"
FULL_IMAGE="$ACR_LOGIN_SERVER/$IMAGE_NAME:$IMAGE_TAG"

log "App Service: $APP_SERVICE_NAME"
log "ACR: $ACR_NAME ($ACR_LOGIN_SERVER) RG: ${ACR_RG:-unknown}"
log "Image: $FULL_IMAGE"

log "Logging into ACR..."
az acr login -n "$ACR_NAME"

log "Building image for linux/amd64..."
docker build --platform linux/amd64 -f "$REPO_ROOT/apps/api/Dockerfile" -t "$FULL_IMAGE" "$REPO_ROOT"

log "Pushing image..."
docker push "$FULL_IMAGE"

log "Configuring container with managed identity..."
az resource update \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME/config/web" \
  --resource-type "Microsoft.Web/sites/config" \
  --set properties.linuxFxVersion="DOCKER|$FULL_IMAGE" \
  --set properties.acrUseManagedIdentityCreds=true >/dev/null

log "Setting app settings..."
APP_SETTINGS=(
  "WEBSITES_PORT=$API_PORT"
  "APP_VERSION=${APP_VERSION:-unknown}"
)

# Read a single deployment-stack output, normalizing a missing/null output to
# an empty string (az may emit the literal "null" for an absent value).
stack_output() {
  local value
  value=$(az stack group show \
    --name "$STACK_NAME_ENV" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query "outputs.$1.value" -o tsv 2>/dev/null || echo "")
  if [ "$value" = "null" ]; then
    value=""
  fi
  printf '%s' "$value"
}

# Resolve ALLOWED_ORIGIN for the Fastify container. This MUST mirror the
# `allowedOrigin` precedence in infra/main.bicep so a standalone deploy-api.sh
# never overwrites the origin bicep wrote to App Service / Storage CORS:
#   1. FRONTEND_CUSTOM_DOMAIN (env var, then stack output) — wins for any front end.
#   2. Front Door endpoint — when Front Door is enabled without a custom domain.
#   3. Static Web App default hostname — plain deployments.
# A manual VITE_FRONT_BASE_URL is intentionally ignored to keep this in sync.
if [ -n "${FRONTEND_CUSTOM_DOMAIN:-}" ]; then
  ALLOWED_ORIGIN_VALUE="https://${FRONTEND_CUSTOM_DOMAIN}"
  log "Resolved ALLOWED_ORIGIN from FRONTEND_CUSTOM_DOMAIN env: $ALLOWED_ORIGIN_VALUE"
else
  ORIGIN_HOST=""
  ORIGIN_SOURCE=""
  if ORIGIN_HOST=$(stack_output frontendCustomDomain); [ -n "$ORIGIN_HOST" ]; then
    ORIGIN_SOURCE="stack output frontendCustomDomain"
  elif ORIGIN_HOST=$(stack_output frontDoorEndpoint); [ -n "$ORIGIN_HOST" ]; then
    ORIGIN_SOURCE="stack output frontDoorEndpoint"
  elif ORIGIN_HOST=$(stack_output staticWebAppHostname); [ -n "$ORIGIN_HOST" ]; then
    ORIGIN_SOURCE="Static Web App default hostname"
  fi

  if [ -n "$ORIGIN_HOST" ]; then
    ALLOWED_ORIGIN_VALUE="https://${ORIGIN_HOST}"
    log "Resolved ALLOWED_ORIGIN from ${ORIGIN_SOURCE}: $ALLOWED_ORIGIN_VALUE"
  else
    ALLOWED_ORIGIN_VALUE=""
    log "Warning: could not resolve ALLOWED_ORIGIN from FRONTEND_CUSTOM_DOMAIN or stack outputs; leaving unchanged."
  fi
fi

if [ -n "$ALLOWED_ORIGIN_VALUE" ]; then
  APP_SETTINGS+=("ALLOWED_ORIGIN=$ALLOWED_ORIGIN_VALUE")
fi

az webapp config appsettings set \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME" \
  --settings "${APP_SETTINGS[@]}" >/dev/null

log "Restarting app..."
az webapp restart -g "$AZURE_RESOURCE_GROUP" -n "$APP_SERVICE_NAME"

log "Retrieving App Service hostname..."
HOSTNAME=$(az webapp show \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$APP_SERVICE_NAME" \
  --query defaultHostName -o tsv 2>/dev/null || echo "")

if [ -z "$HOSTNAME" ] || [ "$HOSTNAME" = "null" ]; then
  log "Warning: could not retrieve hostname. Verify the App Service exists and that you have subscription/RG permissions."
else
  log "Deployment complete. App Service hostname: https://$HOSTNAME"
fi

