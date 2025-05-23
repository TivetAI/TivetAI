use api_helper::{
	auth::{ApiAuth, AuthRateLimitCtx},
	ctx::Ctx,
	util::{as_auth_expired, basic_rate_limit},
};
use proto::claims::Claims;
use tivet_claims::ClaimsDecode;
use tivet_operation::prelude::*;

/// Information derived from the authentication middleware.
pub struct Auth {
	config: tivet_config::Config,
	claims: Option<Claims>,
}

#[async_trait]
impl ApiAuth for Auth {
	async fn new(
		config: tivet_config::Config,
		api_token: Option<String>,
		rate_limit_ctx: AuthRateLimitCtx<'_>,
	) -> GlobalResult<Auth> {
		Self::rate_limit(&config, rate_limit_ctx).await?;

		Ok(Auth {
			config: config.clone(),
			claims: if let Some(api_token) = api_token {
				Some(as_auth_expired(tivet_claims::decode(
					&config.server()?.jwt.public,
					&api_token,
				)?)?)
			} else {
				None
			},
		})
	}

	async fn rate_limit(
		config: &tivet_config::Config,
		rate_limit_ctx: AuthRateLimitCtx<'_>,
	) -> GlobalResult<()> {
		basic_rate_limit(config, rate_limit_ctx).await
	}
}

impl Auth {
	pub fn claims(&self) -> GlobalResult<&Claims> {
		self.claims
			.as_ref()
			.ok_or_else(|| err_code!(API_UNAUTHORIZED, reason = "No bearer token provided."))
	}

	/// Authenticates with either the public namespace token or the origin header (if allowed).
	pub async fn game_ns(
		&self,
		ctx: &Ctx<Auth>,
	) -> GlobalResult<tivet_claims::ent::GameNamespacePublic> {
		// Attempt to parse existing claim if exists
		if let Some(game_ns) = self
			.claims
			.as_ref()
			.and_then(|claims| claims.as_game_namespace_public_option().transpose())
			.transpose()?
		{
			return Ok(game_ns);
		} else {
			tracing::info!("no ns claims");
		}

		// Attempt to authenticate by the header
		tracing::info!(origin = ?ctx.origin(), "origin");

		if let Some(origin) = ctx.origin() {
			let resolve_res = op!([ctx] game_namespace_resolve_url {
				url: origin.to_string(),
			})
			.await?;
			tracing::info!(res = ?resolve_res, "resolution");

			if let Some(resolution) = &resolve_res.resolution {
				let namespace_id = unwrap_ref!(resolution.namespace_id).as_uuid();

				// Validate that this namespace can be authenticated by domain
				let ns_res = op!([ctx] cdn_namespace_get {
					namespace_ids: vec![namespace_id.into()],
				})
				.await?;

				let cdn_ns = unwrap!(ns_res.namespaces.first());
				let cdn_ns_config = unwrap_ref!(cdn_ns.config);

				if cdn_ns_config.enable_domain_public_auth {
					return Ok(tivet_claims::ent::GameNamespacePublic { namespace_id });
				}
			}
		}

		// Return default error
		bail_with!(
			CLAIMS_MISSING_ENTITLEMENT,
			entitlements = "GameNamespacePublic"
		)
	}

	pub fn lobby(&self) -> GlobalResult<tivet_claims::ent::MatchmakerLobby> {
		self.claims()?.as_matchmaker_lobby()
	}

	pub fn player(&self) -> GlobalResult<tivet_claims::ent::MatchmakerPlayer> {
		self.claims()?.as_matchmaker_player()
	}

	pub fn game_ns_dev_option(
		&self,
	) -> GlobalResult<Option<tivet_claims::ent::GameNamespaceDevelopment>> {
		if let Some(claims) = &self.claims {
			Ok(claims.as_game_namespace_development_option()?)
		} else {
			Ok(None)
		}
	}
}
