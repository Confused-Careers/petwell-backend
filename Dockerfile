FROM node:20-alpine AS development

RUN corepack enable pnpm

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM node:20-alpine AS production

RUN corepack enable pnpm && \
    apk add --no-cache dumb-init

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune

COPY --from=development /app/dist ./dist
COPY entrypoint-flexible.sh ./entrypoint.sh

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chmod +x entrypoint.sh

USER nestjs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]

CMD ["./entrypoint.sh"]