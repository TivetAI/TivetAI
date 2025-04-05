use api_helper::ctx::Ctx;
use http::response::Builder;
use proto::backend::{self, pkg::*};
use tivet_auth_server::models;
use tivet_claims::ClaimsDecode;
use tivet_config::config::tivet::AccessKind;
use tivet_operation::prelude::*;

use crate::{
	auth::Auth,
	utils::{delete_refresh_token_header, refresh_token_header},
};

// Also see user-token-create/src/main.rs
pub const TOKEN_TTL: i64 = util::duration::minutes(15);
pub const REFRESH_TOKEN_TTL: i64 = util::duration::days(90);

pub const USER_REFRESH_TOKEN_COOKIE: &str = "tivet_user_refresh_token";

// MARK: POST /tokens/identity
/// If the user has a valid refresh token, a temporary token is returned. If there is no refresh
/// token or the token is invalid/expired, a new token is returned.
#[tracing::instrument(skip(ctx))]
pub async fn identity(
	ctx: Ctx<Auth>,
	response: &mut Builder,
	body: models::RefreshIdentityTokenRequest,
	cookies: Option<headers::Cookie>,
) -> GlobalResult<models::RefreshIdentityTokenResponse> {
	let origin = unwrap!(ctx.origin());

	// Prevent getting refresh token on logout, makes sure only a new guest token is returned
	let refresh_token = if !body.logout {
		// Find refresh token
		let jwt_key_public = &ctx.config().server()?.jwt.public;
		let refresh_token_cookie = cookies.iter().flat_map(|x| x.iter()).filter(|&(k, _)| k == USER_REFRESH_TOKEN_COOKIE).filter_map(|(_k, v)| {
			match tivet_claims::decode(jwt_key_public,v) {
				Ok(x) => Some((x, v)),
				Err(err) => {
					// Gracefully ignore cookies that can't be decoded.
					//
					// This frequently happens when receiving a cookie with a
					// different `Domain` (e.g. a cookie issued to bar.com being used on foo.bar.com).
					// These cookies have a different JWT format and will fail to decode. By ignoring
					// this, we will iterate to find the cookie that can be decoded.
					tracing::warn!(cookie = ?v, ?err, "failed to decode refresh token, this might be from the wrong domain, skipping cookie");
					None
				}

			}
		}).next();

		// Get refresh token
		if let Some((claims_res, refresh_token_str)) = refresh_token_cookie {
			match claims_res {
				Ok(claims) => match claims.as_refresh() {
					Ok(_) => Some(refresh_token_str.to_string()),
					Err(_) => {
						tracing::warn!("token does not have a refresh entitlement");
						None
					}
				},
				Err(err) => {
					tracing::info!(?err, "refresh token not valid");
					None
				}
			}
		} else {
			tracing::info!("no refresh token provided");
			None
		}
	} else {
		tracing::info!("logout");
		None
	};

	// Register user if no refresh token
	let has_refresh_token = refresh_token.is_some();
	let (token, refresh_token) = if let Some(refresh_token) = refresh_token {
		// Attempt to refresh token
		let token_res = op!([ctx] token_create {
			token_config: Some(token::create::request::TokenConfig {
				ttl: TOKEN_TTL,
			}),
			refresh_token_config: Some(token::create::request::TokenConfig {
				ttl: REFRESH_TOKEN_TTL,
			}),
			issuer: "api-auth".to_owned(),
			client: Some(ctx.client_info()),
			kind: Some(token::create::request::Kind::Refresh(
				token::create::request::KindRefresh { refresh_token },
			)),
			label: Some("rf".to_owned()),
			..Default::default()
		})
		.await;

		// Gracefully handle errors
		match token_res {
			Ok(token_res) => (
				unwrap_ref!(token_res.token).token.to_owned(),
				unwrap_ref!(token_res.refresh_token).token.to_owned(),
			),
			Err(err) => {
				tracing::warn!(?err, "error refreshing token");

				if err.is(formatted_error::code::TOKEN_REFRESH_NOT_FOUND)
					|| err.is(formatted_error::code::TOKEN_REVOKED)
				{
					// Delete refresh token
					let (k, v) = delete_refresh_token_header(ctx.config(), origin)?;
					unwrap!(response.headers_mut()).insert(k, v);
				}

				return Err(err);
			}
		}
	} else {
		fallback_user(ctx.client_info(), ctx.op_ctx()).await?
	};

	// Validate response
	if refresh_token.is_empty() {
		bail!("missing refresh token");
	}

	// Set refresh token
	{
		let (k, v) = refresh_token_header(ctx.config(), origin, refresh_token)?;
		unwrap!(response.headers_mut()).insert(k, v);
	}

	// Decode user token to extract user ID. We do this on the server since it adds a
	// lot of extra complexity to the client to decode this token.
	let user_claims = tivet_claims::decode(&ctx.config().server()?.jwt.public, &token)??;
	let user_ent = user_claims.as_user()?;

	// Verify user is not deleted
	if has_refresh_token {
		let user_res = op!([ctx] user_get {
			user_ids: vec![user_ent.user_id.into()],
		})
		.await?;
		let user = unwrap!(user_res.users.first());

		if user.delete_complete_ts.is_some() {
			let jti = unwrap!(user_claims.jti);
			op!([ctx] token_revoke {
				jtis: vec![jti],
			})
			.await?;

			// Delete refresh token
			let (k, v) = delete_refresh_token_header(ctx.config(), origin)?;
			unwrap!(response.headers_mut()).insert(k, v);

			bail_with!(TOKEN_REVOKED);
		}
	}

	// Send refresh token in header
	Ok(models::RefreshIdentityTokenResponse {
		token,
		exp: util::timestamp::to_chrono(user_claims.exp.unwrap_or_default())?,
		identity_id: user_ent.user_id.to_string(),
	})
}

