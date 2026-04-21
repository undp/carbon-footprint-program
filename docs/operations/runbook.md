# Operations Runbook

This document defines procedures for common operational tasks: backup, restore, rollback, and incident management.

> **Note:** These procedures should be reviewed, validated, and adapted by the team operating each country deployment. Some procedures require manual testing before a real incident occurs.

---

## Backup

### Database Backup

Azure PostgreSQL Flexible Server performs **automated backups** by default.

**Backup configuration (set via Bicep parameters):**

| Parameter | Development | Staging | Production (recommended) |
|---|---|---|---|
| `dbBackupRetentionDays` | 7 days (minimum) | 14 days | 30 days |
| `dbGeoRedundantBackup` | Disabled | Disabled | **Enabled** |

**What is backed up:**
- Full database backup: weekly
- Differential backup: daily
- Transaction log backup: every 5–10 minutes (enables point-in-time restore)

**Verify backup status:**
```bash
az postgres flexible-server show \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<server-name>" \
  --query "backup"
```

**Manual on-demand backup** (in addition to automated):
```bash
az postgres flexible-server backup create \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<server-name>" \
  --backup-name "manual-$(date +%Y%m%d)"
```

### File Storage Backup

Azure Blob Storage with **geo-redundant storage (GRS)** automatically replicates data to a secondary region. For production:

- Use `Standard_GRS` or `Standard_RAGRS` SKU
- Enable **soft delete** for blobs (protects against accidental deletion):
  ```bash
  az storage blob service-properties delete-policy update \
    --account-name "<storage-account>" \
    --enable true \
    --days-retained 30
  ```

### Application Configuration Backup

- All infrastructure is defined as code in `infra/`. The code itself is the backup.
- Secrets (DB passwords, etc.) are stored in **Azure Key Vault** with soft delete enabled (90-day retention).
- Environment variables (non-secret) should be documented and stored securely.

---

## Restore

### Database Point-in-Time Restore

Restore the database to any point within the backup retention window:

```bash
# Restore to a specific point in time
az postgres flexible-server restore \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<new-server-name>" \
  --source-server "<original-server-name>" \
  --restore-time "2026-01-15T10:00:00Z"
```

**Important:** Restore creates a **new server**. You must:
1. Update the `DATABASE_URL` in the App Service configuration to point to the new server
2. Verify the restored data is correct
3. Optionally delete the old server (or keep it for comparison)

### Restore from Specific Backup

```bash
az postgres flexible-server restore \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<new-server-name>" \
  --source-server "<original-server-name>" \
  --backup-name "manual-20260115"
```

### Blob Storage Restore (Soft Delete)

If a file was accidentally deleted and soft delete is enabled:
```bash
# List deleted blobs
az storage blob list \
  --account-name "<storage-account>" \
  --container-name "files" \
  --include d \
  --output table

# Undelete a specific blob
az storage blob undelete \
  --account-name "<storage-account>" \
  --container-name "files" \
  --name "<blob-path>"
```

---

## Rollback

### API Rollback

The API is deployed as a Docker image. To roll back to a previous version:

1. **Identify the previous image tag** (check ACR or deployment history):
   ```bash
   az acr repository show-tags \
     --name "<acr-name>" \
     --repository api \
     --orderby time_desc \
     --output table
   ```

2. **Update the App Service to use the previous image:**
   ```bash
   az webapp config container set \
     --resource-group "$AZURE_RESOURCE_GROUP" \
     --name "<app-service-name>" \
     --container-image-name "<acr-login-server>/api:<previous-tag>"
   ```

3. **Restart the App Service:**
   ```bash
   az webapp restart \
     --resource-group "$AZURE_RESOURCE_GROUP" \
     --name "<app-service-name>"
   ```

> **Recommendation:** Always tag images with a Git commit SHA (`IMAGE_TAG=$(git rev-parse --short HEAD)`) so rollback targets are unambiguous.

### Frontend Rollback

Azure Static Web Apps do not natively support rollback to previous deployments. Options:

1. **Re-run `deploy-web.sh`** with the previous source code checked out:
   ```bash
   git checkout <previous-tag>
   cd infra && ./deploy-web.sh
   ```

2. Alternatively, maintain deployment artifacts and re-deploy from the desired version.

> **Recommendation:** Tag releases in Git and use the tag as the deployment source.

### Database Migration Rollback

Prisma does not have automatic migration rollback. If a migration causes issues:

