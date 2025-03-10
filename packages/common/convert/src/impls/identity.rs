use proto::backend;
use tivet_api::models;
use tivet_operation::prelude::*;

use crate::ApiTryFrom;

impl ApiTryFrom<backend::user_identity::Identity> for models::IdentityLinkedAccount {
	type Error = GlobalError;

	fn api_try_from(
		value: backend::user_identity::Identity,
	) -> GlobalResult<models::IdentityLinkedAccount> {
		match unwrap_ref!(value.kind) {
			backend::user_identity::identity::Kind::Email(email_ident) => {
				Ok(models::IdentityLinkedAccount {
					email: Some(Box::new(models::IdentityEmailLinkedAccount {
						email: email_ident.email.to_owned(),
					})),
					..Default::default()
				})
			}
			backend::user_identity::identity::Kind::DefaultUser(_) => {
				Ok(models::IdentityLinkedAccount {
					default_user: Some(true),
					..Default::default()
				})
			}
		}
	}
}
