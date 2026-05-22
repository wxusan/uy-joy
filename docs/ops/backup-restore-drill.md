# Quarterly Backup Restore Drill

Backups are not trusted until a restore has been tested.

## Cadence

- Run once per quarter.
- Rotate the selected client so the same easy instance is not always used.
- Restore into staging/test only. Never restore over production.

## Required Inputs

- client slug
- production database provider/project
- backup timestamp
- target staging/test database URL
- current production commit SHA
- operator name

## Drill Steps

1. Create or select an empty staging/test database.
2. Restore the selected backup into that database using the provider restore tool.
3. Point a temporary deployment or local env at the restored database.
4. Run:

```bash
npx prisma migrate status
SMOKE_SITE=https://restored-test-domain npm run smoke:client
SMOKE_SITE=https://restored-test-domain SMOKE_ADMIN_EMAIL=... SMOKE_ADMIN_PASSWORD=... npm run smoke:authenticated
```

5. Verify key records:
   - users exist
   - public page loads
   - leads load
   - deals/payments/documents load when enabled
   - reports load
6. Record restore start/end time and any manual fixes required.
7. Destroy the staging/test restore if it contains client data and is no longer needed.

## Drill Record Template

```md
Date:
Client slug:
Backup timestamp:
Restored to:
Operator:
Restore duration:
Commit tested:
Smoke result:
Data checks:
Problems found:
Follow-up:
```

