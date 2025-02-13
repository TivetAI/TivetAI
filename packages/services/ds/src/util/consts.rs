use chirp_workflow::prelude::*;

pub const LOBBY_READY_TIMEOUT: i64 = util::duration::minutes(5);
pub const PLAYER_READY_TIMEOUT: i64 = util::duration::minutes(2);
pub const PLAYER_AUTO_REMOVE_TIMEOUT: i64 = util::duration::hours(8);

/// Constants used for mocking responses when using dev tokens.
pub const DEV_REGION_ID: &str = "dev-lcl";
pub const DEV_PROVIDER_NAME: &str = "Development";
pub const DEV_REGION_NAME: &str = "Local";

// Also see svc/mm-lobby-create/src/nomad_job.rs
pub const DEFAULT_ENV_KEYS: &[&str] = &[
	"TIVET_API_ENDPOINT",
	"TIVET_CHAT_API_URL",
	"TIVET_GROUP_API_URL",
	"TIVET_IDENTITY_API_URL",
	"TIVET_KV_API_URL",
	"TIVET_MATCHMAKER_API_URL",
	"TIVET_NAMESPACE_NAME",
	"TIVET_NAMESPACE_ID",
	"TIVET_VERSION_NAME",
	"TIVET_VERSION_ID",
	"TIVET_GAME_MODE_ID",
	"TIVET_GAME_MODE_NAME",
	"TIVET_LOBBY_ID",
	"TIVET_TOKEN",
	"TIVET_REGION_ID",
	"TIVET_REGION_NAME",
	"TIVET_MAX_PLAYERS_NORMAL",
	"TIVET_MAX_PLAYERS_DIRECT",
	"TIVET_MAX_PLAYERS_PARTY",
	"TIVET_LOBBY_TOKEN",
	"TIVET_LOBBY_GROUP_ID",
	"TIVET_LOBBY_GROUP_NAME",
];
