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

# Shared helpers (stack_output)
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

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

# 2) Check required non-sensitive variables
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
echo -e "${GREEN}Starting Web Application Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get the Static Web App details from the deployment
log "${YELLOW}[1/5] Fetching Static Web App details...${NC}"
STACK_NAME="undp-huella-latam-stack-$ENVIRONMENT"

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

# Get the hostname
SWA_HOSTNAME=$(az staticwebapp show \
  --name "$SWA_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query defaultHostname \
  --output tsv)

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

# Resolve API base URL (used by Vite build)
if [ -n "${VITE_API_BASE_URL:-}" ]; then
  log "${GREEN}   ✓ Using existing VITE_API_BASE_URL=${VITE_API_BASE_URL}${NC}"
else
  log "${YELLOW}[1b/5] Resolving API base URL from stack outputs...${NC}"
  API_URL=$(az stack group show \
    --name "$STACK_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query "outputs.api.value.appService.url" \
    --output tsv)

  if [ -z "$API_URL" ]; then
    log "${RED}Error: Could not resolve API URL from stack outputs. Ensure deploy.sh created the App Service and outputs are available.${NC}"
    exit 1
  fi

  # Ensure no trailing slash before appending /api
  VITE_API_BASE_URL="${API_URL%/}/api"
  export VITE_API_BASE_URL
  log "${GREEN}   ✓ VITE_API_BASE_URL set to ${VITE_API_BASE_URL}${NC}"
fi
echo ""


log "${YELLOW}[1c/5] Validating required VITE_ environment variables for Azure authentication...${NC}"
log "Using values from infra/.envrc:"

if [ -z "$AZURE_FRONT_CLIENT_ID" ] || [ -z "$AZURE_API_CLIENT_ID" ] || [ -z "$AZURE_AUTH_AUTHORITY" ] || [ -z "$AZURE_TENANT_ID" ]; then
  log "${RED}Error: Missing required AZURE_ environment variables for Azure authentication.${NC}"
  log "Please ensure the following are set in infra/.envrc:"
  log "  - AZURE_FRONT_CLIENT_ID=${AZURE_FRONT_CLIENT_ID:0:8}"
  log "  - AZURE_API_CLIENT_ID=${AZURE_API_CLIENT_ID:0:8}"
  log "  - AZURE_TENANT_ID=${AZURE_TENANT_ID:0:8}"
  log "  - AZURE_TENANT_TYPE=${AZURE_TENANT_TYPE:-external}"
  log "  - AZURE_AUTH_AUTHORITY=${AZURE_AUTH_AUTHORITY:0:30}"
  exit 1
fi

# For external (CIAM) tenants, the authority URL must contain the tenant subdomain
# (e.g. https://<subdomain>.ciamlogin.com/<tenant-id>/v2.0). Either set
# AZURE_AUTH_AUTHORITY directly in .envrc or provide AZURE_TENANT_SUBDOMAIN so
# the .envrc.template can construct it automatically.
if [ "${AZURE_TENANT_TYPE:-external}" = "external" ]; then
  if [[ "$AZURE_AUTH_AUTHORITY" == *".ciamlogin.com/"* ]]; then
    # Authority looks like a CIAM URL — verify it has a real subdomain (not empty)
    if [[ "$AZURE_AUTH_AUTHORITY" =~ ^https://\.ciamlogin\.com ]]; then
      log "${RED}Error: AZURE_AUTH_AUTHORITY has an empty subdomain for external (CIAM) tenant.${NC}"
      log "Set AZURE_TENANT_SUBDOMAIN in infra/.envrc or provide the full AZURE_AUTH_AUTHORITY."
      exit 1
    fi
  fi
fi

export VITE_AZURE_FRONT_CLIENT_ID=$AZURE_FRONT_CLIENT_ID
export VITE_AZURE_API_CLIENT_ID=$AZURE_API_CLIENT_ID
export VITE_AZURE_AUTH_AUTHORITY=$AZURE_AUTH_AUTHORITY

# Resolve frontend base URL (used by Vite build for redirect URIs, etc.):
#   1. FRONTEND_CUSTOM_DOMAIN env var — current intent, wins before a redeploy.
#   2. Stack output `allowedOrigin` — the exact origin bicep authorized for
#      CORS (App Service platform CORS + Fastify ALLOWED_ORIGIN + Storage CORS).
#   3. Static Web App default hostname — stack missing or predates the output.
# A manual VITE_FRONT_BASE_URL is intentionally ignored — if it disagreed with
# bicep's allowedOrigin, the browser would hit CORS errors.
if [ -n "${VITE_FRONT_BASE_URL:-}" ]; then
  log "${YELLOW}   ⚠ Ignoring VITE_FRONT_BASE_URL from environment (\$VITE_FRONT_BASE_URL=${VITE_FRONT_BASE_URL}); deriving from FRONTEND_CUSTOM_DOMAIN / stack instead.${NC}"
  unset VITE_FRONT_BASE_URL
fi

if [ -n "${FRONTEND_CUSTOM_DOMAIN:-}" ]; then
  export VITE_FRONT_BASE_URL="https://${FRONTEND_CUSTOM_DOMAIN}"
  log "${GREEN}   ✓ VITE_FRONT_BASE_URL resolved from FRONTEND_CUSTOM_DOMAIN env: ${VITE_FRONT_BASE_URL}${NC}"
else
  ALLOWED_ORIGIN_OUTPUT=$(stack_output allowedOrigin)
  if [ -n "$ALLOWED_ORIGIN_OUTPUT" ]; then
    export VITE_FRONT_BASE_URL="$ALLOWED_ORIGIN_OUTPUT"
    log "${GREEN}   ✓ VITE_FRONT_BASE_URL resolved from stack output allowedOrigin: ${VITE_FRONT_BASE_URL}${NC}"
  else
    export VITE_FRONT_BASE_URL="https://$SWA_HOSTNAME"
    log "${GREEN}   ✓ VITE_FRONT_BASE_URL resolved from Static Web App hostname: ${VITE_FRONT_BASE_URL}${NC}"
  fi
fi

export VITE_APP_VERSION="${APP_VERSION:-unknown}"
if [ -n "${VITE_IS_DEMO_APP:-}" ]; then
  export VITE_IS_DEMO_APP
fi

log "${GREEN}   ✓ All required VITE_ environment variables are set.${NC}"
log "  - VITE_AZURE_FRONT_CLIENT_ID=${VITE_AZURE_FRONT_CLIENT_ID:0:8}..."
log "  - VITE_AZURE_API_CLIENT_ID=${VITE_AZURE_API_CLIENT_ID:0:8}..."
log "  - VITE_AZURE_AUTH_AUTHORITY=${VITE_AZURE_AUTH_AUTHORITY:0:30}..."
log "  - VITE_FRONT_BASE_URL=${VITE_FRONT_BASE_URL}"
if [ -n "${VITE_IS_DEMO_APP:-}" ]; then
  log "  - VITE_IS_DEMO_APP=${VITE_IS_DEMO_APP}"
fi
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
log "${YELLOW}[3/6] Building web app...${NC}"
if [ "$DRY_RUN" = "true" ]; then
  log "${CYAN}[DRY RUN] Would execute: cd $WEB_APP_DIR${NC}"
  log "${CYAN}[DRY RUN] Would execute: pnpm install --frozen-lockfile --prefer-offline${NC}"
  log "${CYAN}[DRY RUN] Would execute: pnpm build${NC}"
  log "${CYAN}[DRY RUN] Would execute: cd $SCRIPT_DIR${NC}"
else
  cd "$WEB_APP_DIR"
  # Use frozen lockfile for consistent builds and prefer offline cache for speed
  pnpm install --frozen-lockfile --prefer-offline
  pnpm build
  cd "$SCRIPT_DIR"
fi

log "${GREEN}   ✓ Build completed${NC}"
echo ""

# Check if SWA CLI is installed
log "${YELLOW}[4/6] Checking SWA CLI...${NC}"

if [ "$DRY_RUN" = "true" ]; then
  # In dry run mode, just show what would be checked/installed
  if ! command -v swa &> /dev/null; then
    log "${CYAN}[DRY RUN] SWA CLI not found${NC}"
    log "${CYAN}[DRY RUN] Would execute: npm install -g @azure/static-web-apps-cli${NC}"
    log "${CYAN}[DRY RUN] Or fallback to: npx --yes @azure/static-web-apps-cli@2.0.7${NC}"
  else
    log "${CYAN}[DRY RUN] SWA CLI already installed${NC}"
  fi
  # Set a dummy command for dry run
  SWA_CMD="echo [DRY RUN] swa"
else
  # Normal execution - check and install if needed
  if ! command -v swa &> /dev/null; then
    log "${YELLOW}   → Installing SWA CLI...${NC}"
    # Try global install, fall back to npx if permissions fail
    if ! npm install -g @azure/static-web-apps-cli 2>/dev/null; then
      log "${YELLOW}   → Global install failed (permissions?), will use npx instead${NC}"
      SWA_CMD="npx --yes @azure/static-web-apps-cli@2.0.7"
    else
      SWA_CMD="swa"
    fi
  else
    SWA_CMD="swa"
  fi
fi

log "${GREEN}   ✓ SWA CLI ready${NC}"
echo ""

# Deploy using SWA CLI
log "${YELLOW}[5/6] Deploying to Static Web App...${NC}"

# Deploy to production environment from web app directory
cd "$WEB_APP_DIR"
deployment_result=0

if [ "$DRY_RUN" = "true" ]; then
  log "${CYAN}[DRY RUN] Would execute in: $WEB_APP_DIR${NC}"
  log "${CYAN}[DRY RUN] Would execute: swa deploy \\${NC}"
  log "${CYAN}[DRY RUN]   --deployment-token [REDACTED] \\${NC}"
  log "${CYAN}[DRY RUN]   --app-location . \\${NC}"
  log "${CYAN}[DRY RUN]   --output-location $OUTPUT_LOCATION \\${NC}"
  log "${CYAN}[DRY RUN]   --env production \\${NC}"
  log "${CYAN}[DRY RUN]   --no-use-keychain${NC}"
else
  run_cmd $SWA_CMD deploy \
    --deployment-token "$DEPLOYMENT_TOKEN" \
    --app-location . \
    --output-location "$OUTPUT_LOCATION" \
    --env production \
    --no-use-keychain || deployment_result=$?

  if [ $deployment_result -ne 0 ]; then
    log "${RED}✗ Deployment failed with exit code $deployment_result${NC}"
    cd "$SCRIPT_DIR"
    exit $deployment_result
  fi
fi

cd "$SCRIPT_DIR"

log "${GREEN}   ✓ Upload completed${NC}"
echo ""

log "${YELLOW}[6/6] Verifying deployment...${NC}"


if [ "$DRY_RUN" = "true" ]; then
# Initialize SWA_HOSTNAME with placeholder (always defined for final output)
  SWA_HOSTNAME="<not-available-in-dry-run>"
  log "${CYAN}[DRY RUN] Would wait 3 seconds for deployment to register${NC}"
  log "${CYAN}[DRY RUN] Would verify: https://$SWA_HOSTNAME${NC}"
else
  # Wait a few seconds for deployment to register
  sleep 3

  if [ -n "$SWA_HOSTNAME" ]; then
    # Check if site responds (basic HTTP check)
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$SWA_HOSTNAME" --max-time 10 || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "304" ]; then
      log "${GREEN}   ✓ Deployment verified - Site is accessible (HTTP $HTTP_STATUS)${NC}"
    else
      log "${YELLOW}   ⚠ Warning: Site returned HTTP $HTTP_STATUS. It may still be deploying.${NC}"
    fi
  else
    log "${YELLOW}   ⚠ Warning: Could not verify deployment - hostname not found${NC}"
    SWA_HOSTNAME="<hostname-not-found>"
  fi
fi
echo ""

# Check if Front Door is enabled
FRONTDOOR_ENDPOINT=$(stack_output frontDoorEndpoint)
FRONTEND_CUSTOM_DOMAIN_OUTPUT=$(stack_output frontendCustomDomain)

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Deployment Successful!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}🌐 Your application is now live:${NC}"
echo ""
echo -e "   Static Web App:  ${BLUE}https://$SWA_HOSTNAME${NC}"

if [ -n "$FRONTDOOR_ENDPOINT" ]; then
  echo -e "   Front Door CDN:  ${BLUE}https://$FRONTDOOR_ENDPOINT${NC}"

  if [ -n "$FRONTEND_CUSTOM_DOMAIN_OUTPUT" ]; then
    echo -e "   Custom Domain:   ${BLUE}https://$FRONTEND_CUSTOM_DOMAIN_OUTPUT${NC} ${GREEN}← Use this for production${NC}"
    echo ""
    echo -e "${YELLOW}💡 Custom domain configured! Make sure DNS records are set:${NC}"
    echo -e "   ${CYAN}TXT Record:${NC}   _dnsauth.$FRONTEND_CUSTOM_DOMAIN_OUTPUT → [validation-token]"
    echo -e "   ${CYAN}CNAME Record:${NC} $FRONTEND_CUSTOM_DOMAIN_OUTPUT → $FRONTDOOR_ENDPOINT"
    echo ""
    echo -e "${YELLOW}   SSL certificate will be provisioned automatically after DNS validation.${NC}"
  else
    echo ""
    echo -e "${YELLOW}💡 Tip: The Front Door URL provides global CDN, better performance,"
    echo -e "   and additional security features.${NC}"
  fi
elif [ -n "$FRONTEND_CUSTOM_DOMAIN_OUTPUT" ]; then
  echo -e "   Custom Domain:   ${BLUE}https://$FRONTEND_CUSTOM_DOMAIN_OUTPUT${NC} ${GREEN}← Use this for production${NC}"
  echo ""
  echo -e "${YELLOW}💡 Custom domain configured on Static Web App. Required DNS record:${NC}"
  echo -e "   ${CYAN}CNAME Record:${NC} $FRONTEND_CUSTOM_DOMAIN_OUTPUT → $SWA_HOSTNAME"
  echo ""
  echo -e "${YELLOW}   SSL certificate will be provisioned automatically after CNAME validation.${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Next deployments:${NC} Just run ./deploy-web.sh again"
echo -e "${GREEN}Infrastructure changes:${NC} Run ./deploy.sh first, then ./deploy-web.sh"
echo ""
