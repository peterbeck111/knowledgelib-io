# Check all service status
docker compose ps

# View Ghost startup logs (look for "Ghost booted in X.Xs")
docker compose logs ghost | tail -30

# Test database connectivity from Ghost container
docker compose exec ghost sh -c 'node -e "
  const mysql = require(\"mysql2\");
  const c = mysql.createConnection({
    host:\"db\", user:\"ghost\", password:process.env.database__connection__password, database:\"ghostdb\"
  });
  c.connect(err => { console.log(err ? err.message : \"DB OK\"); c.end(); });
"'

# Check Ghost configuration
docker compose exec ghost ghost config

# Test mail delivery
docker compose exec ghost ghost config mail.transport

# Verify volume mounts
docker compose exec ghost ls -la /var/lib/ghost/content/

# Check MySQL health
docker compose exec db mysqladmin ping -u root -p"$MYSQL_ROOT_PASSWORD"

# Monitor resource usage
docker stats ghost-app ghost-db ghost-caddy

# Check Caddy TLS certificate status
docker compose exec caddy caddy list-certificates

# View Nginx error log (if using Nginx)
docker compose exec nginx tail -50 /var/log/nginx/error.log
