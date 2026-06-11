#!/usr/bin/env bash
# Shared helpers for the infra deploy scripts. STACK_NAME and
# AZURE_RESOURCE_GROUP are read at call time, so they only need to be set
# before the first helper call.

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

# Resolve the public frontend origin that every CORS layer must agree on:
#   1. FRONTEND_CUSTOM_DOMAIN env var — current intent, wins before a redeploy.
#   2. Stack output `allowedOrigin` — the exact origin bicep wrote to App
#      Service platform CORS and Blob Storage CORS (custom domain, Front Door
#      endpoint, or SWA default hostname, per bicep's own precedence).
# Sets RESOLVED_ORIGIN (empty when neither source is available) and
# RESOLVED_ORIGIN_SOURCE (human-readable label for the caller's logs). Warns on
# stderr when the env var diverges from the origin the stack authorized.
resolve_frontend_origin() {
  if [ -n "${FRONTEND_CUSTOM_DOMAIN:-}" ]; then
    RESOLVED_ORIGIN="https://${FRONTEND_CUSTOM_DOMAIN}"
    RESOLVED_ORIGIN_SOURCE="FRONTEND_CUSTOM_DOMAIN env"
    local stack_origin
    stack_origin=$(stack_output allowedOrigin)
    if [ "$stack_origin" != "$RESOLVED_ORIGIN" ]; then
      echo "Warning: stack output allowedOrigin (${stack_origin:-<missing>}) does not match FRONTEND_CUSTOM_DOMAIN." >&2
      echo "         The stack-managed CORS layers (App Service, Storage) still authorize the old origin — run ./deploy.sh to align them." >&2
    fi
  else
    RESOLVED_ORIGIN=$(stack_output allowedOrigin)
    RESOLVED_ORIGIN_SOURCE="stack output allowedOrigin"
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
