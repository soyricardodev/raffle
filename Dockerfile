# syntax=docker/dockerfile:1

FROM oven/bun:1 AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY app/package.json ./app/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile || pnpm install

COPY . .

RUN pnpm --filter app build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

COPY package.json pnpm-workspace.yaml ./
COPY app/package.json ./app/
COPY packages/shared/package.json ./packages/shared/
COPY --from=builder /app/app/.output ./app/.output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/app/node_modules ./app/node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 3000

WORKDIR /app/app
CMD ["node", ".output/server/index.mjs"]
