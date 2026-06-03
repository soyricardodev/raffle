# yoiberifas.com — despliegue

## Modelo unificado

Tanto **fast deploy** como **build en VPS** activan la app por el mismo camino:

```
~/raffle/current  →  ~/raffle/releases/<id>/app/.output/
```

`systemd` siempre arranca desde `current`. El repo git en `~/raffle/` solo se usa para scripts y migraciones Drizzle.

| Comando | Build | Activa `current` | Rollback |
|---------|-------|------------------|----------|
| `vps-fast-deploy.sh` | GitHub Actions | sí | `--rollback` |
| `vps-deploy.sh` | en el VPS | sí | `--rollback` (mismo script) |

## Layout en el VPS

| Ruta | Contenido |
|------|-----------|
| `~/raffle-app` | Legacy (solo uploads / referencia) |
| `~/raffle/.env` | Secrets y `DATABASE_URL` |
| `~/raffle/data/raffle.db` | SQLite producción |
| `~/raffle/current` | Symlink al release activo |
| `~/raffle/releases/` | Historial de bundles descargados |

---

## Despliegue rápido (recomendado)

GitHub Actions construye la app; el VPS solo descarga y reinicia (~1–3 min).

### 1. Publicar release (una vez por cambio de código)

Push a `master` dispara [`.github/workflows/release-yoiberifas.yml`](../.github/workflows/release-yoiberifas.yml).

O manualmente en GitHub: **Actions → Release Yoiberifas → Run workflow**.

Cuando termine, existirá el release `yoiberifas-latest` con `raffle-release.tar.gz`.

### 2. Desplegar en el VPS

```bash
cd ~/raffle
git pull origin master   # solo para actualizar scripts deploy/
bash deploy/vps-fast-deploy.sh
```

Con migración de schema (si hubo cambios Drizzle):

```bash
bash deploy/vps-fast-deploy.sh --migrate
```

### 3. Verificar

```bash
curl -s http://127.0.0.1:3000/api/health/db
sudo systemctl status raffle --no-pager
readlink -f ~/raffle/current
```

### Rollback

```bash
bash deploy/vps-fast-deploy.sh --rollback
```

Mantiene los últimos 5 releases en `~/raffle/releases/`. Funciona igual si el release anterior fue fast o local.

---

## Build en el VPS (alternativa)

```bash
cd ~/raffle
bash deploy/vps-deploy.sh
```

Empaqueta el build en `releases/local_<sha>_<timestamp>/` y activa `current` — mismo resultado que fast deploy.

Solo cambio de `.env`:

```bash
SKIP_BUILD=1 SKIP_MIGRATE=1 bash deploy/vps-deploy.sh
```

---

## Migración inicial (una sola vez)

Solo la primera vez desde legacy MySQL:

```bash
cd ~/raffle
bash deploy/vps-yoiberifas-full.sh --skip-nginx
# validar, luego cutover nginx:
bash deploy/vps-yoiberifas-full.sh --skip-migration
```

O cutover completo en una ventana de mantenimiento:

```bash
bash deploy/vps-yoiberifas-full.sh
```

---

## Si el build en VPS falla por memoria

La migración ya queda en `~/raffle/data/raffle.db`. Usa **fast deploy** en lugar de rebuild en VPS:

```bash
# Espera que GitHub termine el workflow Release Yoiberifas
bash deploy/vps-fast-deploy.sh
```

---

## Monitoreo

```bash
journalctl -u raffle -f
cat ~/raffle/logs/previous-release   # ruta para rollback
```

---

## Password admin

```bash
grep MIGRATE_ADMIN_PASSWORD ~/raffle/.env
```

Login: https://yoiberifas.com/login → cambiar en `/admin/cuenta`.