1. **If not yet deployed to production:** Fix the schema in a new migration.
2. **If already deployed:** Write a new "down" migration that reverses the changes manually.
3. **Last resort:** Restore from backup (use point-in-time restore to before the migration).

> **Best practice:** Test all migrations in staging before applying to production. Always create a manual backup before applying migrations to production.

---

## Database Migrations (Production)

See [Database Migrations](../Infra/Migrations.md) for the full guide.

**Quick reference:**

1. Ensure your IP is whitelisted in PostgreSQL Flexible Server firewall
2. Run from the `infra/` directory:
   ```bash
   ./run-migrations.sh
   ```
3. The script automatically:
   - Retrieves DB credentials from Azure Key Vault
   - Validates PostgreSQL version (must be ≥ 15)
   - Runs `prisma migrate deploy`

**Before running in production:**
- [ ] Run migrations in staging first
- [ ] Create a manual DB backup
- [ ] Notify users of potential downtime if the migration is destructive
- [ ] Keep the previous API image available for rollback

---

## Incident Management

> Specific escalation paths, contact lists, and SLAs should be defined by each country deployment team.

### Incident Severity Levels

| Level | Description | Response time |
|---|---|---|
| P1 — Critical | System completely unavailable, data loss | Immediate (< 15 min) |
| P2 — High | Core features unavailable for all users | < 1 hour |
| P3 — Medium | Core features degraded, workaround available | < 4 hours |
| P4 — Low | Minor issues, cosmetic, non-blocking | < 24 hours |

### Incident Response Steps

#### 1. Detection
- Alerts from Azure Monitor / App Insights / uptime monitor
- User reports
- CI/CD pipeline failures

#### 2. Triage
- Determine scope: is it one user, one organization, or all users?
- Check Azure Portal for service health issues: [https://status.azure.com](https://status.azure.com)
- Check App Service logs:
  ```bash
  az webapp log tail \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "<app-service-name>"
  ```
- Check recent deployments:
  ```bash
  az webapp deployment list \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "<app-service-name>"
  ```

#### 3. Contain
- If caused by a bad deployment → **rollback** (see above)
- If DB overloaded → scale up temporarily or terminate long-running queries
- If storage unavailable → check Azure Storage service health

#### 4. Resolve
- Apply fix or rollback
- Verify system recovery with a health check
- Monitor for recurrence

#### 5. Post-Incident Review (for P1/P2)
Document:
- Timeline of events
- Root cause
- Impact (users affected, data affected, duration)
- Resolution steps taken
- Prevention measures for the future

---

## Useful Commands

### Check API Health
```bash
curl https://<api-url>/api/health
```

### View App Service Logs (live stream)
```bash
az webapp log tail \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<app-service-name>"
```

### Restart App Service
```bash
az webapp restart \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<app-service-name>"
```

### Check PostgreSQL Status
```bash
az postgres flexible-server show \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<server-name>" \
  --query "state"
```

### List Recent Deployments
```bash
az webapp deployment list \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<app-service-name>" \
  --output table
```

### Scale App Service (emergency)
```bash
az appservice plan update \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "<plan-name>" \
  --sku P2v3
```

### Rotate Database Password
See the "Rotar Contraseña" section in the [Infrastructure Deployment Guide](../Infra/Deployment.md).

---

## Checklist: New Environment Setup

Use this checklist when deploying a new country instance:

- [ ] Azure subscription and resource group created
- [ ] `infra/.envrc` configured with all required variables
- [ ] Infrastructure deployed via `./infra/deploy.sh`
- [ ] PostgreSQL version verified (≥ 15)
- [ ] IP whitelisted in PostgreSQL firewall
- [ ] Migrations run via `./infra/run-migrations.sh`
- [ ] Methodology data seeded (via `load_methodologies/`)
- [ ] API deployed via `./infra/deploy-api.sh`
- [ ] Frontend deployed via `./infra/deploy-web.sh`
- [ ] Azure App Service authentication variables configured
- [ ] Health check verified: `curl https://<api-url>/api/health`
- [ ] Swagger UI accessible: `https://<api-url>/api/docs`
- [ ] Frontend accessible and login working
- [ ] Automated database backups verified
- [ ] Blob storage soft delete enabled
- [ ] Azure Monitor alerts configured
- [ ] Uptime monitoring configured
- [ ] Incident escalation contacts defined
