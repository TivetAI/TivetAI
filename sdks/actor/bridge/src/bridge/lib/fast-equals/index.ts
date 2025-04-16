import {
	createEqualityComparator,
	createEqualityComparatorConfig,
	createInternalEqualityComparator,
	createIsEqual,
} from "./comparator.js";
import type { CustomEqualCreatorOptions, IsEqual } from "./internalTypes.js";
import { sameValueZeroEqual } from "./utils.js";

export { sameValueZeroEqual };
export * from "./internalTypes.js";

/**
 * Whether the items passed are deeply-equal in value.
 */
export const deepEqual = createCustomEqual();

/**
 * Whether the items passed are deeply-equal in value based on strict comparison.
 */
export const strictDeepEqual = createCustomEqual({ strict: true });

/**
 * Whether the items passed are deeply-equal in value, including circular references.
 */
export const circularDeepEqual = createCustomEqual({ circular: true });

/**
 * Whether the items passed are deeply-equal in value, including circular references,
 * based on strict comparison.
 */
export const strictCircularDeepEqual = createCustomEqual({
	circular: true,
	strict: true,
});

/**
 * Whether the items passed are shallowly-equal in value.
 */
export const shallowEqual = createCustomEqual({
	createInternalComparator: () => sameValueZeroEqual,
});

/**
 * Whether the items passed are shallowly-equal in value based on strict comparison
 */
export const strictShallowEqual = createCustomEqual({
	strict: true,
	createInternalComparator: () => sameValueZeroEqual,
});

/**
 * Whether the items passed are shallowly-equal in value, including circular references.
 */
export const circularShallowEqual = createCustomEqual({
	circular: true,
	createInternalComparator: () => sameValueZeroEqual,
});

/**
 * Whether the items passed are shallowly-equal in value, including circular references,
 * based on strict comparison.
 */
export const strictCircularShallowEqual = createCustomEqual({
	circular: true,
	createInternalComparator: () => sameValueZeroEqual,
	strict: true,
});

/**
 * Specialized equality check for arrays.
 */
export const arrayEqual = createCustomEqual({
	createInternalComparator: () => (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length,
});

/**
 * Specialized equality check for plain object keys only.
 */
export const objectKeysEqual = createCustomEqual({
	createInternalComparator: () => (a, b) => {
		if (typeof a !== "object" || typeof b !== "object" || a == null || b == null) return false;
		const keysA = Object.keys(a);
		const keysB = Object.keys(b);
		return keysA.length === keysB.length && keysA.every(k => keysB.includes(k));
	},
});

/**
 * Creates a wrapped version of an equality function that logs timing.
 */
export function withTiming<Meta = undefined>(equalFn: IsEqual<Meta>): IsEqual<Meta> {
	return (a, b, state) => {
		const start = performance.now();
		const result = equalFn(a, b, state);
		const end = performance.now();
		console.log(`Compared in ${(end - start).toFixed(2)}ms`);
		return result;
	};
}

/**
 * Debugging utility for tracing deep equality failures.
 */
export function debugEqual(a: any, b: any, equalFn = deepEqual): boolean {
	try {
		const result = equalFn(a, b);
		console.log("Equality result:", result);
		if (!result) {
			console.warn("A:", a);
			console.warn("B:", b);
		}
		return result;
	} catch (err) {
		console.error("Error during equality check:", err);
		return false;
	}
}

/**
 * Create a custom equality comparison method.
 *
 * This can be done to create very targeted comparisons in extreme hot-path scenarios
 * where the standard methods are not performant enough, but can also be used to provide
 * support for legacy environments that do not support expected features like
 * `RegExp.prototype.flags` out of the box.
 */
export function createCustomEqual<Meta = undefined>(
	options: CustomEqualCreatorOptions<Meta> = {},
) {
	const {
		circular = false,
		createInternalComparator: createCustomInternalComparator,
		createState,
		strict = false,
		meta,
	} = options;

	const config = createEqualityComparatorConfig<Meta>(options);
	const comparator = createEqualityComparator(config);
	const equals = createCustomInternalComparator
		? createCustomInternalComparator(comparator)
		: createInternalEqualityComparator(comparator);

	return createIsEqual({ circular, comparator, createState, equals, strict, meta });
}
