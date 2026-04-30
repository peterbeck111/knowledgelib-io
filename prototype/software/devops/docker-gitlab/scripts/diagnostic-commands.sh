# Check GitLab container status and health
docker compose ps
docker inspect gitlab --format='{{.State.Health.Status}}'

# View GitLab logs (all components)
docker compose logs -f gitlab

# View specific component logs inside container
docker exec -it gitlab gitlab-ctl tail nginx/gitlab_access.log
docker exec -it gitlab gitlab-ctl tail puma/puma_stdout.log
docker exec -it gitlab gitlab-ctl tail sidekiq/current

# Check GitLab service status (all omnibus components)
docker exec -it gitlab gitlab-ctl status

# Run GitLab environment check
docker exec -it gitlab gitlab-rake gitlab:check SANITIZE=true

# Check GitLab version
docker exec -it gitlab gitlab-rake gitlab:env:info

# Test SMTP configuration
docker exec -it gitlab gitlab-rails console -e production
# Then run: Notify.test_email('you@example.com', 'Test', 'Works!').deliver_now

# Check runner connectivity
docker exec -it gitlab-runner gitlab-runner verify

# List registered runners
docker exec -it gitlab-runner gitlab-runner list

# Check disk usage of GitLab volumes
du -sh $GITLAB_HOME/{config,logs,data}

# List backups
ls -la $GITLAB_HOME/data/backups/
