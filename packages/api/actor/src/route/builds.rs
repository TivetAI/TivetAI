use std::collections::HashMap;

use api_helper::{anchor::WatchIndexQuery, ctx::Ctx};
use futures_util::{StreamExt, TryStreamExt};
use tivet_api::models;
use tivet_convert::{ApiInto, ApiTryInto};
use tivet_operation::prelude::*;
use serde::Deserialize;
use serde_json::json;
use util::timestamp;

use crate::{
	auth::{Auth, CheckOpts, CheckOutput},
	utils::build_global_query_compat,
};

use super::GlobalQuery;

// MARK: GET /builds/{}
pub async fn get(
	ctx: Ctx<Auth>,
	build_id: Uuid,
	_watch_index: WatchIndexQuery,
	query: GlobalQuery,
) -> GlobalResult<models::ActorGetBuildResponse> {
	let CheckOutput { env_id, .. } = ctx
		.auth()
		.check(
			ctx.op_ctx(),
			CheckOpts {
				query: &query,
				allow_service_token: true,
				opt_auth: false,
			},
		)
		.await?;

	let builds_res = ctx
		.op(build::ops::get::Input {
			build_ids: vec![build_id],
		})
		.await?;
	let build = unwrap_with!(builds_res.builds.first(), BUILD_NOT_FOUND);
	ensure_with!(
		unwrap_with!(build.env_id, BUILD_NOT_FOUND) == env_id,
		BUILD_NOT_FOUND
	);

	let uploads_res = op!([ctx] upload_get {
		upload_ids: vec![build.upload_id.into()],
	})
	.await?;
	let upload = unwrap!(uploads_res.uploads.first());

	let build = models::ActorBuild {
		id: build.build_id,
		name: build.display_name.clone(),
		created_at: timestamp::to_string(build.create_ts)?,
		content_length: upload.content_length.api_try_into()?,
		tags: build.tags.clone(),
	};

	Ok(models::ActorGetBuildResponse {
		build: Box::new(build),
	})
}

pub async fn get_deprecated(
	ctx: Ctx<Auth>,
	game_id: Uuid,
	env_id: Uuid,
	build_id: Uuid,
	watch_index: WatchIndexQuery,
) -> GlobalResult<models::ServersGetBuildResponse> {
	let global = build_global_query_compat(&ctx, game_id, env_id).await?;
	let builds_res = get(ctx, build_id, watch_index, global).await?;
	Ok(models::ServersGetBuildResponse {
		build: Box::new(models::ServersBuild {
			content_length: builds_res.build.content_length,
			created_at: builds_res.build.created_at,
			id: builds_res.build.id,
			name: builds_res.build.name,
			tags: builds_res.build.tags,
		}),
	})
}

// MARK: GET /builds
#[derive(Debug, Clone, Deserialize)]
pub struct ListQuery {
	#[serde(flatten)]
	global: GlobalQuery,
	tags_json: Option<String>,
}

pub async fn list(
	ctx: Ctx<Auth>,
	_watch_index: WatchIndexQuery,
	query: ListQuery,
) -> GlobalResult<models::ActorListBuildsResponse> {
	let CheckOutput { env_id, .. } = ctx
		.auth()
		.check(
			ctx.op_ctx(),
			CheckOpts {
				query: &query.global,
				allow_service_token: true,
				opt_auth: false,
			},
		)
		.await?;

	let list_res = op!([ctx] build_list_for_env {
		env_id: Some(env_id.into()),
		tags: query.tags_json.as_deref().map_or(Ok(HashMap::new()), serde_json::from_str)?,
	})
	.await?;

	let builds_res = op!([ctx] build_get {
		build_ids: list_res.build_ids.clone(),
	})
	.await?;

	let uploads_res = op!([ctx] upload_get {
		upload_ids: builds_res
			.builds
			.iter()
			.flat_map(|build| build.upload_id)
			.collect::<Vec<_>>(),
	})
	.await?;

	// Convert the build data structures
	let mut builds = builds_res
		.builds
		.iter()
		.filter_map(|build| {
			uploads_res
				.uploads
				.iter()
				.find(|u| u.upload_id == build.upload_id)
				.map(|upload| (build, upload))
		})
		.map(|(build, upload)| {
			GlobalResult::Ok((
				build.create_ts,
				models::ActorBuild {
					id: unwrap!(build.build_id).as_uuid(),
					name: build.display_name.clone(),
					created_at: timestamp::to_string(build.create_ts)?,
					content_length: upload.content_length.api_try_into()?,
					tags: build.tags.clone(),
				},
			))
		})
		.collect::<Result<Vec<_>, _>>()?;

	// Sort by date desc
	builds.sort_by_key(|(create_ts, _)| *create_ts);
	builds.reverse();

	Ok(models::ActorListBuildsResponse {
		builds: builds.into_iter().map(|(_, x)| x).collect::<Vec<_>>(),
	})
}

