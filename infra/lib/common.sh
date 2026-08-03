#!/usr/bin/env bash
# Shared helpers for the infra deploy scripts. STACK_NAME and
# AZURE_RESOURCE_GROUP are read at call time, so they only need to be set
# before the first helper call.

# Validate that FRONTEND_CUSTOM_DOMAIN is a bare hostname (e.g. app.example.com).
# A scheme would produce origins like "https://https://…" across every CORS
# layer; a path or trailing slash breaks the OIDC redirect URI (a malformed
# "//auth/callback" — Entra rejects it as AADSTS50011; other IdPs return an
# equivalent redirect-URI-mismatch error). No-op when the variable is empty or unset.
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
#
# Both are read by the sourcing script (deploy-api.sh, deploy-web.sh), a use the
# linter cannot see from here — hence the SC2034 exemption below.
# shellcheck disable=SC2034
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

# Can the signed-in principal create role assignments in $AZURE_RESOURCE_GROUP?
#
# The role assignments in main.bicep are the only resources needing
# Microsoft.Authorization/roleAssignments/write, and Contributor does NOT include that action. ARM
# authorizes the *operation*, not the diff, so a Contributor-only operator fails the ENTIRE stack
# deploy even when every assignment already exists and the write would be an idempotent no-op (the
# names are deterministic guids). Detecting the permission lets the deploy skip exactly those
# resources instead of dying on them.
#
# Uses the Authorization permissions API, which returns the actions/notActions the CALLER holds at
# the scope. Because it is evaluated for the caller, roles inherited from a group or from a
# management group — and PIM roles already activated — are all included, with no need for the
# caller's object ID or for Graph (`az ad signed-in-user show` / `/me/getMemberGroups`), commonly
# blocked for guest and restricted accounts.
#
# Two alternatives were tried and rejected:
#   - checkAccess evaluates only the subject it is handed. With ObjectId alone it does NOT expand
#     group membership, so an operator whose Owner comes from a group — the common case here — is
#     reported NotAllowed, and the deploy would silently drop grants it was allowed to write.
#     Passing subject.attributes.Groups fixes that, at the cost of a Graph call for the memberships.
#   - ARM's own pre-flight (az deployment group validate) does not authorize role assignments at all:
#     it returns Succeeded for a template whose role assignment a later deploy would refuse.
#
# An entry grants the action when one of its actions matches it and none of its notActions does —
# RBAC's own rule. Patterns are globs, matched case-insensitively, so Contributor's notAction
# `Microsoft.Authorization/*/Write` correctly blocks `.../roleAssignments/write`.
#
# Returns 1 only when the API answered and no entry grants the action. Everything else returns 0 —
# that covers both "can write" and "could not determine" (API error, unparseable answer), which are
# deliberately conflated: never silently drop the grants, let ARM fail loudly instead. Deny
# assignments are not visible through this API, and can only err in that same direction.
# Read-only, so it is also safe under DRY_RUN; the resource group must already exist, which it does
# by the time this runs (the deploy creates it earlier).
# Requires AZURE_SUBSCRIPTION_ID and AZURE_RESOURCE_GROUP (read at call time).
can_write_role_assignments() {
  local action='Microsoft.Authorization/roleAssignments/write'
  local permissions granting

  permissions=$(az rest \
    --method get \
    --url "https://management.azure.com/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_RESOURCE_GROUP}/providers/Microsoft.Authorization/permissions?api-version=2022-04-01" \
    -o json 2>/dev/null || echo "")
  if [ -z "$permissions" ]; then
    return 0
  fi

  granting=$(printf '%s' "$permissions" | jq -r --arg a "$action" '
    def globmatch($pat; $s): $s | test("^" + ($pat | gsub("\\."; "\\.") | gsub("\\*"; ".*")) + "$"; "i");
    [ .value[]?
      | select(([.actions[]?    | select(globmatch(.; $a))] | length) > 0)
      | select(([.notActions[]? | select(globmatch(.; $a))] | length) == 0)
    ] | length' 2>/dev/null || echo "")
  if [ -z "$granting" ]; then
    return 0
  fi

  [ "$granting" != "0" ]
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
  #
  # Prefer the stack output, but fall back to listing the resource group: a failed stack operation
  # leaves the stack with NO outputs at all, which is not the same as "no SWA exists". Inferring
  # absence from a missing output blocks the redeploy precisely when one is needed most — right
  # after a failure.
  #
  # Caveat: the fallback takes the first SWA in the resource group, which is ambiguous if more than
  # one exists. The stack's own managed-resource list survives a failed operation and would identify
  # the right one unambiguously — worth switching to.
  local swa_host
  swa_host=$(stack_output staticWebAppHostname)
  if [ -z "$swa_host" ]; then
    swa_host=$(az staticwebapp list --resource-group "$AZURE_RESOURCE_GROUP" --query "[0].defaultHostname" -o tsv 2>/dev/null || echo "")
  fi
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
