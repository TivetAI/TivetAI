export const INTERNAL_ERROR_CODE = "internal_error";
export const INTERNAL_ERROR_DESCRIPTION =
	"Internal error. Read the actor logs for more details.";
export interface InternalErrorMetadata {
	url: string;
}

export const RATE_LIMIT_EXCEEDED_CODE = "rate_limit_exceeded";
export const AUTH_TOKEN_EXPIRED_CODE = "auth_token_expired";
export const FEATURE_FLAG_DISABLED_CODE = "feature_flag_disabled";
export const INVALID_INPUT_CODE = "invalid_input";
export const USER_ERROR_CODE = "user_error";

export function isActorError(err: unknown): err is ActorError {
	return err instanceof ActorError;
}

export function isPublicError(err: unknown): boolean {
	return isActorError(err) && err.public;
}

interface ActorErrorOptions extends ErrorOptions {
	/** Error data can safely be serialized in a response to the client. */
	public?: boolean;
	/** Metadata associated with this error. This will be sent to clients. */
	metadata?: unknown;
}

export class ActorError extends Error {
	public public: boolean;
	public metadata?: unknown;

	constructor(
		public readonly code: string,
		message: string,
		opts?: ActorErrorOptions,
	) {
		super(message, { cause: opts?.cause });
		this.public = opts?.public ?? false;
		this.metadata = opts?.metadata;
	}
}

export class InternalError extends ActorError {
	constructor(message: string) {
		super(INTERNAL_ERROR_CODE, message);
	}
}

export class Unreachable extends InternalError {
	constructor(x: never) {
		super(`Unreachable case: ${x}`);
	}
}

export class StateNotEnabled extends ActorError {
	constructor() {
		super(
			"state_not_enabled",
			"State not enabled. Must implement `_onInitialize` to use state.",
		);
	}
}

export class ConnectionStateNotEnabled extends ActorError {
	constructor() {
		super(
			"connection_state_not_enabled",
			"Connection state not enabled. Must implement `_onBeforeConnect` to use connection state.",
		);
	}
}

export class RpcTimedOut extends ActorError {
	constructor() {
		super("rpc_timed_out", "RPC timed out.", { public: true });
	}
}

export class RpcNotFound extends ActorError {
	constructor() {
		super("rpc_not_found", "RPC not found.", { public: true });
	}
}

export class InvalidProtocolFormat extends ActorError {
	constructor(format?: string) {
		super(
			"invalid_protocol_format",
			`Invalid protocol format \`${format}\`.`,
			{
				public: true,
			},
		);
	}
}

export class ConnectionParametersTooLong extends ActorError {
	constructor() {
		super(
			"connection_parameters_too_long",
			"Connection parameters too long.",
			{
				public: true,
			},
		);
	}
}

export class MalformedConnectionParameters extends ActorError {
	constructor(cause: unknown) {
		super(
			"malformed_connnection_parameters",
			`Malformed connection parameters: ${cause}`,
			{ public: true, cause },
		);
	}
}

export class MessageTooLong extends ActorError {
	constructor() {
		super("message_too_long", "Message too long.", { public: true });
	}
}

export class MalformedMessage extends ActorError {
	constructor(cause?: unknown) {
		super("malformed_message", `Malformed message: ${cause}`, {
			public: true,
			cause,
		});
	}
}

export interface InvalidStateTypeOptions {
	path?: unknown;
}

export class InvalidStateType extends ActorError {
	constructor(opts?: InvalidStateTypeOptions) {
		let msg = "";
		if (opts?.path) {
			msg += `Attempted to set invalid state at path \`${opts.path}\`.`;
		} else {
			msg += "Attempted to set invalid state.";
		}
		msg += " State must be JSON serializable.";
		super("invalid_state_type", msg);
	}
}

export class StateTooLarge extends ActorError {
	constructor() {
		super("state_too_large", "State too large.");
	}
}

export class Unsupported extends ActorError {
	constructor(feature: string) {
		super("unsupported", `Unsupported feature: ${feature}`);
	}
}

export class RateLimitExceeded extends ActorError {
	constructor(limit: number, windowSec: number) {
		super(RATE_LIMIT_EXCEEDED_CODE, `Rate limit exceeded: ${limit} per ${windowSec}s`, {
			public: true,
			metadata: { limit, windowSec },
		});
	}
}

export class AuthTokenExpired extends ActorError {
	constructor(expiredAt: Date) {
		super(AUTH_TOKEN_EXPIRED_CODE, `Authentication token expired at ${expiredAt.toISOString()}.`, {
			public: true,
			metadata: { expiredAt },
		});
	}
}

export class FeatureFlagDisabled extends ActorError {
	constructor(flag: string) {
		super(FEATURE_FLAG_DISABLED_CODE, `Feature "${flag}" is currently disabled.`, {
			public: true,
			metadata: { flag },
		});
	}
}

export class InvalidInput extends ActorError {
	constructor(field: string, reason: string) {
		super(INVALID_INPUT_CODE, `Invalid input in "${field}": ${reason}`, {
			public: true,
			metadata: { field, reason },
		});
	}
}

// Utility: error wrapping
export function wrapError(
	err: unknown,
	message = "Unexpected internal error",
): ActorError {
	if (isActorError(err)) return err;

	return new InternalError(`${message}: ${err instanceof Error ? err.message : String(err)}`);
}

// Additional common errors
export class DatabaseUnavailable extends InternalError {
	constructor(service: string) {
		super(`Database service "${service}" is unavailable.`);
	}
}

export class DependencyFailure extends InternalError {
	constructor(service: string, reason: string) {
		super(`Dependency failure from "${service}": ${reason}`);
	}
}

export class MissingEnvironmentVariable extends InternalError {
	constructor(name: string) {
		super(`Missing environment variable: ${name}`);
	}
}

// Useful metadata types
export interface AuthErrorMetadata {
	userId?: string;
	ip?: string;
	userAgent?: string;
}

export class UnauthorizedAccess extends ActorError {
	constructor(action: string, metadata: AuthErrorMetadata = {}) {
		super("unauthorized_access", `Unauthorized to perform action: ${action}`, {
			public: true,
			metadata,
		});
	}
}

export class ForbiddenResource extends ActorError {
	constructor(resource: string, metadata?: unknown) {
		super("forbidden_resource", `Access to resource "${resource}" is forbidden.`, {
			public: true,
			metadata,
		});
	}
}

// Add some helpers for building structured messages
export function formatErrorMessage(code: string, context: string, metadata?: Record<string, unknown>): string {
	return `[${code}] ${context}${metadata ? ` | ${JSON.stringify(metadata)}` : ""}`;
}

/**
 * Options for the UserError class.
 */
export interface UserErrorOptions extends ErrorOptions {
	/**
	 * Machine readable code for this error. Useful for catching different types of errors in try-catch.
	 */
	code?: string;

	/**
	 * Additional metadata related to the error. Useful for understanding context about the error.
	 */
	metadata: unknown;
}

/** Error that can be safely returned to the user. */
export class UserError extends ActorError {
	/**
	 * Constructs a new UserError instance.
	 *
	 * @param message - The error message to be displayed.
	 * @param opts - Optional parameters for the error, including a machine-readable code and additional metadata.
	 */
	constructor(message: string, opts?: UserErrorOptions) {
		super(opts?.code ?? USER_ERROR_CODE, message, {
			public: true,
			metadata: opts?.metadata,
		});
	}
}
