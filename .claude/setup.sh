#!/bin/bash
set -e
# setup.sh — run at start of any cloud session

if ! npm install -g @fission-ai/openspec@1.3.1; then
  echo "ERROR: Failed to install @fission-ai/openspec@1.3.1. Check your network connection and npm configuration." >&2
  exit 1
fi