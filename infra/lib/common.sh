#!/usr/bin/env bash
# Shared helpers for the infra deploy scripts. Source this file after defining
# SCRIPT_DIR; STACK_NAME and AZURE_RESOURCE_GROUP are read at call time, so
# they only need to be set before the first helper call.

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
