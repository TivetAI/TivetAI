use chirp_workflow::prelude::*;
use tracing_subscriber::prelude::*;

#[tokio::test(flavor = "multi_thread")]
async fn basic() {
	if !util::feature::server_provision() {
		return;
	}

	tracing_subscriber::registry()
		.with(
			tracing_logfmt::builder()
				.layer()
				.with_filter(tracing_subscriber::filter::LevelFilter::INFO),
		)
		.init();

	let _ctx = TestCtx::from_env("cluster-datacenter-tls-renew-test").await;
	let _pools = tivet_pools::Pools::new(config).await.await.unwrap();

	// TODO:
}
