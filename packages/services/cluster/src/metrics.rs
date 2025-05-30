use tivet_metrics::{prometheus::*, PROVISION_BUCKETS, REGISTRY};

lazy_static::lazy_static! {
	pub static ref PROVISIONING_SERVERS: IntGaugeVec = register_int_gauge_vec_with_registry!(
		"provision_provisioning_servers",
		"Servers being provisioned.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id", "pool_type"],
		*REGISTRY,
	).unwrap();
	pub static ref INSTALLING_SERVERS: IntGaugeVec = register_int_gauge_vec_with_registry!(
		"provision_installing_servers",
		"Servers currently installing.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id", "pool_type"],
		*REGISTRY,
	).unwrap();
	pub static ref ACTIVE_SERVERS: IntGaugeVec = register_int_gauge_vec_with_registry!(
		"provision_active_servers",
		"Servers that are completely installed.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id", "pool_type"],
		*REGISTRY,
	).unwrap();
	pub static ref NOMAD_SERVERS: IntGaugeVec = register_int_gauge_vec_with_registry!(
		"provision_nomad_servers",
		"Job servers with nomad connected.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id"],
		*REGISTRY,
	).unwrap();
	pub static ref PEGBOARD_SERVERS: IntGaugeVec = register_int_gauge_vec_with_registry!(
		"provision_pegboard_servers",
		"Servers with pegboard connected running containers.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id"],
		*REGISTRY,
	).unwrap();
	pub static ref PEGBOARD_ISOLATE_SERVERS: IntGaugeVec = register_int_gauge_vec_with_registry!(
		"provision_pegboard_isolate_servers",
		"Servers with pegboard connected running isolates.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id"],
		*REGISTRY,
	).unwrap();
	pub static ref DRAINING_SERVERS: IntGaugeVec = register_int_gauge_vec_with_registry!(
		"provision_draining_servers",
		"Servers being drained.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id", "pool_type"],
		*REGISTRY,
	).unwrap();
	pub static ref TAINTED_SERVERS: IntGaugeVec = register_int_gauge_vec_with_registry!(
		"provision_tainted_servers",
		"Tainted servers.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id", "pool_type"],
		*REGISTRY,
	).unwrap();
	pub static ref DRAINING_TAINTED_SERVERS: IntGaugeVec = register_int_gauge_vec_with_registry!(
		"provision_draining_tainted_servers",
		"Draining and tainted servers.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id", "pool_type"],
		*REGISTRY,
	).unwrap();

	pub static ref PROVISION_DURATION: HistogramVec = register_histogram_vec_with_registry!(
		"provision_provision_duration",
		"Time from created to provisioned.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id", "pool_type"],
		PROVISION_BUCKETS.to_vec(),
		*REGISTRY,
	).unwrap();
	pub static ref INSTALL_DURATION: HistogramVec = register_histogram_vec_with_registry!(
		"provision_install_duration",
		"Time from provisioned to installed.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id", "pool_type"],
		PROVISION_BUCKETS.to_vec(),
		*REGISTRY,
	).unwrap();
	pub static ref NOMAD_JOIN_DURATION: HistogramVec = register_histogram_vec_with_registry!(
		"provision_nomad_join_duration",
		"Time from installed to Nomad joined.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id"],
		PROVISION_BUCKETS.to_vec(),
		*REGISTRY,
	).unwrap();
	pub static ref PEGBOARD_JOIN_DURATION: HistogramVec = register_histogram_vec_with_registry!(
		"provision_pegboard_join_duration",
		"Time from installed to Pegboard joined.",
		&["cluster_id", "datacenter_id", "provider_datacenter_id", "datacenter_name_id"],
		PROVISION_BUCKETS.to_vec(),
		*REGISTRY,
	).unwrap();

	pub static ref NONREPORTING_SERVER: IntGaugeVec = register_int_gauge_vec_with_registry!(
		"provision_nonreporting_server",
		"Servers without reporting Prometheus metrics.",
		&["cluster_id", "datacenter_id", "server_id", "provider_datacenter_id", "datacenter_name_id", "pool_type"],
		*REGISTRY,
	).unwrap();
}
