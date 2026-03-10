#!/usr/bin/env bash
set -euo pipefail

RUNTIME="${CONTAINER_RUNTIME:-podman}"
IMAGE="nanoclaw-agent:latest"
INTEGRA_MCP_URL="${INTEGRA_MCP_URL:-host.containers.internal:8765}"

EXTRA_ARGS=()
if [ "${DEV_MODE:-}" = "true" ]; then
  SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
  EXTRA_ARGS+=(-v "${SCRIPTS_DIR}/agent-runner/src:/workspace/agent-src:ro")
  EXTRA_ARGS+=("--entrypoint" "sh" "-c" "cd /workspace/agent-runner && cp -r /workspace/agent-src/* src/ && npx tsc --outDir /tmp/dist && node /tmp/dist/index.js < /tmp/input.json")
fi

exec $RUNTIME run -it --rm \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY required}" \
  -e INTEGRA_MCP_URL="$INTEGRA_MCP_URL" \
  "${EXTRA_ARGS[@]}" \
  "$IMAGE"
