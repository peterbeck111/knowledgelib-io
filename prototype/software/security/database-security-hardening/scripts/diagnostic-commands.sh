# === PostgreSQL ===
# Check current authentication settings
psql -U postgres -c "SELECT * FROM pg_hba_file_rules;"

# List all roles and their privileges
psql -U postgres -c "\du+"

# Check SSL status of current connection
psql -U postgres -c "SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid();"

# Check if RLS is enabled on tables
psql -U postgres -d myapp -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"

# Verify pgAudit is loaded
psql -U postgres -c "SHOW shared_preload_libraries;"

# === MySQL ===
# Check user privileges
mysql -u root -p -e "SELECT user, host, plugin, ssl_type FROM mysql.user;"

# Verify SSL is required
mysql -u root -p -e "SHOW VARIABLES LIKE '%ssl%';"
mysql -u root -p -e "SHOW VARIABLES LIKE 'require_secure_transport';"

# Check for dangerous privileges
mysql -u root -p -e "SELECT user, host, Super_priv, File_priv, Grant_priv FROM mysql.user WHERE Super_priv='Y' OR File_priv='Y';"

# === MongoDB ===
# Check if auth is enabled
mongosh --eval "db.adminCommand({getParameter: 1, authenticationMechanisms: 1})"

# List all users and their roles
mongosh --eval "db.getSiblingDB('admin').system.users.find({}, {user:1, roles:1}).pretty()"

# Check TLS configuration
mongosh --tls --eval "db.adminCommand({getParameter: 1, tlsMode: 1})"

# Verify network binding
mongosh --eval "db.adminCommand({getCmdLineOpts: 1}).parsed.net"
