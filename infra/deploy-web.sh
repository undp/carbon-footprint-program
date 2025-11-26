#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════
# Deploy Web Application to Azure Static Web Apps
# ═══════════════════════════════════════════════════════════════════════
#
# PURPOSE:
# This script handles the APPLICATION deployment (Step 2 of 2)
# It builds and uploads your React/Vite app to the Static Web App
# infrastructure that was created by deploy.sh
#
# WHY TWO SCRIPTS?
# 
# 1. deploy.sh (Infrastructure) - Run ONCE or when infrastructure changes
#    - Creates Azure resources (Static Web App, Front Door, etc.)
#    - Manages secrets and permissions
#    - Slow but stable (takes 5-10 minutes)
#
# 2. deploy-web.sh (Application) - Run EVERY TIME you update your code
#    - Builds and deploys only the app code
#    - Fast iterations (takes 1-2 minutes)
#    - No infrastructure changes
#
# WORKFLOW:
# Infrastructure changes? → Run deploy.sh
# Code changes?          → Run deploy-web.sh
#
# ═══════════════════════════════════════════════════════════════════════

set -e

# Get script directory for reliable paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WEB_APP_DIR="$PROJECT_ROOT/apps/web"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with timestamp
log() {
  echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Check if logged in to Azure CLI
log "${YELLOW}Checking Azure CLI login...${NC}"
if ! az account show >/dev/null 2>&1; then
  log "${RED}Not logged in to Azure CLI. Please log in.${NC}"
  az login
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

# Check required variables
if [ -z "$AZURE_RESOURCE_GROUP" ]; then
  echo -e "${RED}Error: AZURE_RESOURCE_GROUP is not set in .envrc${NC}"
  exit 1
fi

if [ -z "$DEVELOPER_NAME" ]; then
  echo -e "${RED}Error: DEVELOPER_NAME is not set in .envrc${NC}"
  exit 1
fi

if [ -z "$APP_ENV" ]; then
  echo -e "${RED}Error: APP_ENV is not set in .envrc${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Starting Web Application Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get the Static Web App details from the deployment
log "${YELLOW}[1/5] Fetching Static Web App details...${NC}"
STACK_NAME="undp-huella-latam-stack-$APP_ENV"

# Get Static Web App name
SWA_NAME=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query outputs.staticWebAppName.value \
  --output tsv)

if [ -z "$SWA_NAME" ]; then
  log "${RED}Error: Could not find Static Web App name. Make sure infrastructure is deployed.${NC}"
  exit 1
fi

# Get app and output locations from deployment (to match infrastructure config)
APP_LOCATION=$(az staticwebapp show \
  --name "$SWA_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query properties.buildProperties.appLocation \
  --output tsv)

OUTPUT_LOCATION=$(az staticwebapp show \
  --name "$SWA_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query properties.buildProperties.outputLocation \
  --output tsv)

# Fallback to defaults if not set
APP_LOCATION=${APP_LOCATION:-'/apps/web'}
OUTPUT_LOCATION=${OUTPUT_LOCATION:-'dist'}

log "${GREEN}   ✓ Found: $SWA_NAME${NC}"
log "${GREEN}   ✓ App location: $APP_LOCATION${NC}"
log "${GREEN}   ✓ Output location: $OUTPUT_LOCATION${NC}"
echo ""

# Get deployment token
log "${YELLOW}[2/5] Getting deployment token...${NC}"
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
  --name "$SWA_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query properties.apiKey \
  --output tsv)

if [ -z "$DEPLOYMENT_TOKEN" ]; then
  log "${RED}Error: Could not retrieve deployment token${NC}"
  exit 1
fi

log "${GREEN}   ✓ Token retrieved${NC}"
echo ""

# Build the web app
log "${YELLOW}[3/5] Building web app...${NC}"
cd "$WEB_APP_DIR"
pnpm install
pnpm build
cd "$SCRIPT_DIR"

log "${GREEN}   ✓ Build completed${NC}"
echo ""

# Check if SWA CLI is installed
log "${YELLOW}[4/5] Checking SWA CLI...${NC}"
if ! command -v swa &> /dev/null; then
  log "${YELLOW}   → Installing SWA CLI...${NC}"
  npm install -g @azure/static-web-apps-cli
fi
log "${GREEN}   ✓ SWA CLI ready${NC}"
echo ""

# Deploy using SWA CLI
log "${YELLOW}[5/5] Deploying to Static Web App...${NC}"

# Deploy to production environment from web app directory
cd "$WEB_APP_DIR"
swa deploy \
  --deployment-token "$DEPLOYMENT_TOKEN" \
  --app-location . \
  --output-location "$OUTPUT_LOCATION" \
  --env production \
  --no-use-keychain
cd "$SCRIPT_DIR"

log "${GREEN}   ✓ Upload completed${NC}"
echo ""

# Get the hostname
SWA_HOSTNAME=$(az staticwebapp show \
  --name "$SWA_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query defaultHostname \
  --output tsv)

# Check if Front Door is enabled
FRONTDOOR_ENDPOINT=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query outputs.frontDoorEndpoint.value \
  --output tsv 2>/dev/null || echo "")

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Deployment Successful!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}🌐 Your application is now live:${NC}"
echo ""
echo -e "   Static Web App:  ${BLUE}https://$SWA_HOSTNAME${NC}"

if [ -n "$FRONTDOOR_ENDPOINT" ]; then
  echo -e "   Front Door CDN:  ${BLUE}https://$FRONTDOOR_ENDPOINT${NC} ${GREEN}← Use this for production${NC}"
  echo ""
  echo -e "${YELLOW}💡 Tip: The Front Door URL provides global CDN, better performance,"
  echo -e "   and additional security features.${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Next deployments:${NC} Just run ./deploy-web.sh again"
echo -e "${GREEN}Infrastructure changes:${NC} Run ./deploy.sh first, then ./deploy-web.sh"
echo ""
