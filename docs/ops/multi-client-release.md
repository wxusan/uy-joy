# Multi-Client Release Process

Use this before operating 5-10 paying client instances or whenever one release touches multiple clients.

## Config

Copy `docs/release/clients.example.json` to a private local file:

```bash
cp docs/release/clients.example.json .release-clients.local.json
```

Then run:

```bash
RELEASE_CLIENTS_FILE=.release-clients.local.json npm run release:clients
```

Do not commit real client passwords or private deployment URLs.

## Optional Vercel Promotion

The release script can promote a READY production deployment before it runs smoke checks.

Per target, set:

- `promote: true`
- `vercelProjectId`
- `vercelTeamId` or `vercelTeamSlug` when the project is team-owned
- `vercelDeploymentId` for an explicit deployment, or `expectedCommit` to auto-pick the latest READY production deployment for that commit

Then run with a private token:

```bash
VERCEL_API_TOKEN=... RELEASE_CLIENTS_FILE=.release-clients.local.json npm run release:clients
```

For emergency dry runs, leave `promote` false and the script remains a smoke gate only.

## Release Rules

- Deploy one pilot instance first.
- Run smoke checks.
- If the pilot fails, stop.
- Roll out remaining clients only after pilot is clean.
- Pause on the first failing client.
- Record client slug, deployed commit, deploy URL, smoke result, and rollback target.

## Required Checks Per Client

- public page 200
- admin login 200
- `/api/leads` protected
- `/api/upload` protected
- authenticated dashboard/settings/report checks when credentials are configured
- feature flags match the sold package
