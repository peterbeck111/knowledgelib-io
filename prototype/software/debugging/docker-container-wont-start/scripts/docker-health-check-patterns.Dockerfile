# Input:  Need to detect unhealthy containers before they affect users
# Output: Health check configurations for common app types

# --- Node.js ---
FROM node:20-slim
COPY . /app
WORKDIR /app
RUN npm ci --production
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"
CMD ["node", "index.js"]

# --- Python/Flask ---
FROM python:3.12-slim
COPY . /app
WORKDIR /app
RUN pip install --no-cache-dir -r requirements.txt
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1
CMD ["python", "app.py"]

# --- Nginx ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY dist/ /usr/share/nginx/html/
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl -f http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
