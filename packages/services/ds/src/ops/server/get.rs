use std::{
	collections::{HashMap, HashSet},
	convert::TryInto,
};

use chirp_workflow::prelude::*;

use crate::types::{
	EndpointType, GameGuardProtocol, HostProtocol, NetworkMode, Port, PortAuthorization,
	PortAuthorizationType, Routing, Server, ServerLifecycle, ServerResources,
};

#[derive(sqlx::FromRow)]
struct ServerRow {
	server_id: Uuid,
	env_id: Uuid,
	datacenter_id: Uuid,
	cluster_id: Uuid,
	tags: sqlx::types::Json<HashMap<String, String>>,
	resources_cpu_millicores: i64,
	resources_memory_mib: i64,
	lifecycle_kill_timeout_ms: i64,
	lifecycle_durable: bool,
	create_ts: i64,
	start_ts: Option<i64>,
	connectable_ts: Option<i64>,
	destroy_ts: Option<i64>,
	image_id: Uuid,
	args: Vec<String>,
	network_mode: i64,
	environment: sqlx::types::Json<HashMap<String, String>>,
}

#[derive(sqlx::FromRow)]
struct ServerPortGg {
	server_id: Uuid,
	port_name: String,
	port_number: Option<i64>,
	gg_port: i64,
	protocol: i64,

	auth_type: Option<i64>,
	auth_key: Option<String>,
	auth_value: Option<String>,
}

#[derive(sqlx::FromRow)]
struct ServerPortHost {
	server_id: Uuid,
	port_name: String,
	protocol: i64,
}

#[derive(sqlx::FromRow)]
struct ServerNomad {
	server_id: Uuid,
	nomad_alloc_plan_ts: Option<i64>,
	nomad_node_public_ipv4: Option<String>,
}

#[derive(sqlx::FromRow)]
struct ServerPegboard {
	server_id: Uuid,
	running_ts: Option<i64>,
	wan_hostname: Option<String>,
}

#[derive(sqlx::FromRow)]
struct ProxiedPort {
	server_id: Uuid,
	label: String,
	source: i64,
}

#[derive(Debug)]
pub struct Input {
	pub server_ids: Vec<Uuid>,

	/// If null, will fall back to the default endpoint type for the datacenter.
	///
	/// If the datacenter has a parent hostname, will use hostname endpoint. Otherwise, will use
	/// path endpoint.
	pub endpoint_type: Option<crate::types::EndpointType>,
}

#[derive(Debug)]
pub struct Output {
	pub servers: Vec<Server>,
}

