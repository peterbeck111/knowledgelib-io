# Dockerfile
# Input:  Python application with requirements.txt
# Output: Slim production container (~120MB)

# === Build Stage ===
FROM python:3.12-slim AS build
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# === Production Stage ===
FROM python:3.12-slim
WORKDIR /app

# Security: non-root user
RUN groupadd -r app && useradd -r -g app app

# Copy installed packages from build stage
COPY --from=build /install /usr/local

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=app:app . .

USER app
EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:create_app()"]
