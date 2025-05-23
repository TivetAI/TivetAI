use api_helper::{define_router, util::CorsConfigBuilder};
use hyper::{Body, Request, Response};
use tivet_api::models;
use tivet_auth_server::models as models_old;

pub mod identity;
pub mod tokens;

define_router! {
	cors: |config| CorsConfigBuilder::hub(config).build(),
	routes: {
		"tokens" / "identity": {
			POST: tokens::identity(
				body: models_old::RefreshIdentityTokenRequest,
				with_response: true,
				cookies: true,
				opt_auth: true,
			),
		},
		"identity" / "email" / "start-verification": {
			POST: identity::start(
				body: models::AuthIdentityStartEmailVerificationRequest,
				rate_limit: {
					buckets: [
						{ count: 2 },
					],
				},
			),
		},
		"identity" / "email" / "complete-verification": {
			POST: identity::complete(
				with_response: true,
				body: models::AuthIdentityCompleteEmailVerificationRequest,
				rate_limit: {
					buckets: [
						{ count: 2 },
					],
				},
			),
		},
	},
}
