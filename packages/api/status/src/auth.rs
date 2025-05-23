use api_helper::auth::{ApiAuth, AuthRateLimitCtx};
use proto::claims::Claims;
use tivet_operation::prelude::*;

pub struct Auth {
	_claims: Option<Claims>,
}

#[async_trait]
impl ApiAuth for Auth {
	async fn new(
		config: tivet_config::Config,
		api_token: Option<String>,
		rate_limit_ctx: AuthRateLimitCtx<'_>,
	) -> GlobalResult<Auth> {
		Self::rate_limit(&config, rate_limit_ctx).await?;

		// TODO: Use JWT
		if let Some(api_token) = api_token {
			let status_token = config.server()?.tivet.status()?.token.read();
			ensure_eq_with!(
				api_token,
				*status_token,
				API_FORBIDDEN,
				reason = "Invalid auth"
			);
			Ok(Auth { _claims: None })
		} else {
			bail!("unreachable");
		}
	}

	async fn rate_limit(
		_config: &tivet_config::Config,
		_rate_limit_ctx: AuthRateLimitCtx<'_>,
	) -> GlobalResult<()> {
		Ok(())
	}
}
