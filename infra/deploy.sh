#!/usr/bin/env bash
set -euo pipefail

# Dry run mode (set DRY_RUN=true to simulate without executing)
DRY_RUN=${DRY_RUN:-false}

# Function to log with timestamp
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

log "=== [deploy.sh] Deployment starting ==="

# Show dry run status
if [ "$DRY_RUN" = "true" ]; then
  echo "═══════════════════════════════════════════════════════════════"
  log "DRY RUN MODE - No changes will be made"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
fi

# 0) Ensure Azure CLI is logged in
if ! az account show >/dev/null 2>&1; then
  log "Not logged in to Azure CLI. Please log in."
  if [ "$DRY_RUN" = "false" ]; then
    az login || { log "Error: Azure login failed."; exit 1; }
  else
    log "[DRY RUN] Would execute: az login"
  fi
fi

# Pre-flight: ensure required tools are available
command -v openssl >/dev/null 2>&1 || { log "Error: openssl is required but not found."; exit 1; }

# 1) Load .env / .envrc if present (non-sensitive config only)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/.env" ]; then
  log "Loading .env..."
  # Export all variables defined in .env
  set -o allexport
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +o allexport
fi

# Optional: support .envrc if you don't use direnv directly
if [ -f "$SCRIPT_DIR/.envrc" ]; then
  log "Loading .envrc..."
  set -o allexport
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.envrc"
  set +o allexport
fi

# 2) Check required non-sensitive variables
: "${AZURE_SUBSCRIPTION_ID:?AZURE_SUBSCRIPTION_ID is required}"
: "${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP is required}"
: "${AZURE_SUBSCRIPTION_GROUP:?AZURE_SUBSCRIPTION_GROUP is required}"
: "${LOCATION:?LOCATION is required}"
: "${ENVIRONMENT:?ENVIRONMENT is required}"

# Validate ENVIRONMENT format (must be lowercase)
if [[ "$ENVIRONMENT" =~ [A-Z] ]]; then
  log "ERROR: ENVIRONMENT must be lowercase (got: $ENVIRONMENT)"
  log "Valid examples: production, staging, development"
  exit 1
fi

log "App Environment (lifecycle/resource/tagging): $ENVIRONMENT"
log "Subscription:     $AZURE_SUBSCRIPTION_ID"
log "Location:         $LOCATION"
log "Resource Group:   $AZURE_RESOURCE_GROUP"

# 2.7) Set action-on-unmanage based on environment
# Production/Staging: detachAll (safe - keeps unmanaged resources)
# Development: deleteResources (clean up automatically)
# Also set environment parameters file based on environment
case "$ENVIRONMENT" in
  production|staging)
    ACTION_ON_UNMANAGE="detachAll"
    log "Action on unmanage: detachAll (safe mode - resources will be preserved)"
    log "Validated environment: $ENVIRONMENT"

    ENVIRONMENT_PARAMS_FILE="params/main.${ENVIRONMENT}.bicepparam"
    ;;
  *)
    ACTION_ON_UNMANAGE="deleteResources"
    log "Validated environment: $ENVIRONMENT"
    echo ""
    echo "⚠️  ═══════════════════════════════════════════════════════════════"
    echo "⚠️  WARNING: Development Mode - Auto-Cleanup Enabled"
    echo "⚠️  ═══════════════════════════════════════════════════════════════"
    echo ""
    log "Action on unmanage: deleteResources"
    log "Resources removed from template will be AUTOMATICALLY DELETED"
    echo ""
    echo "   This is safe for development but destructive for production."
    echo "   To use safe mode, set ENVIRONMENT to 'staging' or 'production'."
    echo ""
    echo "⚠️  ═══════════════════════════════════════════════════════════════"
    echo ""

    ENVIRONMENT_PARAMS_FILE="params/main.development.bicepparam"
    ;;
esac

echo "Using environment parameters file: $ENVIRONMENT_PARAMS_FILE"

# 3) Ensure correct subscription is selected
log "Setting Azure subscription..."
if [ "$DRY_RUN" = "true" ]; then
  log "[DRY RUN] Would execute: az account set --subscription $AZURE_SUBSCRIPTION_ID"
else
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi

# 4) Creating resource group if it doesn't exist...
log "Creating resource group if it doesn't exist..."
if [ "$DRY_RUN" = "true" ]; then
  log "[DRY RUN] Would execute: az group create --name $AZURE_RESOURCE_GROUP --location $LOCATION"
else
  az group create --name "$AZURE_RESOURCE_GROUP" --location "$LOCATION"
fi

# 5) Get Azure AD group Object ID for Key Vault access
log "Getting $AZURE_SUBSCRIPTION_GROUP group Object ID..."
DEVS_GROUP_ID=$(az ad group show --group "$AZURE_SUBSCRIPTION_GROUP" --query id -o tsv 2>/dev/null || echo "")

if [ -z "$DEVS_GROUP_ID" ]; then
  log "Warning: $AZURE_SUBSCRIPTION_GROUP group not found. Key Vault will be created without group access."
  log "You can manually assign permissions later or add the group Object ID to the deployment."
fi

# 6) Check if password secret already exists in Key Vault
log "Checking if password secret already exists..."
EXISTING_VAULT=$(az keyvault list \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "[0].name" -o tsv 2>/dev/null || echo "")

DB_PASSWORD=""

