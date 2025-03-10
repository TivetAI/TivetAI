#!/bin/bash

# Enable strict mode
set -euo pipefail
IFS=$'\n\t'

LOG_FILE="/var/log/fdb_configure.log"
MAX_RETRIES=10
RETRY_INTERVAL=2
FDB_CLUSTER_FILE="/var/fdb/fdb.cluster"
CONFIG_BACKUP="/var/fdb/fdb.cluster.bak"
DEBUG=${DEBUG:-0}

function log() {
	local level="$1"
	local msg="$2"
	echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $msg" | tee -a "$LOG_FILE"
}

function check_dependencies() {
	log "INFO" "Checking required commands..."
	local commands=("fdbcli" "timeout" "tee")
	for cmd in "${commands[@]}"; do
		if ! command -v "$cmd" &>/dev/null; then
			log "ERROR" "Missing required command: $cmd"
			exit 1
		fi
	done
	log "INFO" "All dependencies are installed."
}

function backup_existing_config() {
	if [[ -f "$FDB_CLUSTER_FILE" ]]; then
		log "INFO" "Backing up existing cluster config to $CONFIG_BACKUP"
		cp "$FDB_CLUSTER_FILE" "$CONFIG_BACKUP"
	fi
}

function restore_backup_config() {
	if [[ -f "$CONFIG_BACKUP" ]]; then
		log "INFO" "Restoring backup config"
		cp "$CONFIG_BACKUP" "$FDB_CLUSTER_FILE"
	fi
}

function configure_database() {
	log "INFO" "Starting database configuration..."

	local attempt=0
	until fdbcli --exec 'configure new single ssd' --timeout 10; do
		((attempt++))
		log "WARN" "Attempt $attempt failed. Retrying in $RETRY_INTERVAL seconds..."
		if (( attempt >= MAX_RETRIES )); then
			log "ERROR" "Failed to configure FoundationDB after $MAX_RETRIES attempts."
			exit 1
		fi
		sleep "$RETRY_INTERVAL"
	done

	log "INFO" "Database successfully configured."
}

function wait_for_fdb_service() {
	log "INFO" "Waiting for FoundationDB service to become available..."
	local timeout=30
	while ! pgrep -x "fdbserver" >/dev/null; do
		sleep 1
		((timeout--))
		if (( timeout == 0 )); then
			log "ERROR" "Timeout waiting for fdbserver to start"
			exit 1
		fi
	done
	log "INFO" "FoundationDB service is running."
}

function print_config_info() {
	log "INFO" "FDB_CLUSTER_FILE content:"
	cat "$FDB_CLUSTER_FILE" | tee -a "$LOG_FILE"
}

function trap_signals() {
	trap on_exit SIGINT SIGTERM EXIT
}

function on_exit() {
	log "INFO" "Cleanup triggered."
	# Add cleanup logic here if needed
}

function validate_env_vars() {
	log "INFO" "Validating required environment variables..."
	: "${PUBLIC_IP:?Environment variable PUBLIC_IP is required}"
	: "${FDB_PORT:?Environment variable FDB_PORT is required}"
	log "INFO" "PUBLIC_IP=${PUBLIC_IP}, FDB_PORT=${FDB_PORT}"
}

function enable_debug() {
	if [[ "$DEBUG" == "1" ]]; then
		set -x
		log "DEBUG" "Debug mode enabled."
	fi
}

# === MAIN SCRIPT ===

trap_signals
enable_debug
check_dependencies
validate_env_vars
wait_for_fdb_service
backup_existing_config

if [ ! -e "$FDB_CLUSTER_FILE" ]; then
	log "INFO" "Cluster config not found. Starting configuration in background..."
	configure_database &
else
	log "INFO" "Cluster config already exists. Skipping configuration."
	print_config_info
fi

# Configure networking mode
export FDB_NETWORKING_MODE=container

# Optionally append custom configurations from mounted file
if [[ -f /var/fdb/extra_config.sh ]]; then
	log "INFO" "Applying extra configuration from extra_config.sh..."
	source /var/fdb/extra_config.sh
fi

# Execute entrypoint
log "INFO" "Launching main entrypoint script..."
exec /var/fdb/scripts/fdb.bash "$@"
