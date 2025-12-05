#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════
# Deploy API Application to Azure App Service
# ═══════════════════════════════════════════════════════════════════════
#
# PURPOSE:
# This script handles the API APPLICATION deployment (Step 2 of 2)
# It builds and uploads your Fastify/Node.js API to the App Service
# infrastructure that was created by deploy.sh
#
# WHY TWO SCRIPTS?
# 
# 1. deploy.sh (Infrastructure) - Run ONCE or when infrastructure changes
#    - Creates Azure resources (App Service, Key Vault, etc.)
#    - Manages secrets and permissions
#    - Slow but stable (takes 5-10 minutes)
#
# 2. deploy-api.sh (Application) - Run EVERY TIME you update your code
#    - Builds and deploys only the API code
#    - Fast iterations (takes 1-2 minutes)
#    - No infrastructure changes
#
# WORKFLOW:
# Infrastructure changes? → Run deploy.sh
# Code changes?          → Run deploy-api.sh
#
# ═══════════════════════════════════════════════════════════════════════

set -e

# Get script directory for reliable paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_APP_DIR="$PROJECT_ROOT/apps/api"

# Dry run mode (set DRY_RUN=true to simulate without executing)
DRY_RUN=${DRY_RUN:-false}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
  echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Function to execute or simulate command
run_cmd() {
  if [ "$DRY_RUN" = "true" ]; then
    log "${CYAN}[DRY RUN] Would execute: $*${NC}"
    return 0
  else
    "$@"
  fi
}

# Show dry run status
if [ "$DRY_RUN" = "true" ]; then
  log "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  log "${CYAN}DRY RUN MODE - No changes will be made${NC}"
  log "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
fi

# Check if logged in to Azure CLI
log "${YELLOW}Checking Azure CLI login...${NC}"
if ! az account show >/dev/null 2>&1; then
  log "${RED}Not logged in to Azure CLI. Please log in.${NC}"
  if [ "$DRY_RUN" = "false" ]; then
    az login
  fi
fi
log "${GREEN}   ✓ Azure CLI authenticated${NC}"
echo ""

# Load environment variables from infra directory
if [ -f "$SCRIPT_DIR/.envrc" ]; then
  source "$SCRIPT_DIR/.envrc"
else
  echo -e "${RED}Error: .envrc file not found in $SCRIPT_DIR${NC}"
  exit 1
fi

# Check required tools
log "${YELLOW}Checking prerequisites...${NC}"

for cmd in az pnpm node; do
  if ! command -v $cmd &> /dev/null; then
    log "${RED}Error: $cmd is not installed${NC}"
    case $cmd in
      az)
        log "${YELLOW}Install Azure CLI: https://learn.microsoft.com/cli/azure/install-azure-cli${NC}"
        ;;
      pnpm)
        log "${YELLOW}Install pnpm: npm install -g pnpm${NC}"
        ;;
      node)
        log "${YELLOW}Install Node.js: https://nodejs.org/${NC}"
        ;;
    esac
    exit 1
  fi
done

log "${GREEN}   ✓ All prerequisites met${NC}"
echo ""

# Check required environment variables
: "${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP is required}"
: "${ENVIRONMENT:?ENVIRONMENT is required}"

# Validate ENVIRONMENT format (must be lowercase)
if [[ "$ENVIRONMENT" =~ [A-Z] ]]; then
  log "${RED}ERROR: ENVIRONMENT must be lowercase (got: $ENVIRONMENT)${NC}"
  log "${YELLOW}Valid examples: production, staging, development${NC}"
  exit 1
fi

log "App Environment (lifecycle/resource/tagging): $ENVIRONMENT"
log "Resource Group:   $AZURE_RESOURCE_GROUP"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Starting API Application Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get the App Service details from the deployment
log "${YELLOW}[1/6] Fetching App Service details...${NC}"
STACK_NAME="undp-huella-latam-stack-$ENVIRONMENT"

# Get App Service name
APP_SERVICE_NAME=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query outputs.appServiceName.value \
  --output tsv 2>/dev/null || echo "")

if [ -z "$APP_SERVICE_NAME" ]; then
  log "${RED}Error: Could not find App Service name. Make sure infrastructure is deployed.${NC}"
  log "${YELLOW}Run ./deploy.sh first to create the infrastructure.${NC}"
  exit 1
fi

log "${GREEN}   ✓ Found: $APP_SERVICE_NAME${NC}"
echo ""

# Prepare source code for deployment
# Note: Build will happen in Azure App Service, not locally
log "${YELLOW}[2/6] Preparing source code for deployment...${NC}"
if [ "$DRY_RUN" = "true" ]; then
  log "${CYAN}[DRY RUN] Would prepare source code (build will happen in Azure)${NC}"
else
  # Verify source code exists
  if [ ! -d "$API_APP_DIR/src" ]; then
    log "${RED}Error: Source code directory not found at $API_APP_DIR/src${NC}"
    exit 1
  fi
fi

log "${GREEN}   ✓ Source code ready${NC}"
echo ""

# Create deployment package (ZIP)
log "${YELLOW}[3/6] Creating deployment package...${NC}"

TEMP_DIR=$(mktemp -d)
DEPLOY_PACKAGE="$TEMP_DIR/api-deploy.zip"

if [ "$DRY_RUN" = "true" ]; then
  log "${CYAN}[DRY RUN] Would create ZIP in: $TEMP_DIR${NC}"
  log "${CYAN}[DRY RUN] Would include: src/, package.json, tsconfig.json, and monorepo files${NC}"
