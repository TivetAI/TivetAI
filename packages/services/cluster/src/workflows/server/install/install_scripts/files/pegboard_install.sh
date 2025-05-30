# Allow container traffic to be routed through IP tables
cat << 'EOF' > /etc/sysctl.d/20-pegboard.conf
net.bridge.bridge-nf-call-arptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF

sysctl --system

mkdir -p /etc/tivet-client /var/lib/tivet-client

echo 'Downloading pegboard manager'
curl -Lf -o /usr/local/bin/tivet-client "__PEGBOARD_MANAGER_BINARY_URL__"
chmod +x /usr/local/bin/tivet-client

if [ "__FLAVOR__" = "container" ]; then
	echo 'Downloading pegboard container runner'
	curl -Lf -o /usr/local/bin/tivet-container-runner "__CONTAINER_RUNNER_BINARY_URL__"
	chmod +x /usr/local/bin/tivet-container-runner
fi

if [ "__FLAVOR__" = "isolate" ]; then
	echo 'Downloading pegboard isolate runner'
	curl -Lf -o /usr/local/bin/tivet-isolate-v8-runner "__ISOLATE_V8_RUNNER_BINARY_URL__"
	chmod +x /usr/local/bin/tivet-isolate-v8-runner
fi

# For clarity
FDB_VERSION="__FDB_VERSION__"

# Shared object for fdb client
echo 'Downloading fdb shared object'
curl -Lf -o /lib/libfdb_c.so "https://github.com/apple/foundationdb/releases/download/${FDB_VERSION}/libfdb_c.x86_64.so"
