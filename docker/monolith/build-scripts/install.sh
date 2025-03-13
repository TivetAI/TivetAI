# === System Hardening ===
log "INFO" "Applying basic system hardening..."
echo "Disabling root SSH login..."
sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config

echo "Disabling unused filesystems..."
echo "install cramfs /bin/true" >> /etc/modprobe.d/hardening.conf
echo "install squashfs /bin/true" >> /etc/modprobe.d/hardening.conf

echo "Enabling UFW..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw --force enable

# === CLI Helpers ===
log "INFO" "Installing CLI helpers..."
echo 'alias ll="ls -la"' >> /etc/bash.bashrc
echo 'alias fdbc="fdbcli --exec status"' >> /etc/bash.bashrc
echo 'alias ck="clickhouse-client"' >> /etc/bash.bashrc
echo 'alias pgc="psql -U postgres"' >> /etc/bash.bashrc

# === Health Check Scripts ===
log "INFO" "Installing health checks..."
cat <<'EOF' > /usr/local/bin/healthcheck_fdb.sh
#!/bin/bash
if fdbcli --exec 'status' &>/dev/null; then
  echo "FoundationDB is healthy"
  exit 0
else
  echo "FoundationDB health check failed"
  exit 1
fi
EOF
chmod +x /usr/local/bin/healthcheck_fdb.sh

cat <<'EOF' > /usr/local/bin/healthcheck_ck.sh
#!/bin/bash
echo "SELECT 1" | clickhouse-client &>/dev/null
EOF
chmod +x /usr/local/bin/healthcheck_ck.sh

# === Logrotate ===
log "INFO" "Setting up log rotation..."
cat <<EOF > /etc/logrotate.d/fdb_custom
/var/log/foundationdb-monitor/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 foundationdb foundationdb
}
EOF

# === Metrics Output ===
log "INFO" "Creating metrics endpoints..."
mkdir -p /var/metrics
cat <<'EOF' > /usr/local/bin/generate_metrics.sh
#!/bin/bash
{
  echo "uptime_seconds $(awk '{print int($1)}' /proc/uptime)"
  echo "load_avg $(awk '{print $1}' /proc/loadavg)"
  echo "mem_free_kb $(awk '/MemFree/ {print $2}' /proc/meminfo)"
} > /var/metrics/system.prom
EOF
chmod +x /usr/local/bin/generate_metrics.sh
echo "* * * * * root /usr/local/bin/generate_metrics.sh" >> /etc/crontab

# === Bash Prompt Improvement ===
log "INFO" "Improving shell prompt..."
echo 'PS1="\u@\h:\w\$ "' >> /etc/bash.bashrc

# === Environment Summary ===
log "INFO" "Writing install summary..."
cat <<EOF > /etc/setup_summary.txt
Installed Services:
- FoundationDB (${FDB_VERSION})
- ClickHouse
- Redis
- CockroachDB
- Traefik
- NATS
- SeaweedFS
- Vector
- S6 Overlay

Architecture: ${TARGET_ARCH}
Network mode: container
EOF

# === Filesystem & Disk Alerts ===
cat <<'EOF' > /usr/local/bin/disk_alert.sh
#!/bin/bash
THRESHOLD=85
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "Disk usage critical: $USAGE%" >&2
  exit 1
else
  echo "Disk usage: $USAGE%"
fi
EOF
chmod +x /usr/local/bin/disk_alert.sh

# === Sanity Check Script ===
cat <<'EOF' > /usr/local/bin/sanity_check.sh
#!/bin/bash
echo "Running system sanity check..."
commands=("fdbcli" "clickhouse-client" "redis-cli" "cockroach" "traefik" "nats-server" "weed")
for cmd in "${commands[@]}"; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Missing: $cmd"
  else
    echo "Found: $cmd"
  fi
done
EOF
chmod +x /usr/local/bin/sanity_check.sh

# === Permissions Sanity ===
log "INFO" "Checking file permissions..."
chown -R root:root /usr/local/bin/*
chmod 755 /usr/local/bin/*

# === Final Message ===
echo -e "\n✅ Base system provisioning complete."
echo "Run /usr/local/bin/sanity_check.sh to verify installation."
echo "Refer to /etc/setup_summary.txt for installed components."