if [ -n "$EXISTING_VAULT" ]; then
  log "Found existing Key Vault: $EXISTING_VAULT"
  
  # Check if secret exists (don't retrieve value, just check existence)
  SECRET_EXISTS=$(az keyvault secret show \
    --vault-name "$EXISTING_VAULT" \
    --name "postgres-admin-password" \
    --query "name" -o tsv 2>/dev/null || echo "")
  
  if [ -n "$SECRET_EXISTS" ]; then
    log "Password secret already exists. Skipping password generation (will not overwrite)."
    # Pass empty string to Bicep so it skips secret creation and preserves existing
    DB_PASSWORD=""
  else
    log "No existing password secret found. Generating new password..."
    DB_PASSWORD=$(openssl rand -hex 32)
    log "New password generated"
  fi
else
  log "No existing Key Vault found. Generating new password..."
  DB_PASSWORD=$(openssl rand -hex 32)
  log "New password generated"
fi

# 7) Deploy using Azure Deployment Stack (enhanced lifecycle management)
log "Running Bicep deployment using Deployment Stack..."

STACK_NAME="undp-huella-latam-stack-$ENVIRONMENT"

echo "═══════════════════════════════════════════════════════════════"

# Build parameters array
DEPLOY_PARAMS=(
  --name "$STACK_NAME"
  --resource-group "$AZURE_RESOURCE_GROUP"
  --template-file "$SCRIPT_DIR/main.bicep"
  --parameters "$SCRIPT_DIR/$ENVIRONMENT_PARAMS_FILE"
  --parameters dbPassword="$DB_PASSWORD"
  --parameters devGroupObjectId="$DEVS_GROUP_ID"
  --parameters environment="$ENVIRONMENT"
)

# Add optional parameters only if set
if [ -n "${FRONT_DOOR_CUSTOM_DOMAIN:-}" ]; then
  log "Using custom Front Door domain: $FRONT_DOOR_CUSTOM_DOMAIN"
  DEPLOY_PARAMS+=(--parameters frontDoorCustomDomain="$FRONT_DOOR_CUSTOM_DOMAIN")
fi

deployment_result=0

log "Starting deployment stack creation..."
if [ "$DRY_RUN" = "true" ]; then
  log "[DRY RUN] Would execute: az stack group create \\"
  log "[DRY RUN]   --name $STACK_NAME \\"
  log "[DRY RUN]   --resource-group $AZURE_RESOURCE_GROUP \\"
  log "[DRY RUN]   --template-file $SCRIPT_DIR/main.bicep \\"
  log "[DRY RUN]   --parameters $SCRIPT_DIR/$ENVIRONMENT_PARAMS_FILE \\"
  log "[DRY RUN]   --parameters dbPassword=[REDACTED] \\"
  log "[DRY RUN]   --parameters devGroupObjectId=$DEVS_GROUP_ID \\"
  log "[DRY RUN]   --parameters environment=$ENVIRONMENT \\"
  if [ -n "${FRONT_DOOR_CUSTOM_DOMAIN:-}" ]; then
    log "[DRY RUN]   --parameters frontDoorCustomDomain=$FRONT_DOOR_CUSTOM_DOMAIN \\"
  fi
  log "[DRY RUN]   --deny-settings-mode none \\"
  log "[DRY RUN]   --action-on-unmanage $ACTION_ON_UNMANAGE \\"
  log "[DRY RUN]   --yes --verbose"
else
  az stack group create \
    "${DEPLOY_PARAMS[@]}" \
    --deny-settings-mode "none" \
    --action-on-unmanage "$ACTION_ON_UNMANAGE" \
    --yes \
    --verbose || deployment_result=$?

  if [ $deployment_result -ne 0 ]; then
    log "=== [deploy.sh] Deployment Stack FAILED (ENV: $ENVIRONMENT) with exit code $deployment_result ==="
    exit $deployment_result
  fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"

if [ "$DRY_RUN" = "true" ]; then
  echo "✓ Dry run completed successfully (no changes applied)"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "The deployment would have configured:"
  echo "  - Resource Group:  $AZURE_RESOURCE_GROUP"
  echo "  - Stack Name:      $STACK_NAME"
  echo "  - Environment:     $ENVIRONMENT"
  echo "  - Parameters File: $ENVIRONMENT_PARAMS_FILE"
  echo ""
  echo "To execute the actual deployment, run without DRY_RUN:"
  echo "  ./deploy.sh"
else
  echo "✓ Infrastructure deployment completed successfully!"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "📦 Deployed Resources:"
  echo "  - Resource Group:  $AZURE_RESOURCE_GROUP"
  echo "  - Key Vault:       Created/Updated"
  echo "  - Storage Account: Created/Updated"
  echo "  - PostgreSQL DB:   Created/Updated"
  echo "  - Static Web App:  Ready for content deployment"
  echo "  - App Service:     Ready for deployment"

  # Check if Front Door is configured
  FRONT_DOOR_ENDPOINT=$(az stack group show \
    --name "$STACK_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query outputs.frontDoorEndpoint.value \
    -o tsv 2>/dev/null || echo '')

  if [ -n "$FRONT_DOOR_ENDPOINT" ]; then
    echo "  - Front Door:      Configured"
  fi
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "📋 NEXT STEP: Deploy your web application"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "The infrastructure is ready. Now deploy your frontend:"
  echo ""
  echo "  cd infra"
  echo "  ./deploy-web.sh"
  echo ""
  echo "This will:"
  echo "  1. Build your React/Vite application"
  echo "  2. Upload the build to Azure Static Web Apps"
  echo "  3. Make your app live on the internet"
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  echo "📚 Useful commands:"
  echo "  View stack:    az stack group show --name $STACK_NAME --resource-group $AZURE_RESOURCE_GROUP"
  echo "  List stacks:   az stack group list --resource-group $AZURE_RESOURCE_GROUP"
  echo "  Delete stack:  az stack group delete --name $STACK_NAME --resource-group $AZURE_RESOURCE_GROUP --action-on-unmanage deleteAll"
fi