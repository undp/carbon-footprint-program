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

# Shared infra helpers
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Check for DNS query tools
DNS_TOOL=""
if command -v dig &> /dev/null; then
  DNS_TOOL="dig"
elif command -v nslookup &> /dev/null; then
  DNS_TOOL="nslookup"
elif command -v host &> /dev/null; then
  DNS_TOOL="host"
fi

# Check for jq binary (used to parse Azure CLI JSON output)
if ! command -v jq >/dev/null 2>&1; then
  echo -e "${RED}Error: 'jq' is required but was not found in PATH${NC}"
  echo ""
  echo -e "${YELLOW}Install jq:${NC}"
  echo -e "  - macOS: ${YELLOW}brew install jq${NC}"
  echo -e "  - Ubuntu/Debian: ${YELLOW}apt-get install -y jq${NC}"
  echo -e "  - RHEL/CentOS: ${YELLOW}yum install -y jq${NC}"
  echo ""
  exit 1
fi

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

if [ -z "$ENVIRONMENT" ]; then
  echo -e "${RED}Error: ENVIRONMENT is not set in .envrc${NC}"
  exit 1
fi

# Validate ENVIRONMENT format (must be lowercase)
if [[ "$ENVIRONMENT" =~ [A-Z] ]]; then
  echo -e "${RED}ERROR: ENVIRONMENT must be lowercase (got: $ENVIRONMENT)${NC}"
  echo -e "${YELLOW}Valid examples: production, staging, development${NC}"
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
STACK_NAME="undp-huella-latam-stack-$ENVIRONMENT"

# Try to get profile name from Bicep outputs (preferred method)
FRONT_DOOR_PROFILE=$(stack_output frontDoorProfileName)

# Fallback: Parse from resource IDs if output not available (for backward compatibility)
if [ -z "$FRONT_DOOR_PROFILE" ]; then
  FRONT_DOOR_PROFILE=$(az stack group show \
    --name "$STACK_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query "resources[?contains(id, '/providers/Microsoft.Cdn/profiles/')].id" -o json 2>/dev/null | \
    grep -o '/profiles/[^"]*' | head -1 | cut -d'/' -f3)
fi

if [ -z "$FRONT_DOOR_PROFILE" ]; then
  log "${RED}Error: Front Door profile not found. Make sure Front Door is enabled.${NC}"
  exit 1
fi

# Get custom domain name
CUSTOM_DOMAIN=$(stack_output frontendCustomDomain)

if [ -z "$CUSTOM_DOMAIN" ]; then
  log "${YELLOW}No custom domain configured in Front Door.${NC}"
  echo ""
  echo -e "${CYAN}To configure a custom domain:${NC}"
  echo -e "1. Set FRONTEND_CUSTOM_DOMAIN in .envrc"
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
if [ -n "$DNS_TOOL" ]; then
  log "${YELLOW}Verifying DNS configuration...${NC}"
  echo ""

  echo -e "${CYAN}TXT Record (_dnsauth):${NC}"
  TXT_RECORD=""
  case "$DNS_TOOL" in
    dig)
      TXT_RECORD=$(dig "_dnsauth.$CUSTOM_DOMAIN" TXT +short 2>/dev/null || echo "")
      ;;
    nslookup)
      # Windows-compatible nslookup parsing
      TXT_RECORD=$(nslookup -type=TXT "_dnsauth.$CUSTOM_DOMAIN" 2>/dev/null | grep -i "text" | grep -v "Non-authoritative" | tail -1 | sed 's/.*"\(.*\)".*/\1/' | tr -d '\r' || echo "")
      ;;
    host)
      TXT_RECORD=$(host -t TXT "_dnsauth.$CUSTOM_DOMAIN" 2>/dev/null | grep "descriptive text" | sed 's/.*descriptive text "\(.*\)"/\1/' || echo "")
      ;;
  esac
  
  if [ -n "$TXT_RECORD" ]; then
    echo -e "  ${GREEN}✓ $TXT_RECORD${NC}"
  else
    echo -e "  ${RED}✗ Not found${NC}"
  fi

  echo -e "${CYAN}CNAME Record:${NC}"
  CNAME_RECORD=""
  case "$DNS_TOOL" in
    dig)
      CNAME_RECORD=$(dig "$CUSTOM_DOMAIN" CNAME +short 2>/dev/null || echo "")
      ;;
    nslookup)
      # Windows-compatible nslookup parsing - handles both Unix and Windows line endings
      CNAME_RECORD=$(nslookup -type=CNAME "$CUSTOM_DOMAIN" 2>/dev/null | grep -i "canonical name" | awk '{print $NF}' | tr -d '\r' || echo "")
      ;;
    host)
      CNAME_RECORD=$(host -t CNAME "$CUSTOM_DOMAIN" 2>/dev/null | grep "is an alias" | awk '{print $NF}' || echo "")
      ;;
  esac
  
  if [ -n "$CNAME_RECORD" ]; then
    echo -e "  ${GREEN}✓ $CNAME_RECORD${NC}"
  else
    echo -e "  ${RED}✗ Not found${NC}"
  fi

  echo ""
  echo -e "${BLUE}───────────────────────────────────────────────────────────────${NC}"
  echo ""
