#!/usr/bin/env bash
set -euo pipefail

RUNTIME="${CONTAINER_RUNTIME:-podman}"
IMAGE="nanoclaw-agent:latest"
WALTER_MCP_URL="${WALTER_MCP_URL:-host.containers.internal:8765}"
PLAYWRIGHT_MCP_URL="${PLAYWRIGHT_MCP_URL:-host.containers.internal:8766}"

EXTRA_ARGS=()
if [ "${DEV_MODE:-}" = "true" ]; then
  SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
  EXTRA_ARGS+=(-v "${SCRIPTS_DIR}/agent-runner/src:/workspace/agent-src:ro")
  EXTRA_ARGS+=("--entrypoint" "sh" "-c" "cd /workspace/agent-runner && cp -r /workspace/agent-src/* src/ && npx tsc --outDir /tmp/dist && node /tmp/dist/index.js < /tmp/input.json")
fi

# Write secrets to a temp env file — keeps them out of `ps aux` output
# Accept both WALTER_API_KEY and INTEGRA_API_KEY (transition)
_API_KEY="${WALTER_API_KEY:-${INTEGRA_API_KEY:-}}"
_SECRETS_FILE=$(mktemp)
chmod 600 "${_SECRETS_FILE}"
trap 'rm -f "${_SECRETS_FILE}"' EXIT
printf 'ANTHROPIC_API_KEY=%s\nWALTER_API_KEY=%s\nINTEGRA_API_KEY=%s\n' \
  "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY required}" "${_API_KEY}" "${_API_KEY}" > "${_SECRETS_FILE}"

exec $RUNTIME run -it --rm \
  --env-file "${_SECRETS_FILE}" \
  -e WALTER_MCP_URL="$WALTER_MCP_URL" \
  -e PLAYWRIGHT_MCP_URL="$PLAYWRIGHT_MCP_URL" \
  ${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"} \
  "$IMAGE"
