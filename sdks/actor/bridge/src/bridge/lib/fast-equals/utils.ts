import type {
	AnyEqualityComparator,
	Cache,
	CircularState,
	Dictionary,
	State,
	TypeEqualityComparator,
} from "./internalTypes.js";

const { getOwnPropertyNames, getOwnPropertySymbols, getOwnPropertyDescriptor } = Object;
const { hasOwnProperty } = Object.prototype;

/**
 * Combine two comparators into a single comparator.
 */
export function combineComparators<Meta>(
	comparatorA: AnyEqualityComparator<Meta>,
	comparatorB: AnyEqualityComparator<Meta>,
) {
	return function isEqual<A, B>(a: A, b: B, state: State<Meta>) {
		return comparatorA(a, b, state) && comparatorB(a, b, state);
	};
}

/**
 * Wrap the provided `areItemsEqual` method to manage the circular state, allowing
 * for circular references to be safely included in the comparison without creating
 * stack overflows.
 */
export function createIsCircular<AreItemsEqual extends TypeEqualityComparator<any, any>>(
	areItemsEqual: AreItemsEqual,
): AreItemsEqual {
	return function isCircular(a: any, b: any, state: CircularState<Cache<any, any>>) {
		if (!a || !b || typeof a !== "object" || typeof b !== "object") {
			return areItemsEqual(a, b, state);
		}

		const { cache } = state;

		const cachedA = cache.get(a);
		const cachedB = cache.get(b);

		if (cachedA && cachedB) {
			return cachedA === b && cachedB === a;
		}

		cache.set(a, b);
		cache.set(b, a);

		const result = areItemsEqual(a, b, state);

		cache.delete(a);
		cache.delete(b);

		return result;
	} as AreItemsEqual;
}

/**
 * Get the properties to strictly examine, which include both own properties that are
 * not enumerable and symbol properties.
 */
export function getStrictProperties(object: Dictionary): Array<string | symbol> {
	return (getOwnPropertyNames(object) as Array<string | symbol>).concat(
		getOwnPropertySymbols(object),
	);
}

/**
 * Whether the object contains the property passed as an own property.
 */
export const hasOwn =
	Object.hasOwn ||
	((object: Dictionary, property: number | string | symbol) =>
		hasOwnProperty.call(object, property));

/**
 * Whether the values passed are strictly equal or both NaN.
 */
export function sameValueZeroEqual(a: any, b: any): boolean {
	return a === b || (a !== a && b !== b);
}

/**
 * Whether the given value is a plain object.
 */
export function isPlainObject(value: any): value is Record<string | symbol, unknown> {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * Shallowly compare descriptors of two objects' properties.
 */
export function comparePropertyDescriptors(
	a: Dictionary,
	b: Dictionary,
): boolean {
	const propsA = getStrictProperties(a);
	const propsB = getStrictProperties(b);

	if (propsA.length !== propsB.length) return false;

	for (const prop of propsA) {
		if (!hasOwn(b, prop)) return false;

		const descA = getOwnPropertyDescriptor(a, prop);
		const descB = getOwnPropertyDescriptor(b, prop);

		if (!descA || !descB) return false;

		if (
			descA.enumerable !== descB.enumerable ||
			descA.configurable !== descB.configurable ||
			descA.writable !== descB.writable
		) {
			return false;
		}
	}
	return true;
}

/**
 * Track object depth during traversal, helpful for debugging or limiting recursion.
 */
export function trackDepth<T>(
	callback: (depth: number) => T,
	initialDepth = 0,
): T {
	let currentDepth = initialDepth;
	const result = callback(currentDepth);
	return result;
}

/**
 * Debug helper to log a detailed comparison.
 */
export function debugCompare(a: any, b: any, label = "Compare") {
	console.group(label);
	console.log("A:", a);
	console.log("B:", b);
	console.log("Equal:", sameValueZeroEqual(a, b));
	console.groupEnd();
}

/**
 * Count total properties in an object, including symbols.
 */
export function countProperties(obj: Dictionary): number {
	return getStrictProperties(obj).length;
}

/**
 * Generate a stable key for a given object (e.g., for memoization).
 */
export function generateObjectKey(obj: Dictionary): string {
	try {
		return JSON.stringify(
			getStrictProperties(obj).sort().reduce((acc, key) => {
				acc[key.toString()] = obj[key];
				return acc;
			}, {} as Record<string, any>),
		);
	} catch {
		return "[unserializable]";
	}
}
