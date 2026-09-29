# PostgreSQL Database Backup & Restore Guide

This document outlines the standard operational procedures for executing backups, performing data restores, and applying schema migrations for the Smart Credit Risk Prediction System's PostgreSQL database.

---

## 1. Database Configuration Context
- **Container Name**: `credit_risk_postgres`
- **Database Name**: `credit_risk`
- **Database User**: `postgres`
- **Port**: `5432`

---

## 2. Automated & Manual Database Backups

### Creating a Full Database Backup (`pg_dump`)
To take a compressed SQL dump backup of the entire PostgreSQL database from a running Docker container:

```bash
docker exec -t credit_risk_postgres pg_dump -U postgres -d credit_risk -F c -b -v -f /tmp/credit_risk_backup.dump
docker cp credit_risk_postgres:/tmp/credit_risk_backup.dump ./backups/credit_risk_backup_$(date +%Y%m%d_%H%M%S).dump
```

### Plaintext SQL Format Backup
```bash
docker exec -t credit_risk_postgres pg_dump -U postgres -d credit_risk --clean --if-exists > ./backups/credit_risk_backup.sql
```

---

## 3. Database Restore Procedures (`pg_restore`)

### Restoring from Compressed Dump File
```bash
# Copy dump file into container
docker cp ./backups/credit_risk_backup_20260907.dump credit_risk_postgres:/tmp/restore.dump

# Execute pg_restore
docker exec -t credit_risk_postgres pg_restore -U postgres -d credit_risk -v --clean --if-exists /tmp/restore.dump
```

### Restoring from Plaintext SQL Backup
```bash
cat ./backups/credit_risk_backup.sql | docker exec -i credit_risk_postgres psql -U postgres -d credit_risk
```

---

## 4. Alembic Database Migrations

### Applying Pending Migrations
```bash
# Local environment
credit-risk/Scripts/python.exe -m alembic upgrade head

# Docker environment
docker exec -it credit_risk_backend python -m alembic upgrade head
```

### Checking Current Migration Revision
```bash
credit-risk/Scripts/python.exe -m alembic current
```