pub async fn list_deprecated(
	ctx: Ctx<Auth>,
	game_id: Uuid,
	env_id: Uuid,
	watch_index: WatchIndexQuery,
	query: ListQuery,
) -> GlobalResult<models::ServersListBuildsResponse> {
	let global = build_global_query_compat(&ctx, game_id, env_id).await?;
	let builds_res = list(
		ctx,
		watch_index,
		ListQuery {
			global,

			tags_json: query.tags_json,
		},
	)
	.await?;
	Ok(models::ServersListBuildsResponse {
		builds: builds_res
			.builds
			.into_iter()
			.map(|b| models::ServersBuild {
				content_length: b.content_length,
				created_at: b.created_at,
				id: b.id,
				name: b.name,
				tags: b.tags,
			})
			.collect(),
	})
}

// MARK: PATCH /builds/{}/tags
pub async fn patch_tags(
	ctx: Ctx<Auth>,
	build_id: Uuid,
	body: models::ActorPatchBuildTagsRequest,
	query: GlobalQuery,
) -> GlobalResult<serde_json::Value> {
	let CheckOutput { env_id, .. } = ctx
		.auth()
		.check(
			ctx.op_ctx(),
			CheckOpts {
				query: &query,
				allow_service_token: true,
				opt_auth: false,
			},
		)
		.await?;

	let tags = unwrap_with!(body.tags, API_BAD_BODY, error = "missing field `tags`");

	ensure_with!(
		tags.as_object().map(|x| x.len()).unwrap_or_default() <= 8,
		ACTOR_BUILD_INVALID_PATCH_CONFIG,
		error = "Too many tags (max 8)."
	);

	let tags = serde_json::from_value::<HashMap<String, Option<String>>>(tags)
		.map_err(|err| err_code!(API_BAD_BODY, error = err))?;

	for (k, v) in &tags {
		ensure_with!(
			!k.is_empty(),
			API_BAD_BODY,
			error = "tags[]: Tag label cannot be empty."
		);
		ensure_with!(
			k.len() <= 32,
			ACTOR_BUILD_INVALID_PATCH_CONFIG,
			error = format!(
				"tags[{:?}]: Tag label too large (max 32).",
				util::safe_slice(k, 0, 32),
			)
		);
		if let Some(v) = v {
			ensure_with!(
				!v.is_empty(), API_BAD_BODY,
				error = "tags[{k:?}]: Tag value cannot be an empty string. Try setting it to null instead."
			);
			ensure_with!(
				v.len() <= 1024,
				ACTOR_BUILD_INVALID_PATCH_CONFIG,
				error = format!("tags[k:?]: Tag value too large (max 1024 bytes).")
			);
		}
	}

	let builds_res = ctx
		.op(build::ops::get::Input {
			build_ids: vec![build_id],
		})
		.await?;
	let build = unwrap_with!(builds_res.builds.first(), BUILD_NOT_FOUND);

	ensure_with!(
		unwrap_with!(build.env_id, BUILD_NOT_FOUND) == env_id,
		BUILD_NOT_FOUND
	);

	ctx.op(build::ops::patch_tags::Input {
		build_id,
		tags,
		exclusive_tags: body.exclusive_tags,
	})
	.await?;

	Ok(json!({}))
}

pub async fn patch_tags_deprecated(
	ctx: Ctx<Auth>,
	game_id: Uuid,
	env_id: Uuid,
	build_id: Uuid,
	body: models::ServersPatchBuildTagsRequest,
) -> GlobalResult<serde_json::Value> {
	let global = build_global_query_compat(&ctx, game_id, env_id).await?;
	patch_tags(
		ctx,
		build_id,
		models::ActorPatchBuildTagsRequest {
			exclusive_tags: body.exclusive_tags,
			tags: body.tags,
		},
		global,
	)
	.await
}

// MARK: POST /builds/prepare
pub async fn create_build(
	ctx: Ctx<Auth>,
	body: models::ActorPrepareBuildRequest,
	query: GlobalQuery,
) -> GlobalResult<models::ActorPrepareBuildResponse> {
	let CheckOutput { env_id, .. } = ctx
		.auth()
		.check(
			ctx.op_ctx(),
			CheckOpts {
				query: &query,
				allow_service_token: true,
				opt_auth: false,
			},
		)
		.await?;

	let (kind, image_tag) = match body.kind {
		Option::None | Some(models::ActorBuildKind::DockerImage) => (
			build::types::BuildKind::DockerImage,
			unwrap_with!(
				body.image_tag,
				API_BAD_BODY,
				error = "field `image_tag` is required for the given build kind"
			),
		),
		Some(models::ActorBuildKind::OciBundle) => (
			build::types::BuildKind::OciBundle,
			// HACK(RVT-4125): Generate nonexistent image tag
			body.image_tag
				.unwrap_or_else(|| format!("nonexistent:{}", Uuid::new_v4())),
		),
		Some(models::ActorBuildKind::Javascript) => (
			build::types::BuildKind::JavaScript,
			// HACK(RVT-4125): Generate nonexistent image tag
			body.image_tag
				.unwrap_or_else(|| format!("nonexistent:{}", Uuid::new_v4())),
		),
	};

	let create_res = ctx
		.op(build::ops::create::Input {
			owner: build::ops::create::Owner::Env(env_id),
			display_name: util::faker::display_name(),
			content: build::ops::create::Content::New {
				image_file: (*body.image_file).api_try_into()?,
				image_tag,
			},
			kind,
			compression: body
				.compression
				.map(ApiInto::api_into)
				.unwrap_or(build::types::BuildCompression::None),
		})
		.await?;

	Ok(models::ActorPrepareBuildResponse {
		build: create_res.build_id,
		presigned_requests: create_res
			.presigned_requests
			.into_iter()
			.map(ApiTryInto::api_try_into)
			.collect::<GlobalResult<Vec<_>>>()?,
	})
}

