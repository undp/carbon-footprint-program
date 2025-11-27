#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════
# Monitor SSL Certificate Deployment for Front Door Custom Domain
# ═══════════════════════════════════════════════════════════════════════
#
# PURPOSE:
# This script monitors the SSL certificate provisioning status for a
# custom domain in Azure Front Door. It continuously checks the deployment
# status until the certificate is fully deployed.
#
# USAGE:
# ./monitor-ssl.sh
#
# WHAT IT CHECKS:
# - Deployment status (InProgress → NotStarted/complete)
# - Domain validation state (should be Approved)
# - Provisioning state (should be Succeeded)
# - TLS/SSL certificate configuration
#
# ═══════════════════════════════════════════════════════════════════════

set -e

# Get script directory for reliable paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f "$SCRIPT_DIR/.envrc" ]; then
  source "$SCRIPT_DIR/.envrc"
else
  echo -e "${RED}Error: .envrc file not found in $SCRIPT_DIR${NC}"
  exit 1
fi

# Check required variables
if [ -z "$AZURE_RESOURCE_GROUP" ]; then
  echo -e "${RED}Error: AZURE_RESOURCE_GROUP is not set in .envrc${NC}"
  exit 1
fi

if [ -z "$APP_ENV" ]; then
  echo -e "${RED}Error: APP_ENV is not set in .envrc${NC}"
  exit 1
fi

# Function to log with timestamp
log() {
  echo -e "[$(date +'%H:%M:%S')] $*"
}

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}SSL Certificate Deployment Monitor${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get Front Door profile name
log "${YELLOW}Getting Front Door configuration...${NC}"
STACK_NAME="undp-huella-latam-stack-$APP_ENV"

FRONT_DOOR_PROFILE=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "resources[?contains(id, '/providers/Microsoft.Cdn/profiles/')].id" -o tsv | head -1 | cut -d'/' -f9)

if [ -z "$FRONT_DOOR_PROFILE" ]; then
  log "${RED}Error: Front Door profile not found. Make sure Front Door is enabled.${NC}"
  exit 1
fi

# Get custom domain name
CUSTOM_DOMAIN=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "outputs.frontDoorCustomDomain.value" -o tsv)

if [ -z "$CUSTOM_DOMAIN" ] || [ "$CUSTOM_DOMAIN" = "null" ]; then
  log "${YELLOW}No custom domain configured in Front Door.${NC}"
  echo ""
  echo -e "${CYAN}To configure a custom domain:${NC}"
  echo -e "1. Set FRONT_DOOR_CUSTOM_DOMAIN in .envrc"
  echo -e "2. Run ./deploy.sh"
  echo ""
  exit 0
fi

# Convert domain to resource name format (dots to dashes)
CUSTOM_DOMAIN_NAME=$(echo "$CUSTOM_DOMAIN" | tr '.' '-')

log "${GREEN}✓ Front Door Profile: $FRONT_DOOR_PROFILE${NC}"
log "${GREEN}✓ Custom Domain: $CUSTOM_DOMAIN${NC}"
echo ""

# Initial DNS check
log "${YELLOW}Verifying DNS configuration...${NC}"
echo ""

echo -e "${CYAN}TXT Record (_dnsauth):${NC}"
TXT_RECORD=$(dig "_dnsauth.$CUSTOM_DOMAIN" TXT +short 2>/dev/null || echo "")
if [ -n "$TXT_RECORD" ]; then
  echo -e "  ${GREEN}✓ $TXT_RECORD${NC}"
else
  echo -e "  ${RED}✗ Not found${NC}"
fi

echo -e "${CYAN}CNAME Record:${NC}"
CNAME_RECORD=$(dig "$CUSTOM_DOMAIN" CNAME +short 2>/dev/null || echo "")
if [ -n "$CNAME_RECORD" ]; then
  echo -e "  ${GREEN}✓ $CNAME_RECORD${NC}"
else
  echo -e "  ${RED}✗ Not found${NC}"
fi

echo ""
echo -e "${BLUE}───────────────────────────────────────────────────────────────${NC}"
echo ""

# Monitoring loop
ITERATION=0
LAST_STATUS=""

