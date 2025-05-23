// Code generated by software.amazon.smithy.rust.codegen.smithy-rs. DO NOT EDIT.
#[derive(Debug)]
pub(crate) struct Handle<C, M, R = aws_smithy_client::retry::Standard> {
	pub(crate) client: aws_smithy_client::Client<C, M, R>,
	pub(crate) conf: crate::Config,
}

/// An ergonomic service client for `AuthService`.
///
/// This client allows ergonomic access to a `AuthService`-shaped service.
/// Each method corresponds to an endpoint defined in the service's Smithy model,
/// and the request and response shapes are auto-generated from that same model.
///
/// # Constructing a Client
///
/// To construct a client, you need a few different things:
///
/// - A [`Config`](crate::Config) that specifies additional configuration
///   required by the service.
/// - A connector (`C`) that specifies how HTTP requests are translated
///   into HTTP responses. This will typically be an HTTP client (like
///   `hyper`), though you can also substitute in your own, like a mock
///   mock connector for testing.
/// - A "middleware" (`M`) that modifies requests prior to them being
///   sent to the request. Most commonly, middleware will decide what
///   endpoint the requests should be sent to, as well as perform
///   authentication and authorization of requests (such as SigV4).
///   You can also have middleware that performs request/response
///   tracing, throttling, or other middleware-like tasks.
/// - A retry policy (`R`) that dictates the behavior for requests that
///   fail and should (potentially) be retried. The default type is
///   generally what you want, as it implements a well-vetted retry
///   policy implemented in [`RetryMode::Standard`](aws_smithy_types::retry::RetryMode::Standard).
///
/// To construct a client, you will generally want to call
/// [`Client::with_config`], which takes a [`aws_smithy_client::Client`] (a
/// Smithy client that isn't specialized to a particular service),
/// and a [`Config`](crate::Config). Both of these are constructed using
/// the [builder pattern] where you first construct a `Builder` type,
/// then configure it with the necessary parameters, and then call
/// `build` to construct the finalized output type. The
/// [`aws_smithy_client::Client`] builder is re-exported in this crate as
/// [`Builder`] for convenience.
///
/// In _most_ circumstances, you will want to use the following pattern
/// to construct a client:
///
/// ```
/// use tivet_auth::{Builder, Client, Config};
/// let raw_client =
///     Builder::dyn_https()
/// #     /*
///       .middleware(/* discussed below */)
/// #     */
/// #     .middleware_fn(|r| r)
///       .build();
/// let config = Config::builder().build();
/// let client = Client::with_config(raw_client, config);
/// ```
///
/// For the middleware, you'll want to use whatever matches the
/// routing, authentication and authorization required by the target
/// service. For example, for the standard AWS SDK which uses
/// [SigV4-signed requests], the middleware looks like this:
///
// Ignored as otherwise we'd need to pull in all these dev-dependencies.
/// ```rust,ignore
/// use aws_endpoint::AwsEndpointStage;
/// use aws_http::auth::CredentialsStage;
/// use aws_http::recursion_detection::RecursionDetectionStage;
/// use aws_http::user_agent::UserAgentStage;
/// use aws_sig_auth::middleware::SigV4SigningStage;
/// use aws_sig_auth::signer::SigV4Signer;
/// use aws_smithy_client::retry::Config as RetryConfig;
/// use aws_smithy_http_tower::map_request::{AsyncMapRequestLayer, MapRequestLayer};
/// use std::fmt::Debug;
/// use tower::layer::util::{Identity, Stack};
/// use tower::ServiceBuilder;
///
/// type AwsMiddlewareStack = Stack<
///     MapRequestLayer<RecursionDetectionStage>,
///     Stack<
///         MapRequestLayer<SigV4SigningStage>,
///         Stack<
///             AsyncMapRequestLayer<CredentialsStage>,
///             Stack<
///                 MapRequestLayer<UserAgentStage>,
///                 Stack<MapRequestLayer<AwsEndpointStage>, Identity>,
///             >,
///         >,
///     >,
/// >;
///
/// /// AWS Middleware Stack
/// ///
/// /// This implements the middleware stack for this service. It will:
/// /// 1. Load credentials asynchronously into the property bag
/// /// 2. Sign the request with SigV4
/// /// 3. Resolve an Endpoint for the request
/// /// 4. Add a user agent to the request
/// #[derive(Debug, Default, Clone)]
/// #[non_exhaustive]
/// pub struct AwsMiddleware;
///
/// impl AwsMiddleware {
///     /// Create a new `AwsMiddleware` stack
///     ///
///     /// Note: `AwsMiddleware` holds no state.
///     pub fn new() -> Self {
///         AwsMiddleware::default()
///     }
/// }
///
/// // define the middleware stack in a non-generic location to reduce code bloat.
/// fn base() -> ServiceBuilder<AwsMiddlewareStack> {
///     let credential_provider = AsyncMapRequestLayer::for_mapper(CredentialsStage::new());
///     let signer = MapRequestLayer::for_mapper(SigV4SigningStage::new(SigV4Signer::new()));
///     let endpoint_resolver = MapRequestLayer::for_mapper(AwsEndpointStage);
///     let user_agent = MapRequestLayer::for_mapper(UserAgentStage::new());
///     let recursion_detection = MapRequestLayer::for_mapper(RecursionDetectionStage::new());
///     // These layers can be considered as occurring in order, that is:
///     // 1. Resolve an endpoint
///     // 2. Add a user agent
///     // 3. Acquire credentials
///     // 4. Sign with credentials
///     // (5. Dispatch over the wire)
///     ServiceBuilder::new()
///         .layer(endpoint_resolver)
///         .layer(user_agent)
///         .layer(credential_provider)
///         .layer(signer)
///         .layer(recursion_detection)
/// }
///
/// impl<S> tower::Layer<S> for AwsMiddleware {
///     type Service = <AwsMiddlewareStack as tower::Layer<S>>::Service;
///
///     fn layer(&self, inner: S) -> Self::Service {
///         base().service(inner)
///     }
/// }
/// ```
///
/// # Using a Client
///
/// Once you have a client set up, you can access the service's endpoints
/// by calling the appropriate method on [`Client`]. Each such method
/// returns a request builder for that endpoint, with methods for setting
/// the various fields of the request. Once your request is complete, use
/// the `send` method to send the request. `send` returns a future, which
/// you then have to `.await` to get the service's response.
///
/// [builder pattern]: https://rust-lang.github.io/api-guidelines/type-safety.html#c-builder
/// [SigV4-signed requests]: https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html
#[derive(std::fmt::Debug)]
pub struct Client<C, M, R = aws_smithy_client::retry::Standard> {
	handle: std::sync::Arc<Handle<C, M, R>>,
}

