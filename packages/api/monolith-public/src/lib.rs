use tivet_operation::prelude::*;

pub mod route;

pub async fn start(config: tivet_config::Config, pools: tivet_pools::Pools) -> GlobalResult<()> {
	api_helper::start(
		config.clone(),
		pools,
		"public",
		config.server()?.tivet.api_public.host(),
		config.server()?.tivet.api_public.port(),
		route::handle,
	)
	.await
}
