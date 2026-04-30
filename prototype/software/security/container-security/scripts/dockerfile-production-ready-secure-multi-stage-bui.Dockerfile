# syntax=docker/dockerfile:1
# Stage 1: Build
FROM node:20.11.1-alpine3.19 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production (minimal image)
FROM node:20.11.1-alpine3.19 AS production
# Install security updates
RUN apk update && apk upgrade --no-cache
# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
# Copy only production artifacts
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# Remove unnecessary binaries
RUN apk del --purge apk-tools
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s   CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