else
  log "${YELLOW}⚠ DNS verification tools not found${NC}"
  echo ""
  echo -e "${CYAN}To enable DNS verification, install one of:${NC}"
  echo -e "  - ${YELLOW}Windows:${NC} nslookup should be available by default"
  echo -e "    If running in Git Bash/WSL, try: winget install -e --id BIND.BIND"
  echo -e "  - ${YELLOW}macOS:${NC} brew install bind"
  echo -e "  - ${YELLOW}Ubuntu/Debian:${NC} apt-get install dnsutils"
  echo -e "  - ${YELLOW}RHEL/CentOS:${NC} yum install bind-utils"
  echo ""
  echo -e "${CYAN}Continuing without DNS verification...${NC}"
  echo ""
  echo -e "${BLUE}───────────────────────────────────────────────────────────────${NC}"
  echo ""
fi

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

  # Ensure jq is available before attempting to parse STATUS_JSON
  if ! command -v jq >/dev/null 2>&1; then
    log "${RED}Error: 'jq' is required but not found in PATH. Parsing JSON is not possible.${NC}"
    echo ""
    echo -e "${YELLOW}Install jq:${NC}"
    echo -e "  - macOS: ${YELLOW}brew install jq${NC}"
    echo -e "  - Ubuntu/Debian: ${YELLOW}apt-get install -y jq${NC}"
    echo -e "  - RHEL/CentOS: ${YELLOW}yum install -y jq${NC}"
    echo ""
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
  
  # Check if SSL certificate deployment is complete
  SSL_READY=false
  if [ "$DEPLOYMENT_STATUS" != "InProgress" ] && [ "$VALIDATION_STATE" = "Approved" ] && [ "$PROVISIONING_STATE" = "Succeeded" ]; then
    SSL_READY=true
  fi
  
  # Test connectivity to custom domain
  SITE_STATUS="000"
  SITE_WORKING=false
  if [ "$SSL_READY" = true ]; then
    echo -e "${CYAN}Testing connectivity...${NC}"
    SITE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$CUSTOM_DOMAIN" --max-time 10 -k 2>/dev/null || echo "000")
    
    if [ "$SITE_STATUS" = "200" ] || [ "$SITE_STATUS" = "304" ]; then
      echo -e "  Custom Domain:  ${GREEN}✓ HTTP $SITE_STATUS - Site is live!${NC}"
      SITE_WORKING=true
    elif [ "$SITE_STATUS" = "404" ]; then
      echo -e "  Custom Domain:  ${YELLOW}⚠ HTTP $SITE_STATUS - Front Door route propagating...${NC}"
    else
      echo -e "  Custom Domain:  ${RED}✗ HTTP $SITE_STATUS${NC}"
    fi
    echo ""
  fi
  
  # Exit only when BOTH SSL is ready AND site is working
  if [ "$SSL_READY" = true ] && [ "$SITE_WORKING" = true ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ Custom Domain Fully Operational!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}🌐 Your application is live at:${NC}"
    echo ""
    echo -e "   ${BLUE}https://$CUSTOM_DOMAIN${NC} ${GREEN}(HTTP $SITE_STATUS)${NC}"
    echo ""
    echo -e "${CYAN}✓ SSL certificate is active and automatically managed${NC}"
    echo -e "${CYAN}✓ Front Door CDN is routing traffic correctly${NC}"
    echo -e "${CYAN}✓ Site is accessible worldwide${NC}"
    echo ""
    break
  elif [ "$SSL_READY" = true ] && [ "$SITE_WORKING" = false ]; then
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}⚠ SSL Ready, but site not yet accessible${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}SSL Certificate: ${GREEN}✓ Deployed${NC}"
    echo -e "${CYAN}Site Status:     ${YELLOW}⏳ Front Door route propagating (HTTP $SITE_STATUS)${NC}"
    echo ""
    echo -e "${YELLOW}The SSL certificate is ready, but Front Door is still propagating${NC}"
    echo -e "${YELLOW}the route configuration to edge servers worldwide.${NC}"
    echo ""
    echo -e "${CYAN}This can take 15-60 minutes after infrastructure changes.${NC}"
    echo -e "${CYAN}Continuing to monitor...${NC}"
    echo ""
    echo -e "${BLUE}Next check in 30 seconds... (Press Ctrl+C to exit)${NC}"
    sleep 30
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
  
  # Show progress indicator for SSL certificate
  if [ "$DEPLOYMENT_STATUS" = "InProgress" ]; then
    ELAPSED=$((ITERATION * 30))
    MINUTES=$((ELAPSED / 60))
    SECONDS=$((ELAPSED % 60))
    
    echo -e "${YELLOW}⏳ SSL certificate provisioning in progress...${NC}"
    echo -e "   Elapsed time: ${CYAN}${MINUTES}m ${SECONDS}s${NC}"
    echo ""
    echo -e "${CYAN}ℹ️  This typically takes 15-30 minutes${NC}"
    echo -e "   Azure is requesting the certificate from DigiCert"
    echo -e "   and deploying it globally to all edge locations."
    echo ""
    echo -e "${BLUE}Next check in 30 seconds... (Press Ctrl+C to exit)${NC}"
    
    sleep 30
  else
    # If SSL is ready but site not working, wait and check again
    if [ "$SSL_READY" = true ] && [ "$SITE_WORKING" = false ]; then
      # Already handled above with detailed message
      continue
    else
      log "${YELLOW}Waiting for status update...${NC}"
      sleep 30
    fi
  fi
done
