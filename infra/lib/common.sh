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

# True (returns 0) only when the bicep param file ($1) actively sets
# enableFrontDoor to true. Comment lines (//) and a missing file/param read as
# disabled, matching bicep's default of false.
front_door_enabled() {
  local param_file="$1"
  if [ ! -f "$param_file" ]; then
    return 1
  fi
  local match
  match=$(grep -E '^[[:space:]]*param[[:space:]]+enableFrontDoor[[:space:]]*=[[:space:]]*true([[:space:]]|$)' "$param_file" || echo "")
  [ -n "$match" ]
}

# Best-effort DNS resolution chain for $1 using whatever tool is present (dig,
# then host, then nslookup). Prints one entry per line — every CNAME hop, not
# just the first, so an intermediate CNAME in front of the real target still
# matches (dig also emits the terminal IPs; harmless for hostname comparison).
# Entries are lowercased with trailing dots stripped. Empty output when no tool
# is available or nothing resolves. Never fails the caller — DNS readiness is
# advisory, not a hard dependency.
dns_resolution_chain() {
  local domain="$1" out=""
  if command -v dig >/dev/null 2>&1; then
    out=$(dig +short "$domain" 2>/dev/null || echo "")
  elif command -v host >/dev/null 2>&1; then
    out=$(host "$domain" 2>/dev/null | awk '/is an alias for/ { print $NF }' || echo "")
  elif command -v nslookup >/dev/null 2>&1; then
    out=$(nslookup "$domain" 2>/dev/null | awk '/canonical name/ { print $NF }' || echo "")
  fi
  printf '%s\n' "$out" | sed 's/\.$//' | tr '[:upper:]' '[:lower:]'
}

# Preflight before binding FRONTEND_CUSTOM_DOMAIN to the Static Web App.
#
# bicep validates the SWA custom domain synchronously (cname-delegation), so on a
# real deploy a missing SWA (bootstrap) or an unresolved/wrong CNAME fails the
# ENTIRE stack deploy minutes in. This surfaces both in seconds, before az runs.
#
# Scope: SWA-direct path only. Front Door validates asynchronously
# (dns-txt-token), so this is a no-op when enableFrontDoor=true in the param
# file ($1).
#
# Two checks, with different severities:
#   1. SWA existence — deterministic (read from the stack, not DNS): the CNAME
#      target hostname is created by this stack, so if the SWA does not exist
#      yet the binding cannot possibly succeed. Hard error with bootstrap
#      guidance; downgraded to a warning under DRY_RUN so a dry run completes.
#   2. DNS resolution — advisory only. DNS is observed from this machine and
#      can lag or differ from what Azure's resolvers see (propagation,
#      intermediate CNAMEs, split-horizon), so a mismatch or empty result warns
#      and continues — Azure's own synchronous validation is the final gate.
#
# Requires STACK_NAME and AZURE_RESOURCE_GROUP (read at call time).
preflight_swa_custom_domain() {
  local param_file="$1"
  local domain="${FRONTEND_CUSTOM_DOMAIN:-}"
  if [ -z "$domain" ]; then
    return 0
  fi

  # Front Door owns the hostname and validates asynchronously — nothing to do.
  if front_door_enabled "$param_file"; then
    return 0
  fi

  local dry_run="${DRY_RUN:-false}"

  # 1) Is there a SWA to point a CNAME at yet?
  local swa_host
  swa_host=$(stack_output staticWebAppHostname)
  swa_host="${swa_host%.}"
  if [ -z "$swa_host" ]; then
    echo "ERROR: FRONTEND_CUSTOM_DOMAIN=\"$domain\" is set, but no Static Web App exists in the stack yet." >&2
    echo "       The CNAME target hostname is created by this deploy, so the domain cannot be bound on a first run." >&2
    echo "       Bootstrap: run once with FRONTEND_CUSTOM_DOMAIN=\"\" to create the SWA, then read its hostname:" >&2
    echo "         az stack group show --name \"$STACK_NAME\" --resource-group \"$AZURE_RESOURCE_GROUP\" --query outputs.staticWebAppHostname.value -o tsv" >&2
    echo "       Create a CNAME \"$domain\" -> <that hostname>, wait for propagation, then re-run with FRONTEND_CUSTOM_DOMAIN set." >&2
    if [ "$dry_run" = "true" ]; then
      echo "       [DRY RUN] continuing despite the above; a real deploy would abort here." >&2
      return 0
    fi
    exit 1
  fi

  # 2) Does the domain currently resolve through that hostname? Advisory only:
  #    DNS seen from this machine is not what Azure's resolvers see, so never
  #    block on it — a genuine mismatch will fail loudly at Azure's validation.
  local chain
  chain=$(dns_resolution_chain "$domain")
  if [ -z "$chain" ]; then
    echo "Warning: could not confirm a CNAME for \"$domain\" (no dig/host/nslookup, or none returned yet)." >&2
    echo "         Ensure \"$domain\" CNAMEs to \"$swa_host\" and has propagated, or this deploy will fail at custom-domain validation." >&2
    return 0
  fi
  if ! printf '%s\n' "$chain" | grep -qxF "$swa_host"; then
    echo "Warning: \"$domain\" does not currently resolve via \"$swa_host\" (observed: $(printf '%s' "$chain" | paste -sd' ' -))." >&2
    echo "         If Azure's resolvers see the same when the binding is validated, the whole stack deploy fails at custom-domain validation." >&2
    echo "         Verify with: dig +short \"$domain\" — the answer should include \"$swa_host\"." >&2
    return 0
  fi

  echo "Preflight OK: \"$domain\" resolves via the Static Web App hostname (\"$swa_host\")." >&2
}
