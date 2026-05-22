#!/bin/bash
# Full commit + push for the v2 launch.
# Run from anywhere: sh /Users/xusan/Projects/uy-joy/push-to-github.sh
set -e
cd /Users/xusan/Projects/uy-joy

# 1. Clear any stale git locks
rm -f .git/index.lock .git/HEAD.lock .git/config.lock .git/packed-refs.lock .git/objects/maintenance.lock
find .git/objects -type f -name 'tmp_*' -delete 2>/dev/null || true
find .git/refs -type f -name '*.lock' -delete 2>/dev/null || true

# 2. Show status
echo "--- git status (before) ---"
git status --short | head -30
echo

# 3. Stage everything (respecting .gitignore)
git add -A

# 4. Commit
git commit -m "feat: launch v2 — CRM, reports, public page, settings, demo polish

- Add full CRM core (deals, leads, tasks, agents, pipeline, sources, documents, reports)
- Add real-estate inventory layer + public page + lead bot
- Add reports & dashboards (sales, agents, inventory, marketing, finance, my, digest)
- Add platform settings, integrations, embed lead-form, health & analytics APIs
- Migrations: building completion year, CRM core, real estate, public page lead bot, ad spend, analytics event mirror, platform settings digest preferences
- Add docs (CRM platform, ops, release, sales)
- Telegram demo check, smoke clients, demo reset, first-admin scripts
- i18n: en/ru/uz updates for apartments & new portal sections
- Misc UI/security polish across portal, public site, middleware"

# 5. Push to origin
echo
echo "--- pushing to origin/main ---"
git push origin main

echo
echo "✅ DONE — commit pushed."
git log --oneline -3
