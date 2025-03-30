use std::collections::HashMap;

use api_helper::ctx::Ctx;
use email_verification::complete::response::Status as StatusProto;
use http::response::Builder;
use proto::backend::{self, pkg::*};
use tivet_api::models;
use tivet_convert::ApiTryInto;
use tivet_operation::prelude::*;

use crate::{auth::Auth, utils::refresh_token_header};

/// MARK: POST /identity/email/start-verification
///
/// Initiates email verification by checking captcha if necessary,
/// then sends a verification code to the email address.
pub async fn start(
	ctx: Ctx<Auth>,
	body: models::AuthIdentityStartEmailVerificationRequest,
) -> GlobalResult<models::AuthIdentityStartEmailVerificationResponse> {
	let user_ent = ctx.auth().user(ctx.op_ctx()).await?;

	// Log user initiating the verification
	tracing::info!(user_id = %user_ent.user_id, email = %body.email, "starting email verification");

	// Captcha validation logic (if enabled in config)
	if let Some(secret_key) = &ctx
		.config()
		.server()?
		.turnstile
		.as_ref()
		.and_then(|x| x.main_secret_key.as_ref())
	{
		if let Some(captcha) = body.captcha {
			if captcha.turnstile.is_some() {
				tracing::debug!("Captcha provided, validating...");

				op!([ctx] captcha_verify {
					topic: HashMap::<String, String>::from([
						("kind".into(), "auth:verification-start".into()),
					]),
					remote_address: unwrap_ref!(ctx.remote_address()).to_string(),
					origin_host: Some("tivet.gg".to_string()),
					captcha_config: Some(backend::captcha::CaptchaConfig {
						requests_before_reverify: 0,
						verification_ttl: 0,
						turnstile: Some(backend::captcha::captcha_config::Turnstile {
							site_key: "".to_string(),
							secret_key: secret_key.read().clone(),
						}),
						..Default::default()
					}),
					client_response: Some((*captcha).api_try_into()?),
					user_id: Some(user_ent.user_id.into()),
				})
				.await?;
			} else {
				tracing::warn!("Captcha field missing Turnstile value");
				bail_with!(CAPTCHA_CAPTCHA_INVALID)
			}
		} else {
			tracing::warn!("Captcha not provided in verification start");
			bail_with!(CAPTCHA_CAPTCHA_INVALID)
		}
	} else {
		tracing::info!("No Turnstile secret key configured; skipping captcha verification");
	}

	let res = op!([ctx] email_verification_create {
		email: body.email.clone(),
		game_id: body.game_id.map(|x| x.into()),
	})
	.await?;

	let verification_id = unwrap_ref!(res.verification_id).as_uuid();

	tracing::info!(%verification_id, "email verification created");

	Ok(models::AuthIdentityStartEmailVerificationResponse { verification_id })
}

/// MARK: POST /identity/email/complete-verification
///
/// Completes the email verification process. If the email is linked
/// to another identity, switches users. Otherwise, links it to the current user.
pub async fn complete(
	ctx: Ctx<Auth>,
	response: &mut Builder,
	body: models::AuthIdentityCompleteEmailVerificationRequest,
) -> GlobalResult<models::AuthIdentityCompleteEmailVerificationResponse> {
	let user_ent = ctx.auth().user(ctx.op_ctx()).await?;

	let origin = unwrap!(ctx.origin());

	tracing::info!(user_id = %user_ent.user_id, "completing email verification");

	let res = op!([ctx] email_verification_complete {
		verification_id: Some(body.verification_id.into()),
		code: body.code.clone()
	})
	.await?;

	let status = unwrap!(StatusProto::from_i32(res.status));

	// Handle different verification outcomes
	let err_status = match status {
		StatusProto::Correct => None,
		StatusProto::AlreadyComplete => Some(models::AuthCompleteStatus::AlreadyComplete),
		StatusProto::Expired => Some(models::AuthCompleteStatus::Expired),
		StatusProto::TooManyAttempts => Some(models::AuthCompleteStatus::TooManyAttempts),
		StatusProto::Incorrect => Some(models::AuthCompleteStatus::Incorrect),
	};

	if let Some(status) = err_status {
		tracing::warn!(email = %res.email, status = ?status, "email verification failed");
		return Ok(models::AuthIdentityCompleteEmailVerificationResponse { status });
	}

	tracing::info!(email = %res.email, "email verification passed");

	let email_res = op!([ctx] user_resolve_email {
		emails: vec![res.email.clone()],
	})
	.await?;

	// Handle account switching
	if let Some(new_user) = email_res.users.first() {
		tracing::info!(email = %new_user.email, "resolved email to existing user");

		let new_user_id = unwrap_ref!(new_user.user_id).as_uuid();

		tracing::info!(old_user_id = %user_ent.user_id, %new_user_id, "switching user identity");

		let token_res = op!([ctx] user_token_create {
			user_id: Some(new_user_id.into()),
			client: Some(ctx.client_info()),
		})
		.await?;

		// Set refresh token cookie
		let (k, v) = refresh_token_header(ctx.config(), origin, token_res.refresh_token)?;
		unwrap!(response.headers_mut()).insert(k, v);

		return Ok(models::AuthIdentityCompleteEmailVerificationResponse {
			status: models::AuthCompleteStatus::SwitchIdentity,
		});
	}

	// No matching user, associate identity with current one
	tracing::info!(user_id = %user_ent.user_id, "linking verified email to guest account");

	op!([ctx] user_identity_create {
		user_id: Some(Into::into(user_ent.user_id)),
		identity: Some(backend::user_identity::Identity {
			kind: Some(backend::user_identity::identity::Kind::Email(
				backend::user_identity::identity::Email {
					email: res.email.clone(),
				}
			))
		})
	})
	.await?;

	msg!([ctx] user::msg::update(user_ent.user_id) {
		user_id: Some(user_ent.user_id.into()),
	})
	.await?;

	Ok(models::AuthIdentityCompleteEmailVerificationResponse {
		status: models::AuthCompleteStatus::LinkedAccountAdded,
	})
}
