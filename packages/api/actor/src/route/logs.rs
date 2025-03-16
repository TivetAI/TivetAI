use api_helper::{
	anchor::{WatchIndexQuery, WatchResponse},
	ctx::Ctx,
};
use proto::backend::{self, pkg::*};
use tivet_api::models;
use tivet_operation::prelude::*;
use serde::Deserialize;
use std::time::Duration;

use crate::{
	assert,
	auth::{Auth, CheckOpts, CheckOutput},
	utils::build_global_query_compat,
};

use super::GlobalQuery;

// MARK: GET /actors/{}/logs
#[derive(Debug, Deserialize)]
pub struct GetActorLogsQuery {
	#[serde(flatten)]
	pub global: GlobalQuery,
	pub stream: models::CloudGamesLogStream,
}

pub async fn get_logs(
	ctx: Ctx<Auth>,
	server_id: Uuid,
	watch_index: WatchIndexQuery,
	query: GetActorLogsQuery,
) -> GlobalResult<models::ActorGetActorLogsResponse> {
	let CheckOutput { game_id, env_id } = ctx
		.auth()
		.check(
			ctx.op_ctx(),
			CheckOpts {
				query: &query.global,
				allow_service_token: false,
				opt_auth: false,
			},
		)
		.await?;

	// Validate server belongs to game
	assert::server_for_env(&ctx, server_id, game_id, env_id, None).await?;

	// Determine stream type
	let stream_type = match query.stream {
		models::CloudGamesLogStream::StdOut => backend::job::log::StreamType::StdOut,
		models::CloudGamesLogStream::StdErr => backend::job::log::StreamType::StdErr,
	};

	// Timestamp to start the query at
	let before_nts = util::timestamp::now() * 1_000_000;

	// Handle anchor
	let logs_res = if let Some(anchor) = watch_index.as_i64()? {
		let query_start = tokio::time::Instant::now();

		// Poll for new logs
		let logs_res = loop {
			// Read logs after the timestamp
			//
			// We read descending in order to get at most 256 of the most recent logs. If we used
			// asc, we would be paginating through all the logs which would likely fall behind
			// actual stream and strain the database.
			//
			// We return fewer logs than the non-anchor request since this will be called
			// frequently and should not return a significant amount of logs.
			let logs_res = op!([ctx] @dont_log_body ds_log_read {
				server_id: Some(server_id.into()),
				stream_type: stream_type as i32,
				count: 64,
				order_asc: false,
				query: Some(ds_log::read::request::Query::AfterNts(anchor))

			})
			.await?;

			// Return logs
			if !logs_res.entries.is_empty() {
				break logs_res;
			}

			// Timeout cleanly
			if query_start.elapsed().as_millis() > util::watch::DEFAULT_TIMEOUT as u128 {
				break ds_log::read::Response {
					entries: Vec::new(),
				};
			}

			// Throttle request
			//
			// We don't use `tokio::time::interval` because if the request takes longer than 500
			// ms, we'll enter a tight loop of requests.
			tokio::time::sleep(Duration::from_millis(500)).await;
		};

		// Since we're using watch, we don't want this request to return immediately if there's new
		// results. Add an artificial timeout in order to prevent a tight loop if there's a high
		// log frequency.
		tokio::time::sleep_until(query_start + Duration::from_secs(1)).await;

		logs_res
	} else {
		// Read most recent logs

		op!([ctx] @dont_log_body ds_log_read {
			server_id: Some(server_id.into()),
			stream_type: stream_type as i32,
			count: 256,
			order_asc: false,
			query: Some(ds_log::read::request::Query::BeforeNts(before_nts)),
		})
		.await?
	};

	// Convert logs
	let mut lines = logs_res
		.entries
		.iter()
		.map(|entry| base64::encode(&entry.message))
		.collect::<Vec<_>>();
	let mut timestamps = logs_res
		.entries
		.iter()
		.map(|x| x.nts / 1_000_000)
		.map(util::timestamp::to_string)
		.collect::<Result<Vec<_>, _>>()?;

	// Order desc
	lines.reverse();
	timestamps.reverse();

	let watch_nts = logs_res.entries.first().map_or(before_nts, |x| x.nts);
	Ok(models::ActorGetActorLogsResponse {
		lines,
		timestamps,
		watch: WatchResponse::new_as_model(watch_nts),
	})
}

pub async fn get_logs_deprecated(
	ctx: Ctx<Auth>,
	game_id: Uuid,
	env_id: Uuid,
	server_id: Uuid,
	watch_index: WatchIndexQuery,
	query: GetActorLogsQuery,
) -> GlobalResult<models::ServersGetServerLogsResponse> {
	let global = build_global_query_compat(&ctx, game_id, env_id).await?;
	let logs_res = get_logs(
		ctx,
		server_id,
		watch_index,
		GetActorLogsQuery {
			global,
			stream: query.stream,
		},
	)
	.await?;
	Ok(models::ServersGetServerLogsResponse {
		lines: logs_res.lines,
		timestamps: logs_res.timestamps,
		watch: logs_res.watch,
	})
}

use metrics::{increment_counter, histogram!};

let start_ts = std::time::Instant::now();

// Log metrics (count and latency)
increment_counter!(
	"logs_requested_total",
	"stream" => format!("{:?}", query.stream),
	"game_id" => game_id.to_string()
);

histogram!(
	"logs_request_duration_seconds",
	start_ts.elapsed().as_secs_f64(),
	"stream" => format!("{:?}", query.stream),
	"game_id" => game_id.to_string()
);

tracing::info!(
	?game_id,
	?env_id,
	?server_id,
	stream = ?query.stream,
	"Fetching logs"
);

if watch_index.as_i64()?.is_some() {
	tracing::debug!("Using anchored log watch mode");
} else {
	tracing::debug!("Fetching latest logs (non-watch)");
}

use regex::Regex;

#[derive(Debug, Deserialize)]
pub struct GetActorLogsQuery {
	#[serde(flatten)]
	pub global: GlobalQuery,
	pub stream: models::CloudGamesLogStream,
	pub filter: Option<String>, // Optional regex filter
}

if let Some(ref pattern) = query.filter {
	let re = Regex::new(pattern).map_err(|_| err_code!(BAD_REQUEST, "invalid_regex"))?;
	let mut filtered = Vec::new();
	let mut filtered_timestamps = Vec::new();
	for (line, ts) in lines.into_iter().zip(timestamps.into_iter()) {
		if let Ok(decoded) = base64::decode(&line) {
			if let Ok(text) = std::str::from_utf8(&decoded) {
				if re.is_match(text) {
					filtered.push(line);
					filtered_timestamps.push(ts);
				}
			}
		}
	}
	lines = filtered;
	timestamps = filtered_timestamps;
}

#[derive(Debug, Deserialize)]
pub struct GetActorLogsQuery {
	#[serde(flatten)]
	pub global: GlobalQuery,
	pub stream: models::CloudGamesLogStream,
	pub filter: Option<String>,
	pub offset: Option<u32>,
	pub limit: Option<u32>,
}

let offset = query.offset.unwrap_or(0) as usize;
let limit = query.limit.unwrap_or(256) as usize;
let end = usize::min(lines.len(), offset + limit);

lines = lines.get(offset..end).unwrap_or(&[]).to_vec();
timestamps = timestamps.get(offset..end).unwrap_or(&[]).to_vec();


op!([ctx] audit_log {
	action: "logs.fetch",
	entity: Some("server".into()),
	entity_id: Some(server_id.to_string()),
	details: format!("Stream: {:?}, Filter: {:?}", query.stream, query.filter),
})
.await
.ok(); // log but don't block if fails
