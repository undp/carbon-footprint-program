#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════
# Run Database Migrations
# ═══════════════════════════════════════════════════════════════════════
#
# PURPOSE:
# This script runs Prisma migrations against the Azure PostgreSQL database
# It assumes the infrastructure is already deployed and the database is accessible
#
# USAGE:
#   cd infra
#   ./run-migrations.sh
#
# ═══════════════════════════════════════════════════════════════════════

# Get script directory for reliable paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATABASE_PACKAGE_DIR="$PROJECT_ROOT/packages/database"

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

# Load environment variables from infra directory
if [ -f "$SCRIPT_DIR/.envrc" ]; then
  source "$SCRIPT_DIR/.envrc"
else
  echo -e "${RED}Error: .envrc file not found in $SCRIPT_DIR${NC}"
  exit 1
fi

# Check required tools
log "${YELLOW}Checking prerequisites...${NC}"

for cmd in az pnpm; do
  if ! command -v $cmd &> /dev/null; then
    log "${RED}Error: $cmd is not installed${NC}"
    case $cmd in
      az)
        log "${YELLOW}Install Azure CLI: https://learn.microsoft.com/cli/azure/install-azure-cli${NC}"
        ;;
      pnpm)
        log "${YELLOW}Install pnpm: npm install -g pnpm${NC}"
        ;;
    esac
    exit 1
  fi
done

log "${GREEN}   ✓ All prerequisites met${NC}"
echo ""

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

# Check required environment variables
: "${AZURE_RESOURCE_GROUP:?AZURE_RESOURCE_GROUP is required}"
: "${ENVIRONMENT:?ENVIRONMENT is required}"

# Validate ENVIRONMENT format (must be lowercase)
if [[ "$ENVIRONMENT" =~ [A-Z] ]]; then
  log "${RED}ERROR: ENVIRONMENT must be lowercase (got: $ENVIRONMENT)${NC}"
  log "${YELLOW}Valid examples: production, staging, development${NC}"
  exit 1
fi

log "Environment: $ENVIRONMENT"
log "Resource Group: $AZURE_RESOURCE_GROUP"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Starting Database Migrations${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get database connection info from deployment stack
log "${YELLOW}[1/4] Fetching database connection information...${NC}"
STACK_NAME="undp-huella-latam-stack-$ENVIRONMENT"

DB_HOST=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query outputs.database.value.host \
  --output tsv 2>/dev/null || echo "")

DB_NAME=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query outputs.database.value.databaseName \
  --output tsv 2>/dev/null || echo "")

DB_USER=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query outputs.database.value.username \
  --output tsv 2>/dev/null || echo "")

if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
  log "${RED}Error: Could not retrieve database information from deployment stack.${NC}"
  log "${YELLOW}Make sure infrastructure is deployed by running ./deploy.sh first.${NC}"
  exit 1
fi

log "${GREEN}   ✓ Database host: $DB_HOST${NC}"
log "${GREEN}   ✓ Database name: $DB_NAME${NC}"
log "${GREEN}   ✓ Database user: $DB_USER${NC}"
echo ""

# Get database password from Key Vault
log "${YELLOW}[2/4] Retrieving database password from Key Vault...${NC}"

KEY_VAULT_NAME=$(az stack group show \
  --name "$STACK_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query outputs.infrastructure.value.keyVault.name \
  --output tsv 2>/dev/null || echo "")

if [ -z "$KEY_VAULT_NAME" ]; then
  log "${RED}Error: Could not find Key Vault name. Make sure infrastructure is deployed.${NC}"
  exit 1
fi

DB_PASSWORD=$(az keyvault secret show \
  --vault-name "$KEY_VAULT_NAME" \
  --name "postgres-admin-password" \
  --query value \
  --output tsv 2>/dev/null || echo "")

if [ -z "$DB_PASSWORD" ]; then
  log "${RED}Error: Could not retrieve database password from Key Vault.${NC}"
  exit 1
fi

log "${GREEN}   ✓ Password retrieved${NC}"
echo ""

# Build DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?sslmode=require"

# Test database connection
log "${YELLOW}[3/4] Testing database connection...${NC}"

if [ "$DRY_RUN" = "true" ]; then
  log "${CYAN}[DRY RUN] Would test connection to: ${DB_HOST}:5432${NC}"
else
  # Use psql if available, otherwise skip test
  if command -v psql &> /dev/null; then
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
      log "${GREEN}   ✓ Database connection successful${NC}"
    else
      log "${YELLOW}   ⚠ Warning: Could not verify database connection (psql test failed)${NC}"
      log "${YELLOW}   Continuing anyway - migration command will show actual errors if any${NC}"
    fi
  else
    log "${YELLOW}   ⚠ psql not found - skipping connection test${NC}"
    log "${YELLOW}   Continuing with migration...${NC}"
  fi
fi
echo ""

# Run migrations
log "${YELLOW}[4/4] Running database migrations...${NC}"

if [ "$DRY_RUN" = "true" ]; then
  log "${CYAN}[DRY RUN] Would execute: cd $DATABASE_PACKAGE_DIR${NC}"
  log "${CYAN}[DRY RUN] Would execute: DATABASE_URL=[REDACTED] pnpm prod:deploy${NC}"
  log "${CYAN}[DRY RUN] Would execute: cd $SCRIPT_DIR${NC}"
else
  cd "$DATABASE_PACKAGE_DIR"
  
  # Export DATABASE_URL and run migrations
  export DATABASE_URL
  migration_result=0
  
  pnpm prod:deploy || migration_result=$?
  
  cd "$SCRIPT_DIR"
  
  if [ $migration_result -ne 0 ]; then
    log "${RED}✗ Migration failed with exit code $migration_result${NC}"
    exit $migration_result
  fi
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Migrations Completed Successfully!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Database:${NC} $DB_NAME on $DB_HOST"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  - Verify migrations: Check your database schema"
echo -e "  - Deploy API: Run ./deploy-api.sh to deploy updated API code"
echo ""

