# Whiteboard Designer Platform (UI-to-Code) Runbook

This runbook documents operational procedures, service boundaries, deployment rules, and disaster recovery processes for the full-stack design-to-code service.

---

## 1. Service Overview & Ownership

- **Service Owner**: Engineering Operations (Email: ops@example.com / Slack: #whiteboard-ops)
- **Primary Domain**: React (Vite) Canvas Board with Express.js backend API and Socket.IO presence routing.
- **Port Schemes**:
  - Frontend Client: `5173` (Local Dev) / `80` (Production Nginx Proxy)
  - Backend Server: `4000` (Local Dev & Production API)
  - Socket Server: `/socket.io` proxy via Nginx port `80` to backend port `4000`
- **Data Stores**:
  - PostgreSQL (Production RDS / localhost port `5432` if configured)
  - SQLite Local Fallback database (`server/src/db/sqlite.db`) for dev mode.

---

## 2. Deployment Architecture

Deployments are executed automatically via the GitHub Actions CI/CD pipeline defined in `.github/workflows/ci.yml`.

### Manual / CLI Deployment
To perform a clean, isolated deploy in production or staging hosts using Docker Compose:

1. Clone or pull the master branch:
   ```bash
   git pull origin main
   ```
2. Re-build and spin up containers in daemon mode:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```
3. Check container logs to verify startup:
   ```bash
   docker-compose logs -f
   ```

---

## 3. Rollback Procedures

If a deployment triggers runtime failures or breaks code generation:

1. Identify the previous stable Git commit hash:
   ```bash
   git log -n 10 --oneline
   ```
2. Perform a hard reset to the stable commit:
   ```bash
   git reset --hard <stable_commit_hash>
   ```
3. Rebuild and launch the stable Docker containers immediately:
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```
4. Verify server health:
   ```bash
   curl http://localhost/api/health
   ```

---

## 4. Disaster Recovery & Backup

### Database Backup (Postgres)
To capture a database snapshot manually:
```bash
docker exec -t <postgres_container_name> pg_dumpall -U postgres > backup_$(date +%F).sql
```

### Database Restore (Postgres)
To restore the database from a backup snapshot:
```bash
cat backup_filename.sql | docker exec -i <postgres_container_name> psql -U postgres
```

### SQLite Database Backup (Fallback mode)
If running in SQLite fallback mode, the local relational database is persisted in `server/src/db/sqlite.db`. Back up the file by running:
```bash
cp server/src/db/sqlite.db server/src/db/sqlite_backup_$(date +%F).db
```

---

## 5. Observability & Logging

- **Staging / Local Logs**: nodemon stdout/stderr streams.
- **Production Logs**: Docker logs container outputs.
  - To view backend server logs: `docker-compose logs --tail=100 -f server`
  - To view Nginx gateway proxy logs: `docker-compose logs --tail=100 -f nginx`
- **Error Tracking**: Look for `[normalizeWithLLM] LLM call failed` or `[generateCodeWithLLM] LLM call failed` error messages in server streams to identify API key rate limits or network degradation.

---

## 6. AI Endpoint Recovery & Schema Repair

- **Retry Mechanisms**: The AI normalization and code generation endpoints employ a built-in **1-retry repair loop** on parse failures.
- **Action Plan for Generation Failures**:
  1. Check if `OPENAI_API_KEY` is correctly mounted in `/server/.env`.
  2. If the OpenAI key is valid but calls fail, verify the OpenAI status dashboard.
  3. If formatting throws validation errors continuously, reduce structural complexity on the canvas (remove overlapping overlapping pen strokes) and re-submit the generation command.
