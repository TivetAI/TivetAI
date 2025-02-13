use chirp_worker::prelude::*;
use tivet_claims::ClaimsDecode;

#[worker_test]
async fn basic(ctx: TestCtx) {
	let link_res = op!([ctx] cloud_device_link_create {}).await.unwrap();
	let claims = tivet_claims::decode(&ctx.config().server()?.jwt.public, &link_res.token)
		.unwrap()
		.unwrap();
	tracing::info!(?claims, "claims");
	let ent = claims.as_cloud_device_link().unwrap();
	tracing::info!(?ent, "ent");
}
