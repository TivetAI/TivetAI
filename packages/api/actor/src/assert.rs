use api_helper::ctx::Ctx;
use ds::types::{EndpointType, Server};
use tivet_operation::prelude::*;
use uuid::Uuid;

use crate::auth::Auth;

/// Custom error for server validation failure.
#[derive(Debug, thiserror::Error)]
pub enum ServerValidationError {
    #[error("Server not found")]
    NotFound,
    #[error("Server environment mismatch")]
    EnvMismatch,
    #[error("Unauthorized access to server")]
    Unauthorized,
    #[error("Invalid endpoint type")]
    InvalidEndpointType,
}

/// Validate that the server exists and belongs to the environment.
/// Also perform additional checks like authorization and endpoint type validation.
///
/// # Arguments
/// - `ctx`: Request context including authentication.
/// - `server_id`: UUID of the server to validate.
/// - `_game_id`: UUID of the game (reserved for future use).
/// - `env_id`: UUID of the environment server must belong to.
/// - `endpoint_type`: Optional endpoint type to filter server retrieval.
///
/// # Returns
/// The validated server or an error if validation fails.
pub async fn server_for_env(
    ctx: &Ctx<Auth>,
    server_id: Uuid,
    _game_id: Uuid,
    env_id: Uuid,
    endpoint_type: Option<EndpointType>,
) -> GlobalResult<Server> {
    tracing::info!("Starting server_for_env validation");

    // Step 1: Retrieve the server details from backend.
    let servers_res = fetch_server(ctx, server_id, endpoint_type).await?;

    // Step 2: Extract the server from the response.
    let server = extract_server(servers_res)?;

    // Step 3: Validate the environment ID.
    validate_env(server.env_id, env_id)?;

    // Step 4: Optional - validate game association if needed in the future.
    // validate_game(server.game_id, _game_id)?;

    // Step 5: Check authorization for current user/context to access this server.
    authorize_access(ctx, &server).await?;

    // Step 6: Additional validations can be performed here.
    // For example, validate server status, version, or endpoint compatibility.

    tracing::info!("Server validation passed for server ID: {}", server_id);

    // Return the validated server
    Ok(server)
}

/// Fetch the server details from the backend using the provided filters.
async fn fetch_server(
    ctx: &Ctx<Auth>,
    server_id: Uuid,
    endpoint_type: Option<EndpointType>,
) -> GlobalResult<ds::ops::server::get::Output> {
    tracing::debug!("Fetching server from backend: server_id={}, endpoint_type={:?}", server_id, endpoint_type);

    let response = ctx
        .op(ds::ops::server::get::Input {
            server_ids: vec![server_id],
            endpoint_type,
        })
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch server: {:?}", e);
            e
        })?;

    Ok(response)
}

/// Extracts a single server from the response or returns an error if none found.
fn extract_server(
    servers_res: ds::ops::server::get::Output,
) -> Result<Server, ServerValidationError> {
    servers_res.servers.into_iter().next().ok_or(ServerValidationError::NotFound)
}

/// Validates that the server environment matches the expected environment.
fn validate_env(server_env_id: Uuid, expected_env_id: Uuid) -> Result<(), ServerValidationError> {
    if server_env_id != expected_env_id {
        tracing::warn!("Server environment mismatch: server_env={}, expected_env={}", server_env_id, expected_env_id);
        Err(ServerValidationError::EnvMismatch)
    } else {
        Ok(())
    }
}

/// Stub for future game ID validation.
/// fn validate_game(server_game_id: Uuid, expected_game_id: Uuid) -> Result<(), ServerValidationError> {
///     // Implement game validation logic if required.
///     Ok(())
/// }

/// Checks if the current user or token in context is authorized to access the server.
async fn authorize_access(ctx: &Ctx<Auth>, server: &Server) -> Result<(), ServerValidationError> {
    // Placeholder: Insert real authorization logic here, e.g. role check, token scope check.
    // For now, assume all authenticated users have access.

    tracing::debug!("Authorizing access for server ID: {}", server.server_id);

    if !ctx.auth().is_authenticated() {
        tracing::warn!("Unauthorized access attempt to server ID: {}", server.server_id);
        return Err(ServerValidationError::Unauthorized);
    }

    // Additional authorization checks can be added here.

    Ok(())
}

// -------- Additional helper utilities --------

/// Example helper function to log detailed server info.
/// Useful for debugging or audit logs.
fn log_server_info(server: &Server) {
    tracing::info!(
        "Server info: id={}, env_id={}, endpoint_type={:?}, status={}",
        server.server_id,
        server.env_id,
        server.endpoint_type,
        server.status
    );
}

/// Example helper to validate endpoint type if needed in future.
/// fn validate_endpoint_type(endpoint_type: &Option<EndpointType>) -> Result<(), ServerValidationError> {
///     match endpoint_type {
///         Some(et) if is_valid_endpoint_type(et) => Ok(()),
///         Some(_) => Err(ServerValidationError::InvalidEndpointType),
///         None => Ok(()),
///     }
/// }
///
/// fn is_valid_endpoint_type(et: &EndpointType) -> bool {
///     // Implement allowed endpoint types check.
///     true
/// }