while true; do
  ITERATION=$((ITERATION + 1))
  
  # Get current status
  STATUS_JSON=$(az afd custom-domain show \
    --profile-name "$FRONT_DOOR_PROFILE" \
    --custom-domain-name "$CUSTOM_DOMAIN_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    -o json 2>/dev/null)
  
  if [ -z "$STATUS_JSON" ]; then
    log "${RED}Error: Could not retrieve custom domain status${NC}"
    exit 1
  fi
  
  DEPLOYMENT_STATUS=$(echo "$STATUS_JSON" | jq -r '.deploymentStatus // "NotStarted"')
  VALIDATION_STATE=$(echo "$STATUS_JSON" | jq -r '.domainValidationState')
  PROVISIONING_STATE=$(echo "$STATUS_JSON" | jq -r '.provisioningState')
  CERT_TYPE=$(echo "$STATUS_JSON" | jq -r '.tlsSettings.certificateType')
  TLS_VERSION=$(echo "$STATUS_JSON" | jq -r '.tlsSettings.minimumTlsVersion')
  
  # Clear screen on subsequent iterations
  if [ $ITERATION -gt 1 ]; then
    clear
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}SSL Certificate Deployment Monitor${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    log "${GREEN}Front Door Profile: $FRONT_DOOR_PROFILE${NC}"
    log "${GREEN}Custom Domain: $CUSTOM_DOMAIN${NC}"
    echo ""
    echo -e "${BLUE}───────────────────────────────────────────────────────────────${NC}"
    echo ""
  fi
  
  # Display status
  log "${CYAN}Current Status:${NC}"
  echo ""
  
  # Deployment Status
  if [ "$DEPLOYMENT_STATUS" = "InProgress" ]; then
    echo -e "  Deployment:    ${YELLOW}⏳ In Progress${NC}"
  elif [ "$DEPLOYMENT_STATUS" = "NotStarted" ]; then
    echo -e "  Deployment:    ${GREEN}✓ Completed${NC}"
  else
    echo -e "  Deployment:    ${MAGENTA}$DEPLOYMENT_STATUS${NC}"
  fi
  
  # Validation State
  if [ "$VALIDATION_STATE" = "Approved" ]; then
    echo -e "  Validation:    ${GREEN}✓ Approved${NC}"
  elif [ "$VALIDATION_STATE" = "Pending" ]; then
    echo -e "  Validation:    ${YELLOW}⏳ Pending${NC}"
  elif [ "$VALIDATION_STATE" = "Rejected" ]; then
    echo -e "  Validation:    ${RED}✗ Rejected${NC}"
  else
    echo -e "  Validation:    ${MAGENTA}$VALIDATION_STATE${NC}"
  fi
  
  # Provisioning State
  if [ "$PROVISIONING_STATE" = "Succeeded" ]; then
    echo -e "  Provisioning:  ${GREEN}✓ Succeeded${NC}"
  elif [ "$PROVISIONING_STATE" = "Failed" ]; then
    echo -e "  Provisioning:  ${RED}✗ Failed${NC}"
  else
    echo -e "  Provisioning:  ${YELLOW}$PROVISIONING_STATE${NC}"
  fi
  
  # Certificate Info
  echo -e "  Certificate:   ${CYAN}$CERT_TYPE${NC}"
  echo -e "  TLS Version:   ${CYAN}$TLS_VERSION${NC}"
  
  echo ""
  
  # Check if deployment is complete
  if [ "$DEPLOYMENT_STATUS" != "InProgress" ] && [ "$VALIDATION_STATE" = "Approved" ] && [ "$PROVISIONING_STATE" = "Succeeded" ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ SSL Certificate Deployment Complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}🌐 Your custom domain is now live with HTTPS:${NC}"
    echo ""
    echo -e "   ${BLUE}https://$CUSTOM_DOMAIN${NC}"
    echo ""
    echo -e "${CYAN}The certificate is automatically managed and will renew before expiration.${NC}"
    echo ""
    break
  fi
  
  # Check if there's an error
  if [ "$VALIDATION_STATE" = "Rejected" ] || [ "$PROVISIONING_STATE" = "Failed" ]; then
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}✗ Deployment Failed${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting steps:${NC}"
    echo -e "1. Verify DNS records are correctly configured"
    echo -e "2. Check Azure Portal for detailed error messages"
    echo -e "3. Review documentation: docs/Infra/StaticWebAppDeployment.md"
    echo ""
    exit 1
  fi
  
  # Show progress indicator
  if [ "$DEPLOYMENT_STATUS" = "InProgress" ]; then
    ELAPSED=$((ITERATION * 30))
    MINUTES=$((ELAPSED / 60))
    SECONDS=$((ELAPSED % 60))
    
    echo -e "${YELLOW}⏳ Certificate provisioning in progress...${NC}"
    echo -e "   Elapsed time: ${CYAN}${MINUTES}m ${SECONDS}s${NC}"
    echo ""
    echo -e "${CYAN}ℹ️  This typically takes 15-30 minutes${NC}"
    echo -e "   Azure is requesting the certificate from DigiCert"
    echo -e "   and deploying it globally to all edge locations."
    echo ""
    echo -e "${BLUE}Next check in 30 seconds... (Press Ctrl+C to exit)${NC}"
    
    sleep 30
  else
    # If not in progress but not complete, wait a bit and check again
    log "${YELLOW}Waiting for status update...${NC}"
    sleep 30
  fi
done
