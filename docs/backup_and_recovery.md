# Smart Credit Risk Platform — Enterprise Backup & Disaster Recovery Guide

## 1. Executive Summary & Recovery Objectives

This document establishes the official enterprise backup, disaster recovery, and data resilience operational standard for the **Smart Credit Risk Platform**.

| Metric | Target | Description |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | **< 1 hour** | Maximum acceptable data loss window during catastrophic outage. |
| **RTO (Recovery Time Objective)** | **< 15 minutes** | Maximum allowable downtime to restore full operational service. |
| **ML Artifact Integrity** | **100% Deterministic** | Strict SHA-256 validation ensuring zero drift or tampering with trained models. |
| **Data Retention** | **7 Years** | Audit logs and credit assessments archived for regulatory compliance. |

---

## 2. ML Artifact Integrity & Protection

The credit prediction engine relies on frozen production ML artifacts:
- `models/final_model.joblib` (SHA-256: `7FCC6EC2B5E481EEA9A6BE007CC7679E28F9ABACAE8D4DBDA19BA5C18EB3C768`)
- `models/preprocessing_pipeline.joblib` (SHA-256: `8B0BB086C63FDB928E0D5840FB9B29B23A75F638665A86915B17A7E46984288A`)
- `models/threshold_config.json` (SHA-256: `13FD9163C88B4109B5BFE479898F3D65E40137FABF3BF0A102F2CAA491F94EAC`)
- **Authoritative Cutoff Threshold**: `0.35`

### 2.1 Verification Command
In any staging, container, or disaster recovery environment, execute hash verification:

```bash
# Linux / macOS
sha256sum models/final_model.joblib models/preprocessing_pipeline.joblib models/threshold_config.json

# Windows PowerShell
Get-FileHash models/final_model.joblib, models/preprocessing_pipeline.joblib, models/threshold_config.json | Format-List
```

### 2.2 Production Best Practice
- Mount the `models/` directory as **read-only** (`:ro`) in production containers.
- Maintain mirrored artifact backups in versioned, write-once-read-many (WORM) cloud object storage (e.g. AWS S3 with Object Lock or GCP Bucket with Retention Policy).

---

## 3. PostgreSQL Database Backup Procedures

### 3.1 Pre-Deployment Snapshot Backup
Always create an ad-hoc snapshot before any application deployment or Alembic migration:

```bash
# Docker environment
docker exec -t credit_risk_postgres pg_dump -U postgres -d credit_risk -F c -b -v \
  -f /tmp/credit_risk_predeploy_$(date +%Y%m%d_%H%M%S).dump

# Extract to host backup directory
docker cp credit_risk_postgres:/tmp/credit_risk_predeploy_*.dump ./backups/
```

### 3.2 Automated Daily Scheduled Backup (Cron Job)
Configure a daily cron script on the database host (`/usr/local/bin/backup_credit_risk.sh`):

```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/credit_risk"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/credit_risk_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

# Execute compressed backup
docker exec -t credit_risk_postgres pg_dump \
  -U postgres \
  -d credit_risk \
  -F c \
  -b \
  -v \
  -f "/tmp/backup_${TIMESTAMP}.dump"

docker cp "credit_risk_postgres:/tmp/backup_${TIMESTAMP}.dump" "$FILENAME"
docker exec -t credit_risk_postgres rm "/tmp/backup_${TIMESTAMP}.dump"

# Retain local backups for 30 days
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +30 -exec rm {} \;

echo "[$(date)] Backup completed successfully: $FILENAME"
```

---

## 4. Database Recovery & Restore Procedures

### 4.1 Full Restore from Compressed Dump
To restore a damaged or lost database onto a fresh PostgreSQL instance:

```bash
# 1. Terminate active backend connections
docker exec -t credit_risk_postgres psql -U postgres -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'credit_risk' AND pid <> pg_backend_pid();"

# 2. Re-create clean database target
docker exec -t credit_risk_postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS credit_risk;"
docker exec -t credit_risk_postgres psql -U postgres -d postgres -c "CREATE DATABASE credit_risk;"

# 3. Copy backup dump into container
docker cp ./backups/credit_risk_backup.dump credit_risk_postgres:/tmp/restore.dump

# 4. Execute pg_restore
docker exec -t credit_risk_postgres pg_restore \
  -U postgres \
  -d credit_risk \
  -v \
  --no-owner \
  /tmp/restore.dump

# 5. Clean up temporary container file
docker exec -t credit_risk_postgres rm /tmp/restore.dump
```

### 4.2 Post-Restore Data Integrity Verification
Run the following verification queries to guarantee row counts and relationships are fully intact:

```sql
-- 1. Check assessment and applicant volume
SELECT count(*) AS total_applicants FROM applicants;
SELECT count(*) AS total_assessments FROM assessments;
SELECT count(*) AS total_audit_logs FROM audit_logs;
SELECT count(*) AS total_users FROM users;

-- 2. Validate referential integrity
SELECT count(*) AS orphaned_assessments
FROM assessments a
LEFT JOIN applicants p ON a.applicant_id = p.id
WHERE p.id IS NULL;

-- 3. Verify latest assessment timestamp
SELECT max(created_at) AS latest_assessment FROM assessments;
```

---

## 5. Schema Migration & Rollback Strategy

The platform uses **Alembic** to manage database schema evolution.

### 5.1 Pre-Migration Check
```bash
# Verify current revision
python -m alembic current

# Inspect pending migrations without applying
python -m alembic heads
```

### 5.2 Safe Migration Rollback
If a migration fails or causes unexpected behavior post-deployment:

```bash
# Roll back exactly 1 revision
python -m alembic downgrade -1

# Or roll back to a specific known-good revision hash
python -m alembic downgrade <revision_id>
```

---

## 6. Disaster Recovery Runbook (Cold Start Reconstruction)

In the event of total server loss:

1. **Provision Infrastructure**: Provision new Linux host with Docker & Docker Compose installed.
2. **Clone Codebase**:
   ```bash
   git clone <repository_url> /opt/smart-credit-risk
   cd /opt/smart-credit-risk
   ```
3. **Restore Environment Secrets**:
   Copy `.env` from secure secrets vault (e.g. HashiCorp Vault, AWS Secrets Manager). Ensure `ENVIRONMENT=production` and strong `SECRET_KEY` (>= 32 chars) is set.
4. **Verify ML Artifacts**:
   Run SHA-256 checks to confirm `models/` files match authoritative hashes.
5. **Start Infrastructure**:
   ```bash
   docker compose up -d postgres
   ```
6. **Restore Database Backup**:
   Follow Section 4.1 to restore latest database dump into `credit_risk_postgres`.
7. **Launch Backend & Frontend**:
   ```bash
   docker compose up -d backend frontend
   ```
8. **Execute Readiness Probe**:
   ```bash
   curl -f http://localhost:8000/health
   curl -f http://localhost:8000/ready
   ```
   Both checks must return `200 OK` with `"status": "ready"`.

---

## 7. Audit Log Retention & Archival

For regulatory compliance (Fair Credit Reporting Act, GDPR, model auditability):
- Live assessments and audit logs are retained in the active transactional database for **24 months**.
- Records older than 24 months are exported to compressed Parquet or encrypted JSON archives and moved to cold storage (e.g. AWS S3 Glacier / Google Cloud Archive Storage).
- Purge jobs are only executed after cryptographically signing and storing cold archives.
