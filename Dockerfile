# syntax=docker/dockerfile:1

# ─── Build ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY app/package.json ./app/
COPY packages/shared/package.json ./packages/shared/

# Sin fallback a `pnpm install` sin lockfile: una instalación no congelada puede
# traer versiones distintas y producir un bundle distinto al de CI. Si el
# lockfile no cuadra, queremos que falle fuerte y no que compile otra cosa.
RUN pnpm install --frozen-lockfile

COPY . .

# NODE_ENV=production es OBLIGATORIO para este build, no cosmético: sin él el
# bundle queda roto y el server no arranca. Vite genera, para la dependencia
# opcional `bufferutil` de `ws`, un shim que LANZA al importarse:
#   Could not resolve "bufferutil" imported by "ws". Is it installed?
# Con NODE_ENV=production el shim es un objeto vacío inofensivo. Verificado:
# sin la variable el archivo pesa 120763 bytes y tira 12 errores; con ella
# pesa 120587 y arranca (idéntico al artefacto que publica el workflow de release).
# Va inline y no como ENV para que la instalación sí traiga devDependencies.
RUN NODE_ENV=production pnpm --filter app build

# ─── Runtime ─────────────────────────────────────────────────────────────────
# Bun, no Node: es el runtime con el que corre producción y con el que el
# bundle está verificado. Con `node` el server no arranca — falla al cargar
# `ws`, que importa `bufferutil` (dependencia opcional no instalada):
#   Could not resolve "bufferutil" imported by "ws"
# El Dockerfile anterior usaba `node` y nunca se ejecutó en producción (allá
# corre el tarball con bun), así que el bug quedó latente.
FROM oven/bun:1.3.14-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# El bundle de Nitro es autocontenido: trae sus dependencias externas
# (libsql, @libsql/<plataforma>, @neon-rs, tslib) dentro de
# app/.output/server/node_modules. Copiar el node_modules de la raíz agregaba
# ~960 MB que el runtime nunca lee: el server arranca y responde
# /api/health/db sin node_modules (verificado contra una copia de la base real).
COPY --from=builder /app/app/.output ./app/.output
COPY --from=builder /app/app/package.json ./app/package.json

# Migraciones SQL dentro de la imagen: permiten migrar sin depender del repo
# git (que puede estar desactualizado respecto al artefacto desplegado).
COPY --from=builder /app/packages/shared/drizzle-sqlite ./packages/shared/drizzle-sqlite

# DATABASE_URL, UPLOAD_DIR, BETTER_AUTH_SECRET y compañía NO se fijan acá a
# propósito: la app debe recibirlos explícitos para que no cree una base vacía
# en silencio y parezca sana. Ver deploy/env.dokploy.example.

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health/db').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/app
CMD ["bun", "run", ".output/server/index.mjs"]