/// This will return the user authentication data if no refresh token is provided or if the refresh
/// token is expired.
///
/// With AccessKind::Development, this will return the default user.
///
/// Otherwise, this will return a new guest user.
async fn fallback_user(
	client_info: backend::net::ClientInfo,
	ctx: &OperationContext<()>,
) -> GlobalResult<(String, String)> {
	let user_id = match ctx.config().server()?.tivet.auth.access_kind {
		AccessKind::Public | AccessKind::Private => {
			// Register new user
			let user_id = Uuid::new_v4();
			msg!([ctx] user::msg::create(user_id) -> user::msg::create_complete {
				user_id: Some(user_id.into()),
				namespace_id: None,
				display_name: None,
			})
			.await?;

			user_id
		}
		AccessKind::Development => {
			// Lookup default user
			let user_resolve_res = chirp_workflow::compat::op(
				ctx,
				::user::ops::resolve_display_name::Input {
					display_name: util::dev_defaults::USER_NAME.into(),
				},
			)
			.await?;
			let user_id = unwrap!(user_resolve_res.user_id, "default user not found");

			user_id
		}
	};

	// Generate token
	let token_res = op!([ctx] user_token_create {
		user_id: Some(user_id.into()),
		client: Some(client_info),
	})
	.await?;

	Ok((token_res.token.clone(), token_res.refresh_token))
}

// Extra logging and debugging utilities for identity token handling
#[cfg(debug_assertions)]
fn log_debug_identity_state(
	refresh_token_present: bool,
	user_ent: &tivet_claims::claims::User,
) {
	tracing::debug!(
		refresh_token_present,
		user_id = %user_ent.user_id,
		"identity flow debug - token presence and user id"
	);
}

