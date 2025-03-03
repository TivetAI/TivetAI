use api_helper::define_router;
use hyper::{Body, Request, Response};
use tivet_operation::prelude::*;

pub async fn handle(
	shared_client: chirp_client::SharedClientHandle,
	config: tivet_config::Config,
	pools: tivet_pools::Pools,
	cache: tivet_cache::Cache,
	ray_id: uuid::Uuid,
	request: Request<Body>,
) -> Result<Response<Body>, http::Error> {
	let response = Response::builder();

	// Handle route
	Router::handle(
		shared_client,
		config,
		pools,
		cache,
		ray_id,
		request,
		response,
	)
	.await
}

define_router! {
	routes: {},
	mounts: [
		{
			path: api_traefik_provider::route::Router,
			prefix: "traefik-provider",
		},
		{
			path: api_provision::route::Router,
			prefix: "provision",
		},
	],
}
