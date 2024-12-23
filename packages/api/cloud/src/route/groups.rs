use api_helper::ctx::Ctx;
use tivet_api::models;
use tivet_config::config::tivet::AccessKind;
use tivet_convert::ApiInto;
use tivet_operation::prelude::*;

use crate::auth::Auth;

// MARK: POST /groups/validate
pub async fn validate(
	ctx: Ctx<Auth>,
	body: models::CloudValidateGroupRequest,
) -> GlobalResult<models::CloudValidateGroupResponse> {
	if ctx.config().server()?.tivet.auth.access_kind != AccessKind::Public {
		ctx.auth().admin(ctx.op_ctx()).await?;
	}

	let res = op!([ctx] team_validate {
		display_name: body.display_name,
	})
	.await?;

	Ok(models::CloudValidateGroupResponse {
		errors: res
			.errors
			.into_iter()
			.map(ApiInto::api_into)
			.collect::<Vec<_>>(),
	})
}
