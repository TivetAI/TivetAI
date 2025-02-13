# Create systemd service file
cat << 'EOF' > /etc/systemd/system/tivet_hook.service
[Unit]
Description=Tivet Hook
Requires=network-online.target __TUNNEL_NAME__.service
After=network-online.target __TUNNEL_NAME__.service
ConditionPathExists=!/var/tmp/tivet_hook.completed

[Service]
User=root
Group=root
Type=oneshot
RemainAfterExit=true
Restart=on-failure
RestartSec=1s
ExecStart=/usr/bin/tivet_hook.sh
ExecStartPost=/bin/touch /var/tmp/tivet_hook.completed

# Real time service
CPUSchedulingPolicy=fifo
# High CPU priority
CPUSchedulingPriority=90
# Prevent killing from system OOM
OOMScoreAdjust=-800

[Install]
WantedBy=multi-user.target
EOF

# Enable initialze script to run on reboot
systemctl daemon-reload
systemctl enable tivet_hook
