use global_error::GlobalResult;
use tivet_pools::prelude::*;
use serde::Serialize;
use uuid::Uuid;

use crate::{
	builder::common as builder,
	ctx::common,
	db::DatabaseHandle,
	operation::{Operation, OperationInput},
	signal::Signal,
};

#[derive(Clone)]
pub struct OperationCtx {
	ray_id: Uuid,
	name: &'static str,
	ts: i64,

	db: DatabaseHandle,

	config: tivet_config::Config,
	conn: tivet_connection::Connection,

	// Backwards compatibility
	op_ctx: tivet_operation::OperationContext<()>,
}

impl OperationCtx {
	pub fn new(
		db: DatabaseHandle,
		config: &tivet_config::Config,
		conn: &tivet_connection::Connection,
		ray_id: Uuid,
		req_ts: i64,
		from_workflow: bool,
		name: &'static str,
	) -> Self {
		let ts = tivet_util::timestamp::now();
		let req_id = Uuid::new_v4();
		let conn = conn.wrap(req_id, ray_id, name);
		let mut op_ctx = tivet_operation::OperationContext::new(
			name.to_string(),
			std::time::Duration::from_secs(60),
			config.clone(),
			conn.clone(),
			req_id,
			ray_id,
			ts,
			req_ts,
			(),
		);
		op_ctx.from_workflow = from_workflow;

		OperationCtx {
			ray_id,
			name,
			ts,
			db,
			config: config.clone(),
			conn,
			op_ctx,
		}
	}
}

impl OperationCtx {
	#[tracing::instrument(err, skip_all, fields(operation = I::Operation::NAME))]
	pub async fn op<I>(
		&self,
		input: I,
	) -> GlobalResult<<<I as OperationInput>::Operation as Operation>::Output>
	where
		I: OperationInput,
		<I as OperationInput>::Operation: Operation<Input = I>,
	{
		common::op(
			&self.db,
			&self.config,
			&self.conn,
			self.ray_id,
			self.op_ctx.req_ts(),
			self.op_ctx.from_workflow(),
			input,
		)
		.await
	}

	/// Creates a signal builder.
	pub fn signal<T: Signal + Serialize>(&self, body: T) -> builder::signal::SignalBuilder<T> {
		builder::signal::SignalBuilder::new(self.db.clone(), self.ray_id, body)
	}
}

impl OperationCtx {
	pub fn name(&self) -> &str {
		self.name
	}

	pub fn req_id(&self) -> Uuid {
		self.op_ctx.req_id()
	}

	pub fn ray_id(&self) -> Uuid {
		self.ray_id
	}

	/// Timestamp at which the request started.
	pub fn ts(&self) -> i64 {
		self.ts
	}

	/// Timestamp at which the request was published.
	pub fn req_ts(&self) -> i64 {
		self.op_ctx.req_ts()
	}

	/// Time between when the timestamp was processed and when it was published.
	pub fn req_dt(&self) -> i64 {
		self.ts.saturating_sub(self.op_ctx.req_ts())
	}

	pub fn config(&self) -> &tivet_config::Config {
		&self.config
	}

	pub fn trace(&self) -> &[chirp_client::TraceEntry] {
		self.conn.trace()
	}

	pub fn chirp(&self) -> &chirp_client::Client {
		self.conn.chirp()
	}

	pub fn cache(&self) -> tivet_cache::RequestConfig {
		self.conn.cache()
	}

	pub fn cache_handle(&self) -> tivet_cache::Cache {
		self.conn.cache_handle()
	}

	pub async fn crdb(&self) -> Result<CrdbPool, tivet_pools::Error> {
		self.conn.crdb().await
	}

	pub async fn redis_cache(&self) -> Result<RedisPool, tivet_pools::Error> {
		self.conn.redis_cache().await
	}

	pub async fn redis_cdn(&self) -> Result<RedisPool, tivet_pools::Error> {
		self.conn.redis_cdn().await
	}

	pub async fn redis_job(&self) -> Result<RedisPool, tivet_pools::Error> {
		self.conn.redis_job().await
	}

	pub async fn redis_mm(&self) -> Result<RedisPool, tivet_pools::Error> {
		self.conn.redis_mm().await
	}

	pub async fn clickhouse(&self) -> GlobalResult<ClickHousePool> {
		self.conn.clickhouse().await
	}

	// Backwards compatibility
	pub fn op_ctx(&self) -> &tivet_operation::OperationContext<()> {
		&self.op_ctx
	}
}
