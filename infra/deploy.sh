#!/usr/bin/env bash
set -euo pipefail

echo "=== [dev.sh] Dev deployment starting ==="

# 0) Ensure Azure CLI is logged in
if ! az account show >/dev/null 2>&1; then
  echo "Not logged in to Azure CLI. Please log in."
  az login
fi

# 1) Load .env / .envrc if present (non-sensitive config only)
if [ -f "../.env" ]; then
  echo "Loading .env..."
  # Export all variables defined in .env
  set -o allexport
  # shellcheck disable=SC1091
  source ../.env
  set +o allexport
fi

# Optional: support .envrc if you don't use direnv directly
if [ -f "../.envrc" ]; then
  echo "Loading .envrc..."
  set -o allexport
  # shellcheck disable=SC1091
  source ../.envrc
  set +o allexport
fi

# 2) Check required non-sensitive variables
: "${AZURE_SUBSCRIPTION_ID:?AZURE_SUBSCRIPTION_ID is required}"
: "${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP is required}"
: "${APP_ENV:=dev}"

echo "Subscription:     $AZURE_SUBSCRIPTION_ID"
echo "Resource Group:   $AZURE_RESOURCE_GROUP"
echo "Environment:      $APP_ENV"

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

# Check if user wants to force a specific password via environment variable
if [ -n "${DB_PASSWORD_OVERRIDE:-}" ]; then
  echo "DB_PASSWORD_OVERRIDE is set. Using provided password."
  DB_PASSWORD="$DB_PASSWORD_OVERRIDE"
elif [ -n "$EXISTING_VAULT" ]; then
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

# 7) Run the Bicep deployment (Resource Group scoped)
echo "Running Bicep deployment to dev environment..."

deployment_result=0
az deployment group create \
  --subscription "$AZURE_SUBSCRIPTION_ID" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --template-file "main.bicep" \
  --parameters "params/main.$APP_ENV.bicepparam" \
  --parameters dbPassword="$DB_PASSWORD" \
  --parameters devGroupObjectId="$DEVS_GROUP_ID" \
  --verbose || deployment_result=$?

if [ $deployment_result -ne 0 ]; then
  echo "=== [dev.sh] Deployment FAILED with exit code $deployment_result ==="
  exit $deployment_result
fi

echo "=== [dev.sh] Deployment completed successfully ==="