#!/bin/bash
# Clears stale git locks so the next commit/push works.
# Safe to run anytime when no real git process is active.
set -e
cd "$(dirname "$0")"
rm -f .git/index.lock .git/HEAD.lock .git/config.lock .git/packed-refs.lock .git/objects/maintenance.lock
find .git/objects -type f -name 'tmp_*' -delete 2>/dev/null || true
find .git/refs -type f -name '*.lock' -delete 2>/dev/null || true
echo "Git locks cleared."
