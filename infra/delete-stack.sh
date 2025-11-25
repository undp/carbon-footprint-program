#!/usr/bin/env bash
set -euo pipefail

echo "=== Delete Deployment Stack ==="

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
: "${APP_ENV:=dev}"

STACK_NAME="undp-huella-latam-stack-$APP_ENV"

echo "Subscription:     $AZURE_SUBSCRIPTION_ID"
echo "Resource Group:   $AZURE_RESOURCE_GROUP"
echo "Stack Name:       $STACK_NAME"
echo ""

# Ask for confirmation
read -p "This will delete the stack and ALL managed resources. Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Deletion cancelled."
  exit 0
fi

# Select action on unmanage
echo ""
echo "Choose what to do with resources when deleting the stack:"
echo "1) deleteAll    - Delete all managed resources (recommended for dev)"
echo "2) detachAll    - Keep resources but remove from stack management"
echo "3) deleteResources - Delete resources but keep resource groups"
read -p "Enter choice (1-3): " ACTION_CHOICE

case $ACTION_CHOICE in
  1)
    ACTION="deleteAll"
    ;;
  2)
    ACTION="detachAll"
    ;;
  3)
    ACTION="deleteResources"
    ;;
  *)
    echo "Invalid choice. Using 'detachAll' as safe default."
    ACTION="detachAll"
    ;;
esac

echo ""
echo "Deleting stack with action: $ACTION"

az account set --subscription "$AZURE_SUBSCRIPTION_ID"

az stack group delete \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --action-on-unmanage "$ACTION" \
  --yes

echo "=== Stack deleted successfully ==="
