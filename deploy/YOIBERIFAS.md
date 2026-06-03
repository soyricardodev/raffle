# yoiberifas.com — un solo comando

## Migración + deploy completo

Desde el VPS como `admin`, con legacy en `~/raffle-app` y v2 en `~/raffle`:

```bash
cd ~/raffle
git pull origin master   # o clona la primera vez
bash deploy/vps-yoiberifas-full.sh
```

El script hace **todo**:

1. `git pull` vía HTTPS (repo público, sin SSH key)
2. Lee `~/raffle-app/backend/.env` → genera `~/raffle/.env`
3. Usa uploads legacy en `~/raffle-app/backend/uploads` (sin copiar)
4. Backup MySQL + SQLite
5. Schema SQLite + ETL MySQL → SQLite
6. Validación de conteos
7. `pnpm build` + systemd (Bun en :3000)
8. Detiene legacy (pm2 en raffle-app) + nginx cutover

## Probar sin tocar producción

```bash
bash deploy/vps-yoiberifas-full.sh --skip-nginx
curl http://127.0.0.1:3000/api/health/db
```

## Ver progreso mientras corre

En otro terminal SSH:

```bash
cd ~/raffle
cat logs/current-step
tail -f logs/deploy_*.log
```

Si el script actual fue iniciado antes de esta mejora:

```bash
ps -eo pid,etime,cmd | grep -E 'vps-yoiberifas|pnpm|bun|node|mysqldump' | grep -v grep
du -h ~/raffle/data/raffle.db 2>/dev/null || true
sudo systemctl status raffle --no-pager
journalctl -u raffle -n 80 --no-pager
```

## Re-migrar desde cero

```bash
bash deploy/vps-yoiberifas-full.sh --force-db --skip-nginx
```

## Solo redeploy de código

```bash
bash deploy/vps-yoiberifas-full.sh --skip-migration
```

## Requisitos en el VPS

- `~/raffle-app/backend/.env` con `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Node 22 + Bun (`vps-setup-admin.sh` instala Bun)
- `mysql-client` para backup: `sudo apt install mysql-client`
- sudo para nginx y systemd

## Password admin post-migración

```bash
grep MIGRATE_ADMIN_PASSWORD ~/raffle/.env
```

Login en https://yoiberifas.com/login → cambiar en `/admin/cuenta`.
