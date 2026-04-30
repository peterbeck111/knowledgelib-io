# === Container Status ===
docker ps -a                                          # All containers
docker inspect <cid> --format='{{.State.ExitCode}}'   # Exit code
docker inspect <cid> --format='{{.State.OOMKilled}}'  # OOM killed?
docker inspect <cid> --format='{{json .State}}'       # Full state JSON

# === Logs ===
docker logs <cid>                    # All logs
docker logs --tail 50 <cid>          # Last 50 lines
docker logs -f <cid>                 # Follow (stream)
docker logs -t <cid>                 # With timestamps

# === Interactive Debugging ===
docker run -it --entrypoint /bin/sh <image>    # Shell into image
docker exec -it <cid> /bin/sh                  # Shell into running container
docker commit <cid> debug && docker run -it --entrypoint /bin/sh debug  # Debug exited container

# === Image Inspection ===
docker inspect <image> --format='{{json .Config.Entrypoint}}'  # Entrypoint
docker inspect <image> --format='{{json .Config.Cmd}}'         # CMD
docker history <image>                                          # Layer history

# === Resources ===
docker stats <cid>                   # Live CPU/memory
docker system df                     # Disk usage
docker system info                   # System-wide info

# === Networking ===
docker network ls                    # List networks
docker network inspect <network>     # Network details
docker run --rm <image> nslookup <hostname>  # DNS test

# === Restart Policy ===
docker inspect <cid> --format='{{.HostConfig.RestartPolicy.Name}}'
docker update --restart=no <cid>     # Stop auto-restart for debugging

# === Docker Compose ===
docker compose logs <service>        # Service logs
docker compose config               # Validate and show resolved config
docker compose ps                    # Service status