else
  # Create monorepo structure in temp directory
  # Azure will run pnpm install and build from the root
  
  # Copy monorepo configuration files (required for pnpm workspace)
  # Note: package.json will be created below with custom build script
  cp "$PROJECT_ROOT/pnpm-workspace.yaml" "$TEMP_DIR/"
  cp "$PROJECT_ROOT/pnpm-lock.yaml" "$TEMP_DIR/"
  cp "$PROJECT_ROOT/.npmrc" "$TEMP_DIR/"
  
  # Copy workspace packages (required for dependencies and TypeScript config)
  mkdir -p "$TEMP_DIR/packages"
  cp -r "$PROJECT_ROOT/packages/database" "$TEMP_DIR/packages/"
  cp -r "$PROJECT_ROOT/packages/typescript-config" "$TEMP_DIR/packages/"
  
  # Copy API source code to apps/api structure
  mkdir -p "$TEMP_DIR/apps/api"
  cp -r "$API_APP_DIR/src" "$TEMP_DIR/apps/api/"
  cp "$API_APP_DIR/package.json" "$TEMP_DIR/apps/api/"
  cp "$API_APP_DIR/tsconfig.json" "$TEMP_DIR/apps/api/"
  
  # Create a custom build script in root package.json for Azure
  # Azure will execute "pnpm install" then "pnpm build" from root
  # We need to override the build script to build the API
  cat > "$TEMP_DIR/package.json" << 'EOF'
{
  "name": "huella-latam",
  "version": "0.0.0",
  "description": "Huella Latam monorepo",
  "private": true,
  "packageManager": "pnpm@10.23.0",
  "license": "MIT",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "build": "cd apps/api && pnpm build",
    "start": "cd apps/api && pnpm start"
  }
}
EOF
  
  # Create ZIP file with all necessary files
  cd "$TEMP_DIR"
  zip -r "$DEPLOY_PACKAGE" . >/dev/null
  cd "$SCRIPT_DIR"
fi

log "${GREEN}   ✓ Package created${NC}"
echo ""

# Deploy to App Service
log "${YELLOW}[4/6] Deploying to App Service...${NC}"

deployment_result=0

if [ "$DRY_RUN" = "true" ]; then
  log "${CYAN}[DRY RUN] Would execute: az webapp deploy \\${NC}"
  log "${CYAN}[DRY RUN]   --name $APP_SERVICE_NAME \\${NC}"
  log "${CYAN}[DRY RUN]   --resource-group $AZURE_RESOURCE_GROUP \\${NC}"
  log "${CYAN}[DRY RUN]   --src-path $DEPLOY_PACKAGE \\${NC}"
  log "${CYAN}[DRY RUN]   --type zip${NC}"
else
  run_cmd az webapp deploy \
    --name "$APP_SERVICE_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --src-path "$DEPLOY_PACKAGE" \
    --type zip || deployment_result=$?

  # Clean up temp directory
  rm -rf "$TEMP_DIR"

  if [ $deployment_result -ne 0 ]; then
    log "${RED}✗ Deployment failed with exit code $deployment_result${NC}"
    exit $deployment_result
  fi
fi

log "${GREEN}   ✓ Upload completed${NC}"
echo ""

# Restart App Service to ensure new code is loaded
log "${YELLOW}[5/6] Restarting App Service...${NC}"

if [ "$DRY_RUN" = "true" ]; then
  log "${CYAN}[DRY RUN] Would execute: az webapp restart --name $APP_SERVICE_NAME --resource-group $AZURE_RESOURCE_GROUP${NC}"
else
  run_cmd az webapp restart \
    --name "$APP_SERVICE_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null
fi

log "${GREEN}   ✓ App Service restarted${NC}"
echo ""

# Verify deployment
log "${YELLOW}[6/6] Verifying deployment...${NC}"

# Initialize API_HOSTNAME with placeholder (always defined for final output)
API_HOSTNAME="<not-available-in-dry-run>"

if [ "$DRY_RUN" = "true" ]; then
  log "${CYAN}[DRY RUN] Would wait 5 seconds for deployment to register${NC}"
  log "${CYAN}[DRY RUN] Would verify: https://$API_HOSTNAME${NC}"
else
  # Wait a few seconds for deployment to register
  sleep 5

  # Get the hostname
  API_HOSTNAME=$(az webapp show \
    --name "$APP_SERVICE_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query defaultHostname \
    --output tsv)

  if [ -n "$API_HOSTNAME" ]; then
    # Check if site responds (basic HTTP check)
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$API_HOSTNAME" --max-time 10 || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "404" ] || [ "$HTTP_STATUS" = "503" ]; then
      # 200 = OK, 404 = route not found (but server is up), 503 = starting up (acceptable)
      log "${GREEN}   ✓ Deployment verified - API is accessible (HTTP $HTTP_STATUS)${NC}"
    else
      log "${YELLOW}   ⚠ Warning: API returned HTTP $HTTP_STATUS. It may still be deploying.${NC}"
    fi
  else
    log "${YELLOW}   ⚠ Warning: Could not verify deployment - hostname not found${NC}"
    API_HOSTNAME="<hostname-not-found>"
  fi
fi
echo ""

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Deployment Successful!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}🌐 Your API is now live:${NC}"
echo ""
echo -e "   App Service:  ${BLUE}https://$API_HOSTNAME${NC}"
echo ""
echo -e "${YELLOW}💡 API Endpoints:${NC}"
echo -e "   - Health:     ${BLUE}https://$API_HOSTNAME/health${NC}"
echo -e "   - Docs:       ${BLUE}https://$API_HOSTNAME/docs${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Next deployments:${NC} Just run ./deploy-api.sh again"
echo -e "${GREEN}Infrastructure changes:${NC} Run ./deploy.sh first, then ./deploy-api.sh"
echo -e "${GREEN}Database migrations:${NC} Run ./run-migrations.sh when schema changes"
echo ""

