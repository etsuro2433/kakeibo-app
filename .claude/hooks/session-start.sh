#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install npm dependencies. Using `npm install` so cached node_modules can be
# reused across sessions; it is idempotent and non-interactive.
npm install --no-audit --no-fund --loglevel=error
