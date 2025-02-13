use tivet_pools::prelude::*;

// NOTE: Cannot be moved into `global_error` due to cyclical dependency error with `tivet_cache`
/// Represents internal errors from the worker manager.
#[derive(thiserror::Error, Debug)]
pub enum ManagerError {
	#[error("tivet runtime: {0}")]
	TivetRuntime(#[from] tivet_runtime::Error),

	#[error("join error: {0}")]
	JoinError(#[from] tokio::task::JoinError),

	#[error("tokio spawn: {0}")]
	TokioSpawn(std::io::Error),

	#[error("pools: {0}")]
	Pools(#[from] tivet_pools::Error),

	#[error("missing environment variable: {0}")]
	MissingEnvVar(String),

	#[error("invalid env var {key}: {message}")]
	InvalidEnvVar { key: String, message: String },

	#[error("request task timed out")]
	RequestTaskTimedOut,

	#[error("encode response: {0}")]
	EncodeResponse(prost::EncodeError),

	#[error("encode response body: {0}")]
	EncodeResponseBody(prost::EncodeError),

	#[error("request respond: {0}")]
	RequestRespond(nats::PublishError),

	#[error("recursive request to {worker_name}")]
	RecursiveRequest { worker_name: String },

	#[error("missing nats reply")]
	MissingNatsReply,

	#[error("build redis: {0}")]
	BuildRedis(redis::RedisError),

	#[error("parse redis url: {0}")]
	ParseRedisUrl(url::ParseError),

	#[error("modify redis url")]
	ModifyRedisUrl,

	#[error("{0}")]
	Global(global_error::GlobalError),
}
