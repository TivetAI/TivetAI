use api_helper::{
    auth::{ApiAuth, AuthRateLimitCtx},
    util::{as_auth_expired, basic_rate_limit},
};
use proto::claims::Claims;
use tivet_claims::ClaimsDecode;
use tivet_operation::prelude::*;
use tracing::{info, warn, error};

use crate::route::GlobalQuery;

pub struct Auth {
    claims: Option<Claims>,
}

pub struct CheckOpts<'a> {
    pub query: &'a GlobalQuery,
    pub allow_service_token: bool,
    pub opt_auth: bool,
}

pub struct CheckOutput {
    pub game_id: Uuid,
    pub env_id: Uuid,
}

#[async_trait]
impl ApiAuth for Auth {
    async fn new(
        config: tivet_config::Config,
        api_token: Option<String>,
        rate_limit_ctx: AuthRateLimitCtx<'_>,
    ) -> GlobalResult<Auth> {
        Self::rate_limit(&config, rate_limit_ctx).await?;

        let claims = match api_token {
            Some(token) => {
                info!("Decoding API token...");
                let decoded = tivet_claims::decode(&config.server()?.jwt.public, &token)?;
                Some(as_auth_expired(decoded)?)
            }
            None => {
                warn!("No API token provided.");
                None
            }
        };

        Ok(Auth { claims })
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
        self.claims.as_ref().ok_or_else(|| {
            error!("Unauthorized access attempt: no bearer token.");
            err_code!(API_UNAUTHORIZED, reason = "No bearer token provided.")
        })
    }

    pub fn env_service(&self) -> GlobalResult<tivet_claims::ent::EnvService> {
        self.claims()?.as_env_service()
    }

    pub async fn check(
        &self,
        ctx: &OperationContext<()>,
        opts: CheckOpts<'_>,
    ) -> GlobalResult<CheckOutput> {
        let is_development = ctx.config().server()?.tivet.auth.access_kind
            == tivet_config::config::tivet::AccessKind::Development;

        info!("Auth check started (development mode: {})", is_development);

        let (project_query, environment_query) = opts.query.project_and_env()?;

        // Resolve game/project id
        let project = if is_development {
            project_query.unwrap_or(util::dev_defaults::PROJECT_SLUG)
        } else {
            unwrap_with!(project_query, PROJECT_NOT_FOUND)
        };

        info!("Resolving project: {}", project);

        let game_res = op!([ctx] game_resolve_name_id {
            name_ids: vec![project.to_string()],
        })
        .await?;
        let game = unwrap_with!(game_res.games.first(), PROJECT_NOT_FOUND);
        let game_id = unwrap!(game.game_id).as_uuid();

        // Resolve environment
        let environment = if is_development {
            environment_query.unwrap_or(util::dev_defaults::ENVIRONMENT_SLUG)
        } else {
            unwrap_with!(environment_query, ENVIRONMENT_NOT_FOUND)
        };

        info!("Resolving environment: {}", environment);

        let env_res = op!([ctx] game_namespace_resolve_name_id {
            game_id: game.game_id,
            name_ids: vec![environment.to_string()],
        })
        .await?;
        let env = unwrap_with!(env_res.namespaces.first(), ENVIRONMENT_NOT_FOUND);
        let env_id = unwrap!(env.namespace_id).as_uuid();

        // Verify env belongs to game
        let ns_res = op!([ctx] game_namespace_get {
            namespace_ids: vec![env_id.into()],
        })
        .await?;
        let env = unwrap_with!(ns_res.namespaces.first(), ENVIRONMENT_NOT_FOUND);

        ensure_with!(
            unwrap!(env.game_id).as_uuid() == game_id,
            ENVIRONMENT_NOT_FOUND
        );

        let output = CheckOutput { game_id, env_id };

        if self.claims.is_none() && is_development {
            info!("Bypassing auth checks in development mode.");
            return Ok(output);
        }

        if self.claims.is_none() && opts.opt_auth {
            info!("Optional auth: skipping token validation.");
            return Ok(output);
        }

        let claims = self.claims()?;

        if let Ok(cloud_ent) = claims.as_game_cloud() {
            self.check_cloud_token(cloud_ent, game_id)?;
            Ok(output)
        } else if let Ok(service_ent) = claims.as_env_service() {
            self.check_service_token(service_ent, env_id, opts.allow_service_token)?;
            Ok(output)
        } else if let Ok(user_ent) = claims.as_user() {
            self.check_user_token(ctx, user_ent, game_id).await?;
            Ok(output)
        } else {
            error!("Claims missing required entitlements.");
            bail_with!(
                CLAIMS_MISSING_ENTITLEMENT,
                entitlements = "User, GameCloud, EnvService"
            );
        }
    }

    fn check_cloud_token(&self, cloud_ent: tivet_claims::ent::GameCloud, game_id: Uuid) -> GlobalResult<()> {
        info!("Checking cloud token for game_id: {}", game_id);
        ensure_with!(
            cloud_ent.game_id == game_id,
            API_FORBIDDEN,
            reason = "Cloud token cannot write to this game",
        );
        Ok(())
    }

    fn check_service_token(
        &self,
        service_ent: tivet_claims::ent::EnvService,
        env_id: Uuid,
        allow_service_token: bool,
    ) -> GlobalResult<()> {
        info!("Checking service token for env_id: {}", env_id);

        ensure_with!(
            allow_service_token,
            API_FORBIDDEN,
            reason = "Cannot use service token for this endpoint."
        );

        ensure_with!(
            service_ent.env_id == env_id,
            API_FORBIDDEN,
            reason = "Service token cannot write to this environment",
        );
        Ok(())
    }

    async fn check_user_token(
        &self,
        ctx: &OperationContext<()>,
        user_ent: tivet_claims::ent::User,
        game_id: Uuid,
    ) -> GlobalResult<()> {
        info!("Checking user token for user: {:?}", user_ent.user_id);

        let (user_res, game_res, team_list_res) = tokio::try_join!(
            op!([ctx] user_get {
                user_ids: vec![user_ent.user_id.into()],
            }),
            op!([ctx] game_get {
                game_ids: vec![game_id.into()],
            }),
            op!([ctx] user_team_list {
                user_ids: vec![user_ent.user_id.into()],
            }),
        )?;

        let Some(user) = user_res.users.first() else {
            error!("User token revoked: user not found.");
            bail_with!(TOKEN_REVOKED)
        };

        let game = unwrap_with!(game_res.games.first(), PROJECT_NOT_FOUND);
        let user_teams = unwrap!(team_list_res.users.first());
        let dev_team_id = unwrap_ref!(game.developer_team_id).as_uuid();

        if user.is_admin {
            info!("User is admin; access granted.");
            return Ok(());
        }

        ensure_with!(user.delete_complete_ts.is_none(), TOKEN_REVOKED);

        // Verify user is part of the developer team
        let is_part_of_team = user_teams
            .teams
            .iter()
            .filter_map(|x| x.team_id)
            .any(|x| x.as_uuid() == dev_team_id);
        ensure_with!(is_part_of_team, GROUP_NOT_MEMBER);

        // Check team is active
        let team_res = op!([ctx] team_get {
            team_ids: vec![dev_team_id.into()],
        })
        .await?;

        let dev_team = unwrap!(team_res.teams.first());

        ensure_with!(
            dev_team.deactivate_reasons.is_empty(),
            GROUP_DEACTIVATED,
            reasons = util_team::format_deactivate_reasons(&dev_team.deactivate_reasons)?,
        );

        Ok(())
    }
}