pub async fn create_build_deprecated(
	ctx: Ctx<Auth>,
	game_id: Uuid,
	env_id: Uuid,
	body: models::ServersCreateBuildRequest,
) -> GlobalResult<models::ServersCreateBuildResponse> {
	let global = build_global_query_compat(&ctx, game_id, env_id).await?;
	let builds_res = create_build(
		ctx,
		models::ActorPrepareBuildRequest {
			compression: body.compression.map(|c| match c {
				models::ServersBuildCompression::None => models::ActorBuildCompression::None,
				models::ServersBuildCompression::Lz4 => models::ActorBuildCompression::Lz4,
			}),
			image_file: body.image_file,
			image_tag: Some(body.image_tag),
			kind: body.kind.map(|k| match k {
				models::ServersBuildKind::DockerImage => models::ActorBuildKind::DockerImage,
				models::ServersBuildKind::OciBundle => models::ActorBuildKind::OciBundle,
			}),
		},
		global,
	)
	.await?;

	let multipart_upload = body.multipart_upload.unwrap_or(false);

	let (image_presigned_request, image_presigned_requests) = if !multipart_upload {
		(
			Some(Box::new(unwrap!(builds_res
				.presigned_requests
				.into_iter()
				.next()))),
			None,
		)
	} else {
		(None, Some(builds_res.presigned_requests))
	};

	Ok(models::ServersCreateBuildResponse {
		build: builds_res.build,
		image_presigned_request,
		image_presigned_requests,
	})
}

// MARK: POST /builds/{}/complete
pub async fn complete_build(
	ctx: Ctx<Auth>,
	build_id: Uuid,
	_body: serde_json::Value,
	query: GlobalQuery,
) -> GlobalResult<serde_json::Value> {
	let CheckOutput { env_id, .. } = ctx
		.auth()
		.check(
			ctx.op_ctx(),
			CheckOpts {
				query: &query,
				allow_service_token: true,
				opt_auth: false,
			},
		)
		.await?;

	let builds_res = ctx
		.op(build::ops::get::Input {
			build_ids: vec![build_id],
		})
		.await?;
	let build = unwrap_with!(builds_res.builds.first(), BUILD_NOT_FOUND);

	ensure_with!(
		unwrap_with!(build.env_id, BUILD_NOT_FOUND) == env_id,
		BUILD_NOT_FOUND
	);

	op!([ctx] @dont_log_body upload_complete {
		upload_id: Some(build.upload_id.into()),
		bucket: None,
	})
	.await?;

	// Prewarm all datacenters for pegboard
	{
		let default_cluster_id = ctx.config().server()?.tivet.default_cluster_id()?;

		let datacenters_res = ctx
			.op(cluster::ops::datacenter::list::Input {
				cluster_ids: vec![default_cluster_id],
			})
			.await?;
		let cluster = unwrap!(datacenters_res.clusters.first());

		futures_util::stream::iter(cluster.datacenter_ids.iter().cloned())
			.map(|datacenter_id| {
				let ctx = ctx.clone();
				async move {
					ctx.signal(pegboard::workflows::PrewarmImage {
						image_id: build_id,
						image_artifact_url_stub: ds::util::image_artifact_url_stub(
							ctx.config(),
							build.upload_id,
							&build::utils::file_name(build.kind, build.compression),
						)?,
					})
					.tag("datacenter_id", datacenter_id)
					.send()
					.await
				}
			})
			.buffer_unordered(16)
			.try_collect::<Vec<_>>()
			.await?;
	}

	Ok(json!({}))
}

pub async fn complete_build_deprecated(
	ctx: Ctx<Auth>,
	game_id: Uuid,
	env_id: Uuid,
	build_id: Uuid,
	body: serde_json::Value,
) -> GlobalResult<serde_json::Value> {
	let global = build_global_query_compat(&ctx, game_id, env_id).await?;
	complete_build(ctx, build_id, body, global).await
}