impl<C, M, R> std::clone::Clone for Client<C, M, R> {
	fn clone(&self) -> Self {
		Self {
			handle: self.handle.clone(),
		}
	}
}

#[doc(inline)]
pub use aws_smithy_client::Builder;

impl<C, M, R> From<aws_smithy_client::Client<C, M, R>> for Client<C, M, R> {
	fn from(client: aws_smithy_client::Client<C, M, R>) -> Self {
		Self::with_config(client, crate::Config::builder().build())
	}
}

impl<C, M, R> Client<C, M, R> {
	/// Creates a client with the given service configuration.
	pub fn with_config(client: aws_smithy_client::Client<C, M, R>, conf: crate::Config) -> Self {
		Self {
			handle: std::sync::Arc::new(Handle { client, conf }),
		}
	}

	/// Returns the client's configuration.
	pub fn conf(&self) -> &crate::Config {
		&self.handle.conf
	}
}
impl<C, M, R> Client<C, M, R>
where
	C: aws_smithy_client::bounds::SmithyConnector,
	M: aws_smithy_client::bounds::SmithyMiddleware<C>,
	R: aws_smithy_client::retry::NewRequestPolicy,
{
	/// Constructs a fluent builder for the [`CompleteEmailVerification`](crate::client::fluent_builders::CompleteEmailVerification) operation.
	///
	/// - The fluent builder is configurable:
	///   - [`verification_id(impl Into<String>)`](crate::client::fluent_builders::CompleteEmailVerification::verification_id) / [`set_verification_id(Option<String>)`](crate::client::fluent_builders::CompleteEmailVerification::set_verification_id): A universally unique identifier.
	///   - [`code(impl Into<String>)`](crate::client::fluent_builders::CompleteEmailVerification::code) / [`set_code(Option<String>)`](crate::client::fluent_builders::CompleteEmailVerification::set_code): The code sent to the requestee's email.
	/// - On success, responds with [`CompleteEmailVerificationOutput`](crate::output::CompleteEmailVerificationOutput) with field(s):
	///   - [`status(Option<CompleteStatus>)`](crate::output::CompleteEmailVerificationOutput::status): Represents the state of an external account linking process.
	/// - On failure, responds with [`SdkError<CompleteEmailVerificationError>`](crate::error::CompleteEmailVerificationError)
	pub fn complete_email_verification(
		&self,
	) -> fluent_builders::CompleteEmailVerification<C, M, R> {
		fluent_builders::CompleteEmailVerification::new(self.handle.clone())
	}
	/// Constructs a fluent builder for the [`RefreshIdentityToken`](crate::client::fluent_builders::RefreshIdentityToken) operation.
	///
	/// - The fluent builder is configurable:
	///   - [`cookie(Vec<String>)`](crate::client::fluent_builders::RefreshIdentityToken::cookie) / [`set_cookie(Option<Vec<String>>)`](crate::client::fluent_builders::RefreshIdentityToken::set_cookie): Cookie values. Usually does not need to be manually set.
	///   - [`logout(bool)`](crate::client::fluent_builders::RefreshIdentityToken::logout) / [`set_logout(Option<bool>)`](crate::client::fluent_builders::RefreshIdentityToken::set_logout): When `true`, the current identity for the provided cookie will be logged out and a new identity will be returned.
	/// - On success, responds with [`RefreshIdentityTokenOutput`](crate::output::RefreshIdentityTokenOutput) with field(s):
	///   - [`set_cookie(Option<Vec<String>>)`](crate::output::RefreshIdentityTokenOutput::set_cookie): Server-set cookie values.
	///   - [`token(Option<String>)`](crate::output::RefreshIdentityTokenOutput::token): A JSON Web Token. Slightly modified to include a description prefix and use Protobufs of JSON.
	///   - [`exp(Option<DateTime>)`](crate::output::RefreshIdentityTokenOutput::exp): Token expiration time (in milliseconds).
	///   - [`identity_id(Option<String>)`](crate::output::RefreshIdentityTokenOutput::identity_id): A universally unique identifier.
	/// - On failure, responds with [`SdkError<RefreshIdentityTokenError>`](crate::error::RefreshIdentityTokenError)
	pub fn refresh_identity_token(&self) -> fluent_builders::RefreshIdentityToken<C, M, R> {
		fluent_builders::RefreshIdentityToken::new(self.handle.clone())
	}
	/// Constructs a fluent builder for the [`StartEmailVerification`](crate::client::fluent_builders::StartEmailVerification) operation.
	///
	/// - The fluent builder is configurable:
	///   - [`email(impl Into<String>)`](crate::client::fluent_builders::StartEmailVerification::email) / [`set_email(Option<String>)`](crate::client::fluent_builders::StartEmailVerification::set_email): (undocumented)
	///   - [`captcha(CaptchaConfig)`](crate::client::fluent_builders::StartEmailVerification::captcha) / [`set_captcha(Option<CaptchaConfig>)`](crate::client::fluent_builders::StartEmailVerification::set_captcha): Methods to verify a captcha.
	///   - [`game_id(impl Into<String>)`](crate::client::fluent_builders::StartEmailVerification::game_id) / [`set_game_id(Option<String>)`](crate::client::fluent_builders::StartEmailVerification::set_game_id): A universally unique identifier.
	/// - On success, responds with [`StartEmailVerificationOutput`](crate::output::StartEmailVerificationOutput) with field(s):
	///   - [`verification_id(Option<String>)`](crate::output::StartEmailVerificationOutput::verification_id): A universally unique identifier.
	/// - On failure, responds with [`SdkError<StartEmailVerificationError>`](crate::error::StartEmailVerificationError)
	pub fn start_email_verification(&self) -> fluent_builders::StartEmailVerification<C, M, R> {
		fluent_builders::StartEmailVerification::new(self.handle.clone())
	}
}
pub mod fluent_builders {
	//!
	//! Utilities to ergonomically construct a request to the service.
	//!
	//! Fluent builders are created through the [`Client`](crate::client::Client) by calling
	//! one if its operation methods. After parameters are set using the builder methods,
	//! the `send` method can be called to initiate the request.
	//!
	/// Fluent builder constructing a request to `CompleteEmailVerification`.
	///
	/// Completes the email verification process.
	#[derive(std::clone::Clone, std::fmt::Debug)]
	pub struct CompleteEmailVerification<C, M, R = aws_smithy_client::retry::Standard> {
		handle: std::sync::Arc<super::Handle<C, M, R>>,
		inner: crate::input::complete_email_verification_input::Builder,
	}
	impl<C, M, R> CompleteEmailVerification<C, M, R>
	where
		C: aws_smithy_client::bounds::SmithyConnector,
		M: aws_smithy_client::bounds::SmithyMiddleware<C>,
		R: aws_smithy_client::retry::NewRequestPolicy,
	{
		/// Creates a new `CompleteEmailVerification`.
		pub(crate) fn new(handle: std::sync::Arc<super::Handle<C, M, R>>) -> Self {
			Self {
				handle,
				inner: Default::default(),
			}
		}

		/// Sends the request and returns the response.
		///
		/// If an error occurs, an `SdkError` will be returned with additional details that
		/// can be matched against.
		///
		/// By default, any retryable failures will be retried twice. Retry behavior
		/// is configurable with the [RetryConfig](aws_smithy_types::retry::RetryConfig), which can be
		/// set when configuring the client.
		pub async fn send(
			self,
		) -> std::result::Result<
			crate::output::CompleteEmailVerificationOutput,
			aws_smithy_http::result::SdkError<crate::error::CompleteEmailVerificationError>,
		>
		where
			R::Policy: aws_smithy_client::bounds::SmithyRetryPolicy<
				crate::input::CompleteEmailVerificationInputOperationOutputAlias,
				crate::output::CompleteEmailVerificationOutput,
				crate::error::CompleteEmailVerificationError,
				crate::input::CompleteEmailVerificationInputOperationRetryAlias,
			>,
		{
			let op = self
				.inner
				.build()
				.map_err(|err| aws_smithy_http::result::SdkError::ConstructionFailure(err.into()))?
				.make_operation(&self.handle.conf)
				.await
				.map_err(|err| {
					aws_smithy_http::result::SdkError::ConstructionFailure(err.into())
				})?;
			self.handle.client.call(op).await
		}
		/// A universally unique identifier.
		pub fn verification_id(mut self, input: impl Into<std::string::String>) -> Self {
			self.inner = self.inner.verification_id(input.into());
			self
		}
		/// A universally unique identifier.
		pub fn set_verification_id(
			mut self,
			input: std::option::Option<std::string::String>,
		) -> Self {
			self.inner = self.inner.set_verification_id(input);
			self
		}
		/// The code sent to the requestee's email.
		pub fn code(mut self, input: impl Into<std::string::String>) -> Self {
			self.inner = self.inner.code(input.into());
			self
		}
		/// The code sent to the requestee's email.
		pub fn set_code(mut self, input: std::option::Option<std::string::String>) -> Self {
			self.inner = self.inner.set_code(input);
			self
		}
	}
	/// Fluent builder constructing a request to `RefreshIdentityToken`.
	///
	/// Refreshes the current identity's token and sets authentication headers.
	#[derive(std::clone::Clone, std::fmt::Debug)]
	pub struct RefreshIdentityToken<C, M, R = aws_smithy_client::retry::Standard> {
		handle: std::sync::Arc<super::Handle<C, M, R>>,
		inner: crate::input::refresh_identity_token_input::Builder,
	}
	impl<C, M, R> RefreshIdentityToken<C, M, R>
	where
		C: aws_smithy_client::bounds::SmithyConnector,
		M: aws_smithy_client::bounds::SmithyMiddleware<C>,
		R: aws_smithy_client::retry::NewRequestPolicy,
	{
		/// Creates a new `RefreshIdentityToken`.
		pub(crate) fn new(handle: std::sync::Arc<super::Handle<C, M, R>>) -> Self {
			Self {
				handle,
				inner: Default::default(),
			}
		}

		/// Sends the request and returns the response.
		///
		/// If an error occurs, an `SdkError` will be returned with additional details that
		/// can be matched against.
		///
		/// By default, any retryable failures will be retried twice. Retry behavior
		/// is configurable with the [RetryConfig](aws_smithy_types::retry::RetryConfig), which can be
		/// set when configuring the client.
		pub async fn send(
			self,
		) -> std::result::Result<
			crate::output::RefreshIdentityTokenOutput,
			aws_smithy_http::result::SdkError<crate::error::RefreshIdentityTokenError>,
		>
		where
			R::Policy: aws_smithy_client::bounds::SmithyRetryPolicy<
				crate::input::RefreshIdentityTokenInputOperationOutputAlias,
				crate::output::RefreshIdentityTokenOutput,
				crate::error::RefreshIdentityTokenError,
				crate::input::RefreshIdentityTokenInputOperationRetryAlias,
			>,
		{
			let op = self
				.inner
				.build()
				.map_err(|err| aws_smithy_http::result::SdkError::ConstructionFailure(err.into()))?
				.make_operation(&self.handle.conf)
				.await
				.map_err(|err| {
					aws_smithy_http::result::SdkError::ConstructionFailure(err.into())
				})?;
			self.handle.client.call(op).await
		}
		/// Appends an item to `cookie`.
		///
		/// To override the contents of this collection use [`set_cookie`](Self::set_cookie).
		///
		/// Cookie values. Usually does not need to be manually set.
		pub fn cookie(mut self, input: impl Into<std::string::String>) -> Self {
			self.inner = self.inner.cookie(input.into());
			self
		}
		/// Cookie values. Usually does not need to be manually set.
		pub fn set_cookie(
			mut self,
			input: std::option::Option<std::vec::Vec<std::string::String>>,
		) -> Self {
			self.inner = self.inner.set_cookie(input);
			self
		}
		/// When `true`, the current identity for the provided cookie will be logged out and a new identity will be returned.
		pub fn logout(mut self, input: bool) -> Self {
			self.inner = self.inner.logout(input);
			self
		}
		/// When `true`, the current identity for the provided cookie will be logged out and a new identity will be returned.
		pub fn set_logout(mut self, input: std::option::Option<bool>) -> Self {
			self.inner = self.inner.set_logout(input);
			self
		}
	}
	/// Fluent builder constructing a request to `StartEmailVerification`.
	///
	/// Starts the verification process for linking an emal to your identity.
	#[derive(std::clone::Clone, std::fmt::Debug)]
	pub struct StartEmailVerification<C, M, R = aws_smithy_client::retry::Standard> {
		handle: std::sync::Arc<super::Handle<C, M, R>>,
		inner: crate::input::start_email_verification_input::Builder,
	}
	impl<C, M, R> StartEmailVerification<C, M, R>
	where
		C: aws_smithy_client::bounds::SmithyConnector,
		M: aws_smithy_client::bounds::SmithyMiddleware<C>,
		R: aws_smithy_client::retry::NewRequestPolicy,
	{
		/// Creates a new `StartEmailVerification`.
		pub(crate) fn new(handle: std::sync::Arc<super::Handle<C, M, R>>) -> Self {
			Self {
				handle,
				inner: Default::default(),
			}
		}

		/// Sends the request and returns the response.
		///
		/// If an error occurs, an `SdkError` will be returned with additional details that
		/// can be matched against.
		///
		/// By default, any retryable failures will be retried twice. Retry behavior
		/// is configurable with the [RetryConfig](aws_smithy_types::retry::RetryConfig), which can be
		/// set when configuring the client.
		pub async fn send(
			self,
		) -> std::result::Result<
			crate::output::StartEmailVerificationOutput,
			aws_smithy_http::result::SdkError<crate::error::StartEmailVerificationError>,
		>
		where
			R::Policy: aws_smithy_client::bounds::SmithyRetryPolicy<
				crate::input::StartEmailVerificationInputOperationOutputAlias,
				crate::output::StartEmailVerificationOutput,
				crate::error::StartEmailVerificationError,
				crate::input::StartEmailVerificationInputOperationRetryAlias,
			>,
		{
			let op = self
				.inner
				.build()
				.map_err(|err| aws_smithy_http::result::SdkError::ConstructionFailure(err.into()))?
				.make_operation(&self.handle.conf)
				.await
				.map_err(|err| {
					aws_smithy_http::result::SdkError::ConstructionFailure(err.into())
				})?;
			self.handle.client.call(op).await
		}
		#[allow(missing_docs)] // documentation missing in model
		pub fn email(mut self, input: impl Into<std::string::String>) -> Self {
			self.inner = self.inner.email(input.into());
			self
		}
		#[allow(missing_docs)] // documentation missing in model
		pub fn set_email(mut self, input: std::option::Option<std::string::String>) -> Self {
			self.inner = self.inner.set_email(input);
			self
		}
		/// Methods to verify a captcha.
		pub fn captcha(mut self, input: crate::model::CaptchaConfig) -> Self {
			self.inner = self.inner.captcha(input);
			self
		}
		/// Methods to verify a captcha.
		pub fn set_captcha(
			mut self,
			input: std::option::Option<crate::model::CaptchaConfig>,
		) -> Self {
			self.inner = self.inner.set_captcha(input);
			self
		}
		/// A universally unique identifier.
		pub fn game_id(mut self, input: impl Into<std::string::String>) -> Self {
			self.inner = self.inner.game_id(input.into());
			self
		}
		/// A universally unique identifier.
		pub fn set_game_id(mut self, input: std::option::Option<std::string::String>) -> Self {
			self.inner = self.inner.set_game_id(input);
			self
		}
	}
}
/// A wrapper around [`Client`]. Helps reduce external imports.
pub struct ClientWrapper {
	pub(crate) client: Client<aws_smithy_client::erase::DynConnector, tower::layer::util::Identity>,
}

impl std::ops::Deref for ClientWrapper {
	type Target = Client<aws_smithy_client::erase::DynConnector, tower::layer::util::Identity>;

	fn deref(&self) -> &Self::Target {
		&self.client
	}
}
