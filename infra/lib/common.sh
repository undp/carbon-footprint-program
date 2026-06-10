#!/usr/bin/env bash
# Shared helpers for the infra deploy scripts. Source this file after defining
# SCRIPT_DIR; STACK_NAME and AZURE_RESOURCE_GROUP are read at call time, so
# they only need to be set before the first helper call.

# Validate that FRONTEND_CUSTOM_DOMAIN is a bare hostname (e.g. app.example.com).
# A scheme would produce origins like "https://https://…" across every CORS
# layer; a path or trailing slash breaks the MSAL redirect URI
# ("//app/home" → AADSTS50011). No-op when the variable is empty or unset.
validate_frontend_custom_domain() {
  local domain="${FRONTEND_CUSTOM_DOMAIN:-}"
  if [ -z "$domain" ]; then
    return 0
  fi
  if [[ "$domain" =~ ^[A-Za-z]+:// ]]; then
    echo "ERROR: FRONTEND_CUSTOM_DOMAIN must not include a scheme (got: $domain)." >&2
    echo "       Use a bare hostname, e.g. FRONTEND_CUSTOM_DOMAIN=\"app.example.com\"." >&2
    exit 1
  fi
  if [[ "$domain" == */* ]]; then
    echo "ERROR: FRONTEND_CUSTOM_DOMAIN must be a bare hostname without path or trailing slash (got: $domain)." >&2
    echo "       Use e.g. FRONTEND_CUSTOM_DOMAIN=\"app.example.com\"." >&2
    exit 1
  fi
}

# Read a single deployment-stack output, normalizing a missing/null output to
# an empty string (az may emit the literal "null" for an absent value).
stack_output() {
  local value
  value=$(az stack group show \
    --name "$STACK_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query "outputs.$1.value" -o tsv 2>/dev/null || echo "")
  if [ "$value" = "null" ]; then
    value=""
  fi
  printf '%s' "$value"
}
