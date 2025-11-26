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

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .envrc ]; then
  source .envrc
else
  echo -e "${RED}Error: .envrc file not found${NC}"
  exit 1
fi

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

# Get the Static Web App name from the deployment
echo -e "${YELLOW}[1/5] Fetching Static Web App details...${NC}"
STACK_NAME="undp-huella-latam-stack-$APP_ENV"
SWA_NAME=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query outputs.staticWebAppName.value \
  --output tsv)

if [ -z "$SWA_NAME" ]; then
  echo -e "${RED}Error: Could not find Static Web App name. Make sure infrastructure is deployed.${NC}"
  exit 1
fi

echo -e "${GREEN}   ✓ Found: $SWA_NAME${NC}"
echo ""

# Get deployment token
echo -e "${YELLOW}[2/5] Getting deployment token...${NC}"
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
  --name "$SWA_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query properties.apiKey \
  --output tsv)

if [ -z "$DEPLOYMENT_TOKEN" ]; then
  echo -e "${RED}Error: Could not retrieve deployment token${NC}"
  exit 1
fi

echo -e "${GREEN}   ✓ Token retrieved${NC}"
echo ""

# Build the web app
echo -e "${YELLOW}[3/5] Building web app...${NC}"
cd ../apps/web
pnpm install
pnpm build

echo -e "${GREEN}   ✓ Build completed${NC}"
echo ""

# Check if SWA CLI is installed
echo -e "${YELLOW}[4/5] Checking SWA CLI...${NC}"
if ! command -v swa &> /dev/null; then
  echo -e "${YELLOW}   → Installing SWA CLI...${NC}"
  npm install -g @azure/static-web-apps-cli
fi
echo -e "${GREEN}   ✓ SWA CLI ready${NC}"
echo ""

# Deploy using SWA CLI
echo -e "${YELLOW}[5/5] Deploying to Static Web App...${NC}"

# Deploy to production environment
swa deploy \
  --deployment-token "$DEPLOYMENT_TOKEN" \
  --app-location . \
  --output-location dist \
  --env production \
  --no-use-keychain

echo -e "${GREEN}   ✓ Upload completed${NC}"
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

# Get custom domain if configured (only relevant when Front Door is disabled)
CUSTOM_DOMAIN=""

if [ -n "$CUSTOM_DOMAIN" ] && [ -z "$FRONTDOOR_ENDPOINT" ]; then
  CUSTOM_DOMAIN=$(az staticwebapp hostname list \
    --name "$SWA_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query "[0].name" \
    --output tsv 2>/dev/null || echo "")
fi

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