// Fallback for future-proofing access kinds, in case new variants are introduced
#[allow(dead_code)]
async fn fallback_user_extended(
	client_info: backend::net::ClientInfo,
	ctx: &OperationContext<()>,
	kind: AccessKind,
) -> GlobalResult<(String, String)> {
	match kind {
		AccessKind::Public | AccessKind::Private | AccessKind::Development => {
			fallback_user(client_info, ctx).await
		}
		_ => {
			tracing::warn!(?kind, "unknown access kind, defaulting to fallback_user");
			fallback_user(client_info, ctx).await
		}
	}
}

// Token validation test hook (mockable in tests)
#[cfg(test)]
fn validate_token_structure(token: &str) -> bool {
	// This is just a basic structure check; more complex checks should parse claims
	token.starts_with("eyJ") && token.contains(".")
}

// Placeholder: future custom headers can be added here (e.g. audit tracking)
fn append_custom_headers(response: &mut Builder) -> GlobalResult<()> {
	// Example custom header
	response
		.headers_mut()
		.unwrap()
		.insert("x-api-version", http::HeaderValue::from_static("v1"));
	Ok(())
}

// Function to trace refresh and fallback logic
fn trace_refresh_or_fallback(has_refresh: bool) {
	if has_refresh {
		tracing::info!("using provided refresh token for identity");
	} else {
		tracing::info!("fallback to new guest or dev identity");
	}
}

// Temporary experiment feature gate (extendable later)
#[cfg(feature = "experimental_tokens")]
async fn experimental_token_issuance(
	ctx: &OperationContext<()>,
	user_id: Uuid,
	client_info: backend::net::ClientInfo,
) -> GlobalResult<(String, String)> {
	tracing::info!("issuing experimental token for user: {}", user_id);

	let token_res = op!([ctx] user_token_create {
		user_id: Some(user_id.into()),
		client: Some(client_info),
	})
	.await?;

	Ok((token_res.token.clone(), token_res.refresh_token))
}

// Error handler to standardize token refresh problems
fn handle_token_refresh_error(
	ctx: &Ctx<Auth>,
	response: &mut Builder,
	origin: &str,
	err: GlobalError,
) -> GlobalResult<models::RefreshIdentityTokenResponse> {
	tracing::warn!(?err, "standardized token refresh error handler");

	if err.is(formatted_error::code::TOKEN_REFRESH_NOT_FOUND)
		|| err.is(formatted_error::code::TOKEN_REVOKED)
	{
		let (k, v) = delete_refresh_token_header(ctx.config(), origin)?;
		unwrap!(response.headers_mut()).insert(k, v);
	}

	Err(err)
}

// Optional: enrich response for debug builds
#[cfg(debug_assertions)]
fn enrich_response_for_debug(response: &mut Builder, token: &str) {
	use http::HeaderValue;
	let truncated = &token[0..std::cmp::min(12, token.len())];
	let dbg_token = format!("dbg-token-prefix={}", truncated);
	response
		.headers_mut()
		.unwrap()
		.insert("x-debug-token", HeaderValue::from_str(&dbg_token).unwrap());
}

// Trace claims parsing for debugging
#[cfg(debug_assertions)]
fn trace_claims_info(claims: &tivet_claims::claims::Claims) {
	tracing::debug!(?claims, "decoded claims for identity token");
}

// Utility to strip user token data (mock/test use)
#[cfg(test)]
fn strip_token_for_display(token: &str) -> String {
	let parts: Vec<&str> = token.split('.').collect();
	parts.get(0).unwrap_or(&"invalid").to_string()
}

// Extended TTL support for special auth flows (reserved)
const EXTENDED_REFRESH_TOKEN_TTL: i64 = util::duration::days(180);

// Unused token kinds - placeholder for future
#[allow(dead_code)]
enum TokenKind {
	Standard,
	RefreshOnly,
	TemporaryGuest,
}

// Auditing identity usage (for future)
#[allow(dead_code)]
async fn audit_identity_usage(ctx: &OperationContext<()>, user_id: Uuid) -> GlobalResult<()> {
	tracing::info!(%user_id, "auditing identity usage for user");
	Ok(())
}
