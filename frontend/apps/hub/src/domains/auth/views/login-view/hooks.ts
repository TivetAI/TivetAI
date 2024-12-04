import type { SubmitHandler as FormSubmitHandler } from "@/domains/auth/forms/otp-form";
import { useCompleteEmailVerificationMutation } from "@/domains/auth/queries";
import { selfProfileQueryOptions } from "@/domains/user/queries";
import { Tivet } from "@tivet-gg/api";
import * as Sentry from "@sentry/react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuth } from "../../contexts/auth";

const RESPONSE_MAP = {
	[Tivet.auth.CompleteStatus.SwitchIdentity]: {
		type: Tivet.auth.CompleteStatus.SwitchIdentity,
	},
	[Tivet.auth.CompleteStatus.LinkedAccountAdded]: {
		type: Tivet.auth.CompleteStatus.LinkedAccountAdded,
	},
	[Tivet.auth.CompleteStatus.AlreadyComplete]: {
		type: "error",
		message: "This verification session has already been completed.",
	},
	[Tivet.auth.CompleteStatus.Expired]: {
		type: "error",
		message: "This verification session has expired. Please try again.",
	},
	[Tivet.auth.CompleteStatus.TooManyAttempts]: {
		type: "error",
		message: "Too many failed attempts. Try again later.",
	},
	[Tivet.auth.CompleteStatus.Incorrect]: {
		type: "error",
		message: "The verification code given is incorrect.",
	},
	default: {
		type: "error",
		message: "Unknown error",
	},
} as const;

export interface OtpFormSubmitHandlerArgs {
	verificationId: string | undefined;
	onSuccess?: () => void;
}

export const useOtpFormSubmitHandler = ({
	onSuccess,
	verificationId,
}: OtpFormSubmitHandlerArgs) => {
	const { refreshToken } = useAuth();
	const queryClient = useQueryClient();
	const { mutateAsync } = useCompleteEmailVerificationMutation();

	const callback: FormSubmitHandler = useCallback(
		async (values, form) => {
			if (!verificationId) {
				return form.setError("otp", {
					type: "manual",
					message: "Unknown error. Please try again.",
				});
			}
			try {
				const response = await mutateAsync({
					verificationId,
					code: values.otp,
				});

				const translatedResponse =
					RESPONSE_MAP[response.status] || RESPONSE_MAP.default;

				if (translatedResponse.type === "error") {
					return form.setError("otp", {
						type: "manual",
						message: translatedResponse.message,
					});
				}
				await refreshToken();
				await queryClient.refetchQueries({
					...selfProfileQueryOptions(),
					exact: true,
				});
				return onSuccess?.();
			} catch (error) {
				Sentry.captureException(error);
				return form.setError("otp", {
					type: "manual",
					message: "Invalid verification code",
				});
			}
		},
		[
			mutateAsync,
			onSuccess,
			queryClient.refetchQueries,
			refreshToken,
			verificationId,
		],
	);

	return callback;
};
