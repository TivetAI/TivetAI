use proto::backend::pkg::*;
use tivet_operation::prelude::*;

#[derive(sqlx::FromRow)]
struct LobbyGroup {
	lobby_group_id: Uuid,
	name_id: String,
}

impl From<LobbyGroup> for mm_config::lobby_group_resolve_name_id::response::LobbyGroup {
	fn from(value: LobbyGroup) -> Self {
		mm_config::lobby_group_resolve_name_id::response::LobbyGroup {
			lobby_group_id: Some(value.lobby_group_id.into()),
			name_id: value.name_id,
		}
	}
}

#[operation(name = "mm-config-lobby-group-resolve-name-id")]
async fn handle(
	ctx: OperationContext<mm_config::lobby_group_resolve_name_id::Request>,
) -> GlobalResult<mm_config::lobby_group_resolve_name_id::Response> {
	let version_id = unwrap_ref!(ctx.version_id).as_uuid();

	let lobby_groups = sql_fetch_all!(
		[ctx, LobbyGroup]
		"
		SELECT name_id, lobby_group_id
		FROM db_mm_config.lobby_groups AS lg
		WHERE version_id = $1 AND name_id = ANY($2)
		",
		version_id,
		&ctx.name_ids,
	)
	.await?;

	Ok(mm_config::lobby_group_resolve_name_id::Response {
		lobby_groups: lobby_groups.into_iter().map(Into::into).collect::<Vec<_>>(),
	})
}
