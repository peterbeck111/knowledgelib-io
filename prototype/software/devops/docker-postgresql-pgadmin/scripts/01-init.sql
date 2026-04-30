-- 01-init.sql: Create application schema and default user
-- Runs automatically on first container start (empty data dir only)
-- Place in ./init-scripts/ and mount to /docker-entrypoint-initdb.d/

-- Create application schema
CREATE SCHEMA IF NOT EXISTS app;

-- Create application user with limited privileges
CREATE USER app_user WITH PASSWORD 'app_password';

-- Grant schema usage
GRANT USAGE ON SCHEMA app TO app_user;
GRANT CREATE ON SCHEMA app TO app_user;

-- Create sample tables
CREATE TABLE app.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES app.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant table access to app user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA app
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
    GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- Seed data (optional)
INSERT INTO app.users (email, display_name) VALUES
    ('demo@example.com', 'Demo User');

-- Confirm initialization
DO $$ BEGIN RAISE NOTICE 'Database initialized successfully'; END $$;
