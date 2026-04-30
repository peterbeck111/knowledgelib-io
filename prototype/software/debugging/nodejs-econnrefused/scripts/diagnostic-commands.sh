# Test TCP connectivity
nc -zv hostname port
curl -v telnet://hostname:port --connect-timeout 5

# Check what's listening on a port
# Linux
ss -tuln | grep PORT
lsof -i :PORT
netstat -tuln | grep PORT

# macOS
lsof -nP -iTCP:PORT | grep LISTEN

# Windows
netstat -an | findstr "PORT"

# Check if service is running
systemctl status postgresql
docker ps | grep container-name
docker logs container-name --tail 50

# Test database connectivity
pg_isready -h hostname -p 5432
redis-cli -h hostname -p 6379 ping
mysql -h hostname -P 3306 -u user -p -e "SELECT 1"

# Docker: test from inside container
docker exec -it app-container sh -c "nc -zv db-service 5432"

# Docker: inspect network
docker network ls
docker network inspect bridge
docker inspect container-name --format '{{.NetworkSettings.Networks}}'

# Check DNS resolution
nslookup hostname
dig hostname

# Firewall check
sudo ufw status
sudo iptables -L -n | grep PORT
