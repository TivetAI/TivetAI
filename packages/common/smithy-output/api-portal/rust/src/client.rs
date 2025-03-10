// Code generated by software.amazon.smithy.rust.codegen.smithy-rs. DO NOT EDIT.
#[derive(Debug)]
pub(crate) struct Handle<C, M, R = aws_smithy_client::retry::Standard> {
	pub(crate) client: aws_smithy_client::Client<C, M, R>,
	pub(crate) conf: crate::Config,
}

/// An ergonomic service client for `PortalService`.
///
/// This client allows ergonomic access to a `PortalService`-shaped service.
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
/// use tivet_portal::{Builder, Client, Config};
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
	/// Constructs a fluent builder for the [`GetGameProfile`](crate::client::fluent_builders::GetGameProfile) operation.
	///
	/// - The fluent builder is configurable:
	///   - [`game_name_id(impl Into<String>)`](crate::client::fluent_builders::GetGameProfile::game_name_id) / [`set_game_name_id(Option<String>)`](crate::client::fluent_builders::GetGameProfile::set_game_name_id): A human readable short identifier used to references resources. Different than a `tivet.common#Uuid` because this is intended to be human readable. Different than `tivet.common#DisplayName` because this should not include special characters and be short.
	///   - [`watch_index(impl Into<String>)`](crate::client::fluent_builders::GetGameProfile::watch_index) / [`set_watch_index(Option<String>)`](crate::client::fluent_builders::GetGameProfile::set_watch_index): A query parameter denoting the requests watch index.
	/// - On success, responds with [`GetGameProfileOutput`](crate::output::GetGameProfileOutput) with field(s):
	///   - [`game(Option<GameProfile>)`](crate::output::GetGameProfileOutput::game): A game profile.
	///   - [`watch(Option<WatchResponse>)`](crate::output::GetGameProfileOutput::watch): Provided by watchable endpoints used in blocking loops.
	/// - On failure, responds with [`SdkError<GetGameProfileError>`](crate::error::GetGameProfileError)
	pub fn get_game_profile(&self) -> fluent_builders::GetGameProfile<C, M, R> {
		fluent_builders::GetGameProfile::new(self.handle.clone())
	}
	/// Constructs a fluent builder for the [`GetSuggestedGames`](crate::client::fluent_builders::GetSuggestedGames) operation.
	///
	/// - The fluent builder is configurable:
	///   - [`watch_index(impl Into<String>)`](crate::client::fluent_builders::GetSuggestedGames::watch_index) / [`set_watch_index(Option<String>)`](crate::client::fluent_builders::GetSuggestedGames::set_watch_index): A query parameter denoting the requests watch index.
	/// - On success, responds with [`GetSuggestedGamesOutput`](crate::output::GetSuggestedGamesOutput) with field(s):
	///   - [`games(Option<Vec<GameSummary>>)`](crate::output::GetSuggestedGamesOutput::games): A list of game summaries.
	///   - [`watch(Option<WatchResponse>)`](crate::output::GetSuggestedGamesOutput::watch): Provided by watchable endpoints used in blocking loops.
	/// - On failure, responds with [`SdkError<GetSuggestedGamesError>`](crate::error::GetSuggestedGamesError)
	pub fn get_suggested_games(&self) -> fluent_builders::GetSuggestedGames<C, M, R> {
		fluent_builders::GetSuggestedGames::new(self.handle.clone())
	}
	/// Constructs a fluent builder for the [`RegisterNotifications`](crate::client::fluent_builders::RegisterNotifications) operation.
	///
	/// - The fluent builder is configurable:
	///   - [`service(NotificationRegisterService)`](crate::client::fluent_builders::RegisterNotifications::service) / [`set_service(Option<NotificationRegisterService>)`](crate::client::fluent_builders::RegisterNotifications::set_service): A union representing which notification service to register.
	/// - On success, responds with [`RegisterNotificationsOutput`](crate::output::RegisterNotificationsOutput)

	/// - On failure, responds with [`SdkError<RegisterNotificationsError>`](crate::error::RegisterNotificationsError)
	pub fn register_notifications(&self) -> fluent_builders::RegisterNotifications<C, M, R> {
		fluent_builders::RegisterNotifications::new(self.handle.clone())
	}
	/// Constructs a fluent builder for the [`ResolveBetaJoinRequest`](crate::client::fluent_builders::ResolveBetaJoinRequest) operation.
	///
	/// - The fluent builder is configurable:
	///   - [`identity_id(impl Into<String>)`](crate::client::fluent_builders::ResolveBetaJoinRequest::identity_id) / [`set_identity_id(Option<String>)`](crate::client::fluent_builders::ResolveBetaJoinRequest::set_identity_id): A universally unique identifier.
	///   - [`resolution(bool)`](crate::client::fluent_builders::ResolveBetaJoinRequest::resolution) / [`set_resolution(Option<bool>)`](crate::client::fluent_builders::ResolveBetaJoinRequest::set_resolution): Whether or not to accept the beta join request.
	/// - On success, responds with [`ResolveBetaJoinRequestOutput`](crate::output::ResolveBetaJoinRequestOutput)

	/// - On failure, responds with [`SdkError<ResolveBetaJoinRequestError>`](crate::error::ResolveBetaJoinRequestError)
	pub fn resolve_beta_join_request(&self) -> fluent_builders::ResolveBetaJoinRequest<C, M, R> {
		fluent_builders::ResolveBetaJoinRequest::new(self.handle.clone())
	}
	/// Constructs a fluent builder for the [`UnregisterNotifications`](crate::client::fluent_builders::UnregisterNotifications) operation.
	///
	/// - The fluent builder is configurable:
	///   - [`service(NotificationUnregisterService)`](crate::client::fluent_builders::UnregisterNotifications::service) / [`set_service(Option<NotificationUnregisterService>)`](crate::client::fluent_builders::UnregisterNotifications::set_service): Represents a value for which notification service to unregister.
	/// - On success, responds with [`UnregisterNotificationsOutput`](crate::output::UnregisterNotificationsOutput)

	/// - On failure, responds with [`SdkError<UnregisterNotificationsError>`](crate::error::UnregisterNotificationsError)
	pub fn unregister_notifications(&self) -> fluent_builders::UnregisterNotifications<C, M, R> {
		fluent_builders::UnregisterNotifications::new(self.handle.clone())
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
	/// Fluent builder constructing a request to `GetGameProfile`.
	///
	/// Returns a game profile.
	#[derive(std::clone::Clone, std::fmt::Debug)]
	pub struct GetGameProfile<C, M, R = aws_smithy_client::retry::Standard> {
		handle: std::sync::Arc<super::Handle<C, M, R>>,
		inner: crate::input::get_game_profile_input::Builder,
	}
	impl<C, M, R> GetGameProfile<C, M, R>
	where
		C: aws_smithy_client::bounds::SmithyConnector,
		M: aws_smithy_client::bounds::SmithyMiddleware<C>,
		R: aws_smithy_client::retry::NewRequestPolicy,
	{
		/// Creates a new `GetGameProfile`.
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
			crate::output::GetGameProfileOutput,
			aws_smithy_http::result::SdkError<crate::error::GetGameProfileError>,
		>
		where
			R::Policy: aws_smithy_client::bounds::SmithyRetryPolicy<
				crate::input::GetGameProfileInputOperationOutputAlias,
				crate::output::GetGameProfileOutput,
				crate::error::GetGameProfileError,
				crate::input::GetGameProfileInputOperationRetryAlias,
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
		/// A human readable short identifier used to references resources. Different than a `tivet.common#Uuid` because this is intended to be human readable. Different than `tivet.common#DisplayName` because this should not include special characters and be short.
		pub fn game_name_id(mut self, input: impl Into<std::string::String>) -> Self {
			self.inner = self.inner.game_name_id(input.into());
			self
		}
		/// A human readable short identifier used to references resources. Different than a `tivet.common#Uuid` because this is intended to be human readable. Different than `tivet.common#DisplayName` because this should not include special characters and be short.
		pub fn set_game_name_id(mut self, input: std::option::Option<std::string::String>) -> Self {
			self.inner = self.inner.set_game_name_id(input);
			self
		}
		/// A query parameter denoting the requests watch index.
		pub fn watch_index(mut self, input: impl Into<std::string::String>) -> Self {
			self.inner = self.inner.watch_index(input.into());
			self
		}
		/// A query parameter denoting the requests watch index.
		pub fn set_watch_index(mut self, input: std::option::Option<std::string::String>) -> Self {
			self.inner = self.inner.set_watch_index(input);
			self
		}
	}
	/// Fluent builder constructing a request to `GetSuggestedGames`.
	///
	/// Returns a list of games on the arcade page.
	#[derive(std::clone::Clone, std::fmt::Debug)]
	pub struct GetSuggestedGames<C, M, R = aws_smithy_client::retry::Standard> {
		handle: std::sync::Arc<super::Handle<C, M, R>>,
		inner: crate::input::get_suggested_games_input::Builder,
	}
	impl<C, M, R> GetSuggestedGames<C, M, R>
	where
		C: aws_smithy_client::bounds::SmithyConnector,
		M: aws_smithy_client::bounds::SmithyMiddleware<C>,
		R: aws_smithy_client::retry::NewRequestPolicy,
	{
		/// Creates a new `GetSuggestedGames`.
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
			crate::output::GetSuggestedGamesOutput,
			aws_smithy_http::result::SdkError<crate::error::GetSuggestedGamesError>,
		>
		where
			R::Policy: aws_smithy_client::bounds::SmithyRetryPolicy<
				crate::input::GetSuggestedGamesInputOperationOutputAlias,
				crate::output::GetSuggestedGamesOutput,
				crate::error::GetSuggestedGamesError,
				crate::input::GetSuggestedGamesInputOperationRetryAlias,
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
		/// A query parameter denoting the requests watch index.
		pub fn watch_index(mut self, input: impl Into<std::string::String>) -> Self {
			self.inner = self.inner.watch_index(input.into());
			self
		}
		/// A query parameter denoting the requests watch index.
		pub fn set_watch_index(mut self, input: std::option::Option<std::string::String>) -> Self {
			self.inner = self.inner.set_watch_index(input);
			self
		}
	}
	/// Fluent builder constructing a request to `RegisterNotifications`.
	///
	/// Registers push notifications for the current identity.
	#[derive(std::clone::Clone, std::fmt::Debug)]
	pub struct RegisterNotifications<C, M, R = aws_smithy_client::retry::Standard> {
		handle: std::sync::Arc<super::Handle<C, M, R>>,
		inner: crate::input::register_notifications_input::Builder,
	}
	impl<C, M, R> RegisterNotifications<C, M, R>
	where
		C: aws_smithy_client::bounds::SmithyConnector,
		M: aws_smithy_client::bounds::SmithyMiddleware<C>,
		R: aws_smithy_client::retry::NewRequestPolicy,
	{
		/// Creates a new `RegisterNotifications`.
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
			crate::output::RegisterNotificationsOutput,
			aws_smithy_http::result::SdkError<crate::error::RegisterNotificationsError>,
		>
		where
			R::Policy: aws_smithy_client::bounds::SmithyRetryPolicy<
				crate::input::RegisterNotificationsInputOperationOutputAlias,
				crate::output::RegisterNotificationsOutput,
				crate::error::RegisterNotificationsError,
				crate::input::RegisterNotificationsInputOperationRetryAlias,
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
		/// A union representing which notification service to register.
		pub fn service(mut self, input: crate::model::NotificationRegisterService) -> Self {
			self.inner = self.inner.service(input);
			self
		}
		/// A union representing which notification service to register.
		pub fn set_service(
			mut self,
			input: std::option::Option<crate::model::NotificationRegisterService>,
		) -> Self {
			self.inner = self.inner.set_service(input);
			self
		}
	}
	/// Fluent builder constructing a request to `ResolveBetaJoinRequest`.
	///
	/// Resolves a beta join request for a given identity.
	#[derive(std::clone::Clone, std::fmt::Debug)]
	pub struct ResolveBetaJoinRequest<C, M, R = aws_smithy_client::retry::Standard> {
		handle: std::sync::Arc<super::Handle<C, M, R>>,
		inner: crate::input::resolve_beta_join_request_input::Builder,
	}
	impl<C, M, R> ResolveBetaJoinRequest<C, M, R>
	where
		C: aws_smithy_client::bounds::SmithyConnector,
		M: aws_smithy_client::bounds::SmithyMiddleware<C>,
		R: aws_smithy_client::retry::NewRequestPolicy,
	{
		/// Creates a new `ResolveBetaJoinRequest`.
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
			crate::output::ResolveBetaJoinRequestOutput,
			aws_smithy_http::result::SdkError<crate::error::ResolveBetaJoinRequestError>,
		>
		where
			R::Policy: aws_smithy_client::bounds::SmithyRetryPolicy<
				crate::input::ResolveBetaJoinRequestInputOperationOutputAlias,
				crate::output::ResolveBetaJoinRequestOutput,
				crate::error::ResolveBetaJoinRequestError,
				crate::input::ResolveBetaJoinRequestInputOperationRetryAlias,
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
		pub fn identity_id(mut self, input: impl Into<std::string::String>) -> Self {
			self.inner = self.inner.identity_id(input.into());
			self
		}
		/// A universally unique identifier.
		pub fn set_identity_id(mut self, input: std::option::Option<std::string::String>) -> Self {
			self.inner = self.inner.set_identity_id(input);
			self
		}
		/// Whether or not to accept the beta join request.
		pub fn resolution(mut self, input: bool) -> Self {
			self.inner = self.inner.resolution(input);
			self
		}
		/// Whether or not to accept the beta join request.
		pub fn set_resolution(mut self, input: std::option::Option<bool>) -> Self {
			self.inner = self.inner.set_resolution(input);
			self
		}
	}
	/// Fluent builder constructing a request to `UnregisterNotifications`.
	///
	/// Unregister push notification for the current identity.
	#[derive(std::clone::Clone, std::fmt::Debug)]
	pub struct UnregisterNotifications<C, M, R = aws_smithy_client::retry::Standard> {
		handle: std::sync::Arc<super::Handle<C, M, R>>,
		inner: crate::input::unregister_notifications_input::Builder,
	}
	impl<C, M, R> UnregisterNotifications<C, M, R>
	where
		C: aws_smithy_client::bounds::SmithyConnector,
		M: aws_smithy_client::bounds::SmithyMiddleware<C>,
		R: aws_smithy_client::retry::NewRequestPolicy,
	{
		/// Creates a new `UnregisterNotifications`.
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
			crate::output::UnregisterNotificationsOutput,
			aws_smithy_http::result::SdkError<crate::error::UnregisterNotificationsError>,
		>
		where
			R::Policy: aws_smithy_client::bounds::SmithyRetryPolicy<
				crate::input::UnregisterNotificationsInputOperationOutputAlias,
				crate::output::UnregisterNotificationsOutput,
				crate::error::UnregisterNotificationsError,
				crate::input::UnregisterNotificationsInputOperationRetryAlias,
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
		/// Represents a value for which notification service to unregister.
		pub fn service(mut self, input: crate::model::NotificationUnregisterService) -> Self {
			self.inner = self.inner.service(input);
			self
		}
		/// Represents a value for which notification service to unregister.
		pub fn set_service(
			mut self,
			input: std::option::Option<crate::model::NotificationUnregisterService>,
		) -> Self {
			self.inner = self.inner.set_service(input);
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