#[operation]
pub async fn ds_server_get(ctx: &OperationCtx, input: &Input) -> GlobalResult<Output> {
	let (
		server_rows,
		port_gg_rows,
		port_host_rows,
		proxied_port_rows,
		server_nomad_rows,
		server_pegboard_rows,
	) = tokio::try_join!(
		sql_fetch_all!(
			[ctx, ServerRow]
			"
			SELECT
				server_id,
				env_id,
				datacenter_id,
				cluster_id,
				tags,
				resources_cpu_millicores,
				resources_memory_mib,
				lifecycle_kill_timeout_ms,
				lifecycle_durable,
				create_ts,
				start_ts,
				connectable_ts,
				destroy_ts,
				image_id,
				args,
				network_mode,
				environment
			FROM db_ds.servers
			WHERE server_id = ANY($1)
			",
			&input.server_ids,
		),
		sql_fetch_all!(
			[ctx, ServerPortGg]
			"
			SELECT
				p.server_id,
				p.port_name,
				p.port_number,
				p.gg_port,
				p.protocol,
				a.auth_type,
				a.key AS auth_key,
				a.value AS auth_value
			FROM db_ds.server_ports_gg AS p
			LEFT JOIN db_ds.server_ports_gg_auth AS a
			ON
				p.server_id = a.server_id AND
				p.port_name = a.port_name
			WHERE p.server_id = ANY($1)
			",
			&input.server_ids,
		),
		sql_fetch_all!(
			[ctx, ServerPortHost]
			"
			SELECT
				server_id,
				port_name,
				protocol
			FROM db_ds.server_ports_host
			WHERE server_id = ANY($1)
			",
			&input.server_ids,
		),
		sql_fetch_all!(
			[ctx, ProxiedPort]
			"
			SELECT
				server_id,
				label,
				source
			FROM db_ds.server_proxied_ports
			WHERE server_id = ANY($1)
			",
			&input.server_ids,
		),
		sql_fetch_all!(
			[ctx, ServerNomad]
			"
			SELECT
				server_id,
				nomad_alloc_plan_ts,
				nomad_node_public_ipv4
			FROM db_ds.server_nomad
			WHERE server_id = ANY($1)
			",
			&input.server_ids,
		),
		sql_fetch_all!(
			[ctx, ServerPegboard]
			"
			SELECT
				ds.server_id AS server_id,
				a.running_ts AS running_ts,
				(c.config->'network'->>'wan_hostname') AS wan_hostname
			FROM db_ds.servers_pegboard AS ds
			JOIN db_pegboard.actors AS a
			ON ds.pegboard_actor_id = a.actor_id
			JOIN db_pegboard.clients AS c
			ON a.client_id = c.client_id
			WHERE ds.server_id = ANY($1)
			",
			&input.server_ids,
		),
	)?;

	// Fetch datacenters
	let datacenter_ids = server_rows
		.iter()
		.map(|s| s.datacenter_id)
		.collect::<HashSet<Uuid>>()
		.into_iter()
		.collect::<Vec<_>>();
	let dc_res = ctx
		.op(cluster::ops::datacenter::get::Input { datacenter_ids })
		.await?;

	let servers = input
		.server_ids
		.iter()
		.filter_map(|server_id| server_rows.iter().find(|x| x.server_id == *server_id))
		.map(|server| {
			// Get the associated datacenter
			let dc = dc_res
				.datacenters
				.iter()
				.find(|dc| dc.datacenter_id == server.datacenter_id);
			let dc = unwrap!(dc, "unable to find dc {} for server", server.datacenter_id);
			let endpoint_type =
				input
					.endpoint_type
					.unwrap_or(EndpointType::default_for_guard_public_hostname(
						&dc.guard_public_hostname,
					));

			// TODO: Handle timeout to let Traefik pull config
			let (is_nomad, is_connectable, wan_hostname) = if let Some(server_nomad) =
				server_nomad_rows
					.iter()
					.find(|x| x.server_id == server.server_id)
			{
				(
					true,
					server_nomad.nomad_alloc_plan_ts.is_some(),
					server_nomad.nomad_node_public_ipv4.clone(),
				)
			} else if let Some(server_pb) = server_pegboard_rows
				.iter()
				.find(|x| x.server_id == server.server_id)
			{
				(
					false,
					server_pb.running_ts.is_some(),
					server_pb.wan_hostname.clone(),
				)
			} else {
				// Neither nomad nor pegboard server attached
				(false, false, None)
			};

			let ports = port_gg_rows
				.iter()
				.filter(|p| p.server_id == server.server_id)
				.map(|gg_port| {
					Ok((
						gg_port.port_name.clone(),
						create_port_gg(
							is_connectable,
							gg_port,
							unwrap!(GameGuardProtocol::from_repr(gg_port.protocol.try_into()?)),
							endpoint_type,
							&dc.guard_public_hostname,
						)?,
					))
				})
				.chain(
					port_host_rows
						.iter()
						.filter(|p| p.server_id == server.server_id)
						.map(|host_port| {
							let proxied_port = proxied_port_rows.iter().find(|x| {
								if x.server_id == server.server_id {
									// Find the label to compare to based on the driver
									let transformed_label = if is_nomad {
										crate::util::nomad_prefix_port_label(&host_port.port_name)
									} else {
										crate::util::pegboard_normalize_port_label(
											&host_port.port_name,
										)
									};

									x.label == transformed_label
								} else {
									false
								}
							});

							Ok((
								host_port.port_name.clone(),
								create_port_host(
									is_connectable,
									wan_hostname.as_deref(),
									host_port,
									proxied_port,
								)?,
							))
						}),
				)
				.collect::<GlobalResult<HashMap<_, _>>>()?;

			Ok(Server {
				server_id: server.server_id,
				env_id: server.env_id,
				datacenter_id: server.datacenter_id,
				cluster_id: server.cluster_id,
				tags: server.tags.0.clone(),
				resources: ServerResources {
					cpu_millicores: server.resources_cpu_millicores.try_into()?,
					memory_mib: server.resources_memory_mib.try_into()?,
				},
				lifecycle: ServerLifecycle {
					kill_timeout_ms: server.lifecycle_kill_timeout_ms,
					durable: server.lifecycle_durable,
				},
				args: server.args.clone(),
				environment: server.environment.0.clone(),
				image_id: server.image_id,
				network_mode: unwrap!(NetworkMode::from_repr(server.network_mode.try_into()?)),
				network_ports: ports,
				create_ts: server.create_ts,
				start_ts: server.start_ts,
				connectable_ts: server.connectable_ts,
				destroy_ts: server.destroy_ts,
			})
		})
		.collect::<GlobalResult<Vec<_>>>()?;

	Ok(Output { servers })
}

fn create_port_gg(
	is_connectable: bool,
	gg_port: &ServerPortGg,
	protocol: GameGuardProtocol,
	endpoint_type: EndpointType,
	guard_public_hostname: &cluster::types::GuardPublicHostname,
) -> GlobalResult<Port> {
	let (public_hostname, public_port, public_path) = if is_connectable {
		let (hostname, path) = crate::util::build_ds_hostname_and_path(
			gg_port.server_id,
			&gg_port.port_name,
			protocol,
			endpoint_type,
			guard_public_hostname,
		)?;
		let port = gg_port.gg_port.try_into()?;
		(Some(hostname), Some(port), path)
	} else {
		(None, None, None)
	};

	Ok(Port {
		internal_port: gg_port.port_number.map(TryInto::try_into).transpose()?,
		public_hostname,
		public_port,
		public_path,
		routing: Routing::GameGuard {
			protocol,
			authorization: {
				let authorization_type = if let Some(auth_type) = gg_port.auth_type {
					unwrap!(PortAuthorizationType::from_repr(auth_type.try_into()?))
				} else {
					PortAuthorizationType::None
				};

				match authorization_type {
					PortAuthorizationType::None => PortAuthorization::None,
					PortAuthorizationType::Bearer => {
						PortAuthorization::Bearer(unwrap!(gg_port.auth_value.clone()))
					}
					PortAuthorizationType::Query => PortAuthorization::Query(
						unwrap!(gg_port.auth_key.clone()),
						unwrap!(gg_port.auth_value.clone()),
					),
				}
			},
		},
	})
}

fn create_port_host(
	is_connectable: bool,
	wan_hostname: Option<&str>,
	host_port: &ServerPortHost,
	proxied_port: Option<&ProxiedPort>,
) -> GlobalResult<Port> {
	Ok(Port {
		internal_port: None,
		public_hostname: if is_connectable {
			proxied_port.and(wan_hostname).map(|x| x.to_string())
		} else {
			None
		},
		public_port: if is_connectable {
			proxied_port.map(|x| x.source.try_into()).transpose()?
		} else {
			None
		},
		public_path: None,
		routing: Routing::Host {
			protocol: unwrap!(HostProtocol::from_repr(host_port.protocol.try_into()?)),
		},
	})
}
