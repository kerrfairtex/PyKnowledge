FROM node:20-slim AS build

WORKDIR /app

# Install build dependencies for Prisma
RUN apt-get update -qq && apt-get install -y -qq openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy root workspace config
COPY package.json package-lock.json ./
COPY server/package.json server/

# Install ALL dependencies (including server workspace)
RUN npm ci

# Generate Prisma client
WORKDIR /app/server
COPY server/prisma/ ./prisma/
RUN npx prisma generate

# ── Production image ──────────────────────────────────
FROM node:20-slim

WORKDIR /app

RUN apt-get update -qq && apt-get install -y -qq openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy installed node_modules and prisma client
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/node_modules ./server/node_modules

# Copy server source
COPY server/ ./server/

# Copy prisma schema + config for runtime
COPY --from=build /app/server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/server
CMD ["node", "src/index.js"]