# Dockerfile
# Input:  Node.js application with package.json and src/
# Output: Optimized production container (~150MB vs ~1GB)

# === Build Stage ===
FROM node:20.11-alpine3.19 AS build
WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# === Production Stage ===
FROM node:20.11-alpine3.19

# Security: non-root user
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copy only production artifacts
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/package.json ./

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
