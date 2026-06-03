# Despliegue en VPS (Bun + GitHub + nginx)

Guía para migrar desde legacy en el **mismo VPS**, conservar datos e imágenes, y desplegar la app v2 desde GitHub.

## Layout recomendado en el VPS

```
/opt/raffle/
├── .env                 # secrets (chmod 600)
├── data/
│   └── raffle.db        # SQLite producción
├── uploads/             # heredado del legacy (+ nuevos uploads)
│   ├── raffles/
│   ├── prizes/
│   ├── payments/
│   └── config/          # logos legacy del sitio
├── backups/             # dumps MySQL + snapshots .db
└── src/                 # git clone del repo
```

## 1. Preparar el VPS (una vez)

```bash
# Desde el repo clonado localmente, copia el script al VPS o clona primero:
git clone git@github.com:TU_USUARIO/raffle.git /tmp/raffle
cd /tmp/raffle
sudo GIT_REPO=git@github.com:TU_USUARIO/raffle.git bash deploy/vps-setup.sh
```

O manualmente:

```bash
sudo cp deploy/env.production.example /opt/raffle/.env
sudo chmod 600 /opt/raffle/.env
sudo chown raffle:raffle /opt/raffle/.env
```

## 2. Copiar uploads del legacy

Las URLs en la base de datos apuntan a `/uploads/...`. Copia la carpeta física:

```bash
# Ejemplo si legacy tenía uploads en /opt/raffle-legacy/uploads o ./backend/uploads
sudo rsync -av /ruta/legacy/uploads/ /opt/raffle/uploads/
sudo chown -R raffle:raffle /opt/raffle/uploads
```

Verifica que existan rutas típicas: `payments/`, `raffles/`, `prizes/`, `config/`.

## 3. nginx + SSL

```bash
sudo cp nginx/raffle.conf.example /etc/nginx/sites-available/raffle
sudo nano /etc/nginx/sites-available/raffle   # tudominio.com, rutas
sudo ln -sf /etc/nginx/sites-available/raffle /etc/nginx/sites-enabled/
sudo certbot --nginx -d tudominio.com
sudo nginx -t && sudo systemctl reload nginx
```

nginx sirve `/uploads/` directo desde disco; el resto va al proxy `127.0.0.1:3000` (Bun).

## 4. systemd (app con Bun)

```bash
sudo cp deploy/raffle.service.example /etc/systemd/system/raffle.service
sudo nano /etc/systemd/system/raffle.service   # User=raffle, ruta bun
sudo systemctl daemon-reload
sudo systemctl enable --now raffle
journalctl -u raffle -f
```

## 5. Plan de cutover (ventana de mantenimiento)

### Fase A — Prueba en staging (recomendado)

1. Dump MySQL de prod → VPS de prueba o MySQL local.
2. Crear SQLite vacío y migrar:

```bash
cd /opt/raffle/src
source /opt/raffle/.env
pnpm db:migrate
bun run scripts/migrate-mysql-to-libsql.ts
UPLOAD_DIR=/opt/raffle/uploads bun run scripts/validate-migration.ts
```

3. Probar app en subdominio (`v2.tudominio.com` → puerto 3000) sin tocar prod.

### Fase B — Cutover producción

```bash
# 1. Banner mantenimiento (opcional)
sudo touch /opt/raffle/maintenance.flag
sudo nginx -s reload

# 2. Detener legacy (pm2, docker, node — lo que uses hoy)
pm2 stop legacy-app   # ejemplo

# 3. Cutover automatizado
sudo bash /opt/raffle/src/deploy/vps-cutover.sh

# 4. Quitar mantenimiento
sudo rm -f /opt/raffle/maintenance.flag
sudo nginx -s reload
```

El script `vps-cutover.sh`:

1. Backup MySQL (si `mysqldump` disponible)
2. Snapshot del `.db` anterior
3. `pnpm db:migrate` en SQLite vacío
4. `migrate-mysql-to-libsql.ts`
5. `validate-migration.ts`
6. `vps-deploy.sh` (build + restart)

### Fase C — Post-cutover (checklist manual)

- [ ] Login admin con `MIGRATE_ADMIN_PASSWORD` → cambiar en `/admin/cuenta`
- [ ] `GET /api/health/db` → `{ ok: true }`
- [ ] Verificador con teléfono de compra histórica
- [ ] Abrir comprobante e imagen de rifa antigua en el navegador
- [ ] Compra de prueba + aprobar en admin
- [ ] Cron: `deploy/crontab.example`
- [ ] Apagar/desinstalar legacy cuando estés conforme

## 6. Despliegues rutinarios (solo código)

Tras push a GitHub:

```bash
sudo -u raffle bash /opt/raffle/src/deploy/vps-deploy.sh
```

O con variables:

```bash
RAFFLE_ROOT=/opt/raffle GIT_BRANCH=main sudo -u raffle bash deploy/vps-deploy.sh
```

Flags útiles:

| Variable | Efecto |
|----------|--------|
| `SKIP_PULL=1` | No hace git pull |
| `SKIP_MIGRATE=1` | No corre drizzle migrate |
| `SKIP_BUILD=1` | Solo restart (cambio de .env) |

## 7. Scripts del monorepo

| Comando | Uso |
|---------|-----|
| `pnpm db:migrate` | Schema SQLite (cada deploy) |
| `pnpm db:migrate:mysql` | ETL MySQL → SQLite (cutover) |
| `pnpm db:validate:migration` | Comparar conteos legacy vs SQLite |
| `bash deploy/vps-deploy.sh` | Pull + build + restart |
| `bash deploy/vps-cutover.sh` | Cutover completo |

## 8. Rollback

1. Mantener dump MySQL 24–72 h en `/opt/raffle/backups/`
2. Si falla v2: reactivar legacy, apuntar nginx al puerto legacy
3. Snapshot `.db`: `cp backups/raffle_YYYYMMDD.db.bak data/raffle.db`

## 9. Variables críticas

| Variable | Producción |
|----------|------------|
| `DATABASE_URL` | `file:/opt/raffle/data/raffle.db` |
| `UPLOAD_DIR` | `/opt/raffle/uploads` (absoluto) |
| `APP_URL` / `BETTER_AUTH_URL` | `https://tudominio.com` |
| `BETTER_AUTH_SECRET` | ≥ 32 chars, único por entorno |
| `CRON_SECRET` | Para `/api/cron/maintenance` |

Ver también: [LIBSQL_CUTOVER_RUNBOOK.md](./LIBSQL_CUTOVER_RUNBOOK.md), [RUNBOOK.md](./RUNBOOK.md).
