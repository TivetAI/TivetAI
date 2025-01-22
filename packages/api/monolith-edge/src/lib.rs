use tivet_operation::prelude::*;

pub mod route;

pub async fn start(config: tivet_config::Config, pools: tivet_pools::Pools) -> GlobalResult<()> {
	api_helper::start(
		config.clone(),
		pools,
		"edge",
		config.server()?.tivet.api_edge.host(),
		config.server()?.tivet.api_edge.port(),
		route::handle,
	)
	.await
}
