#!/usr/bin/env bash
set -euo pipefail

echo "=== [deploy.sh] Deployment starting ==="

# 0) Ensure Azure CLI is logged in
if ! az account show >/dev/null 2>&1; then
  echo "Not logged in to Azure CLI. Please log in."
  az login
fi

# Pre-flight: ensure required tools are available
command -v openssl >/dev/null 2>&1 || { echo "Error: openssl is required but not found."; }

# 1) Load .env / .envrc if present (non-sensitive config only)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/.env" ]; then
  echo "Loading .env..."
  # Export all variables defined in .env
  set -o allexport
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +o allexport
fi

# Optional: support .envrc if you don't use direnv directly
if [ -f "$SCRIPT_DIR/.envrc" ]; then
  echo "Loading .envrc..."
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
: "${DEVELOPER_NAME:?DEVELOPER_NAME is required}"
: "${APP_ENV:?APP_ENV is required}"

echo "Environment:      $APP_ENV"
echo "Subscription:     $AZURE_SUBSCRIPTION_ID"
echo "Location:         $LOCATION"
echo "Resource Group:   $AZURE_RESOURCE_GROUP"

# 3) Ensure correct subscription is selected
echo "Setting Azure subscription..."
az account set --subscription "$AZURE_SUBSCRIPTION_ID"

# 4) Creating resource group if it doesn't exist...
az group create --name "$AZURE_RESOURCE_GROUP" --location "$LOCATION"

# 5) Get Azure AD group Object ID for Key Vault access
echo "Getting $AZURE_SUBSCRIPTION_GROUP group Object ID..."
DEVS_GROUP_ID=$(az ad group show --group "$AZURE_SUBSCRIPTION_GROUP" --query id -o tsv 2>/dev/null || echo "")

if [ -z "$DEVS_GROUP_ID" ]; then
  echo "Warning: $AZURE_SUBSCRIPTION_GROUP group not found. Key Vault will be created without group access."
  echo "You can manually assign permissions later or add the group Object ID to the deployment."
fi

# 6) Check if password secret already exists in Key Vault
echo "Checking if password secret already exists..."
EXISTING_VAULT=$(az keyvault list \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "[0].name" -o tsv 2>/dev/null || echo "")

DB_PASSWORD=""

if [ -n "$EXISTING_VAULT" ]; then
  echo "Found existing Key Vault: $EXISTING_VAULT"
  
  # Check if secret exists (don't retrieve value, just check existence)
  SECRET_EXISTS=$(az keyvault secret show \
    --vault-name "$EXISTING_VAULT" \
    --name "postgres-admin-password" \
    --query "name" -o tsv 2>/dev/null || echo "")
  
  if [ -n "$SECRET_EXISTS" ]; then
    echo "Password secret already exists. Skipping password generation (will not overwrite)."
    DB_PASSWORD=""
  else
    echo "No existing password secret found. Generating new password..."
    DB_PASSWORD=$(openssl rand -base64 18)
    echo "New password generated"
  fi
else
  echo "No existing Key Vault found. Generating new password..."
  DB_PASSWORD=$(openssl rand -base64 18)
  echo "New password generated"
fi

# 7) Deploy using Azure Deployment Stack (enhanced lifecycle management)
echo "Running Bicep deployment using Deployment Stack..."

STACK_NAME="undp-huella-latam-stack-$APP_ENV"

deployment_result=0

az stack group create \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --template-file "$SCRIPT_DIR/main.bicep" \
  --parameters "$SCRIPT_DIR/params/main.$APP_ENV.bicepparam" \
  --parameters dbPassword="$DB_PASSWORD" \
  --parameters devGroupObjectId="$DEVS_GROUP_ID" \
  --parameters developerName="$DEVELOPER_NAME" \
  --deny-settings-mode "none" \
  --action-on-unmanage "detachAll" \
  --yes \
  --verbose || deployment_result=$?

if [ $deployment_result -ne 0 ]; then
  echo "=== [deploy.sh] Deployment Stack FAILED (ENV: $APP_ENV) with exit code $deployment_result ==="
  exit $deployment_result
fi

echo "=== [deploy.sh] Deployment Stack completed successfully (ENV: $APP_ENV) ==="
echo "Stack name: $STACK_NAME"
echo ""
echo "Useful commands:"
echo "  View stack:    az stack group show --name $STACK_NAME --resource-group $AZURE_RESOURCE_GROUP"
echo "  List stacks:   az stack group list --resource-group $AZURE_RESOURCE_GROUP"
echo "  Delete stack:  az stack group delete --name $STACK_NAME --resource-group $AZURE_RESOURCE_GROUP --action-on-unmanage deleteAll"