// DO NOT MODIFY
//
// Generated with scripts/sdk_actor/compile_bridge.ts

import { core } from "ext:core/mod.js";
import { op_tivet_kv_delete, op_tivet_kv_delete_all, op_tivet_kv_delete_batch, op_tivet_kv_get, op_tivet_kv_get_batch, op_tivet_kv_list, op_tivet_kv_put, op_tivet_kv_put_batch, } from "ext:core/ops";
import { deepEqual } from "./lib/fast-equals/index.js";
/**
 * Retrieves a value from the key-value store.
 */
export async function get(key, options) {
    const entry = await op_tivet_kv_get(serializeKey(key));
    if (entry == null)
        return null;
    return deserializeValue(key, entry.value, options?.format);
}
/**
 * Retrieves a batch of key-value pairs.
 */
export async function getBatch(keys, options) {
    const entries = await op_tivet_kv_get_batch(keys.map((x) => serializeKey(x)));
    return new HashMap(entries.map(([key, entry]) => {
        const jsKey = deserializeKey(key);
        return [
            jsKey,
            deserializeValue(jsKey, entry.value, options?.format),
        ];
    }));
}
/**
 * Retrieves all key-value pairs in the KV store. When using any of the options, the keys lexicographic order
 * is used for filtering.
 *
 * @param {ListOptions} [options] - Options.
 * @returns {Promise<HashMap<Key, Entry>>} The retrieved values.
 */
export async function list(options) {
    // Build query
    let query;
    if (options?.prefix) {
        query = {
            prefix: serializeListKey(options.prefix),
        };
    }
    else if (options?.start) {
        if (!options.end) {
            throw new Error("must set options.end with options.start");
        }
        query = {
            rangeInclusive: [
                serializeListKey(options.start),
                serializeKey(options.end),
            ],
        };
    }
    else if (options?.startAfter) {
        if (!options.end) {
            throw new Error("must set options.end with options.startAfter");
        }
        query = {
            rangeExclusive: [
                serializeListKey(options.startAfter),
                serializeKey(options.end),
            ],
        };
    }
    else if (options?.end) {
        throw new Error("must set options.start or options.startAfter with options.end");
    }
    else {
        query = { all: {} };
    }
    const entries = await op_tivet_kv_list(query, options?.reverse ?? false, options?.limit);
    return new HashMap(entries.map(([key, entry]) => {
        const jsKey = deserializeKey(key);
        return [
            jsKey,
            deserializeValue(jsKey, entry.value, options?.format),
        ];
    }));
}
/**
 * Stores a key-value pair in the key-value store.
 *
 * @param {Key} key - The key under which the value will be stored.
 * @param {Entry | ArrayBuffer} value - The value to be stored, which will be serialized.
 * @param {PutOptions} [options] - Options.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function put(key, value, options) {
    validateType(value, null, options?.format);
    const format = options?.format ?? "value";
    let serializedValue;
    if (format === "value") {
        serializedValue = core.serialize(value, { forStorage: true });
    }
    else if (format === "arrayBuffer") {
        if (value instanceof ArrayBuffer)
            serializedValue = new Uint8Array(value);
        else {
            throw new Error(`value must be of type \`ArrayBuffer\` if format is "arrayBuffer"`);
        }
    }
    else {
        // Handled by validateType
        throw new Error(`unreachable format: \`${format}\``);
    }
    await op_tivet_kv_put(serializeKey(key), serializedValue);
}
/**
 * Stores a batch of key-value pairs.
 *
 * @param {Map<Key, Entry | ArrayBuffer>} obj - An object containing key-value pairs to be stored.
 * @param {PutBatchOptions} [options] - Options.
 * @returns {Promise<void>} A promise that resolves when the batch operation is complete.
 */
export async function putBatch(obj, options) {
    const serializedObj = new Map();
    const format = options?.format ?? "value";
    for (const [key, value] of obj) {
        validateType(value, key, format);
        let serializedValue;
        if (format === "value") {
            serializedValue = core.serialize(value, { forStorage: true });
        }
        else if (format === "arrayBuffer") {
            if (value instanceof ArrayBuffer)
                serializedValue = new Uint8Array(value);
            else {
                throw new Error(`value in key "${key}" must be of type \`ArrayBuffer\` if format is "arrayBuffer"`);
            }
        }
        else {
            // Handled by validateType
            throw new Error(`unreachable format: \`${format}\``);
        }
        serializedObj.set(serializeKey(key), serializedValue);
    }
    await op_tivet_kv_put_batch(serializedObj);
}
/**
 * Deletes a key-value pair from the key-value store.
 *
 * @param {Key} key - The key of the key-value pair to delete.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function delete_(key) {
    return await op_tivet_kv_delete(serializeKey(key));
}
/**
 * Deletes a batch of key-value pairs from the key-value store.
 *
 * @param {Key[]} keys - A list of keys to delete.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function deleteBatch(keys) {
    return await op_tivet_kv_delete_batch(keys.map((x) => serializeKey(x)));
}
/**
 * Deletes all data from the key-value store. **This CANNOT be undone.**
 *
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export async function deleteAll() {
    return await op_tivet_kv_delete_all();
}
function validateType(value, key, format = "value") {
    const keyText = key ? ` in key "{key}"` : "";
    if (format === "value") {
        if (value instanceof Blob) {
            throw new Error(`the type ${value.constructor.name}${keyText} is not serializable in Deno, but you can use a TypedArray instead. See https://github.com/denoland/deno/issues/12067#issuecomment-1975001079.`);
        }
        if (value instanceof CryptoKey ||
            value instanceof DOMException ||
            // Not defined in Deno
            // value instanceof RTCCertificate ||
            // We don't load in the canvas ext into the the Deno runtime for Tivet
            // value instanceof ImageBitmap ||
            value instanceof ImageData) {
            throw new Error(`the type ${value.constructor.name}${keyText} is not serializable in Deno. See https://github.com/denoland/deno/issues/12067#issuecomment-1975001079.`);
        }
    }
    else if (format === "arrayBuffer") {
        if (!(value instanceof ArrayBuffer)) {
            throw new Error(`value must be an ArrayBuffer if options.format = "arrayBuffer".`);
        }
    }
    else {
        throw new Error("unexpected key type from KV driver");
    }
}
function serializeKey(key) {
    if (Array.isArray(key)) {
        return { jsInKey: key.map((x) => core.serialize(x)) };
    }
    return { jsInKey: [core.serialize(key)] };
}
function serializeListKey(key) {
    if (Array.isArray(key)) {
        return key.map((x) => core.serialize(x));
    }
    return [core.serialize(key)];
}
function deserializeKey(key) {
    if ("inKey" in key || "outKey" in key) {
        const jsKey = key.inKey ?? key.outKey;
        const tuple = jsKey.map((x) => core.deserialize(x));
        if (tuple.length === 1)
            return tuple[0];
        return tuple;
    }
    throw new Error("unexpected key type from KV driver");
}
function deserializeValue(key, value, format = "value") {
    if (value === undefined)
        return value;
    if (format === "value") {
        try {
            return core.deserialize(value, { forStorage: true });
        }
        catch (e) {
            throw new Error(`could not deserialize value in key "${key}". you must use options.format = "arrayBuffer".`, { cause: e });
        }
    }
    else if (format === "arrayBuffer") {
        return value.buffer;
    }
    else {
        throw Error(`invalid format: "${format}". expected "value" or "arrayBuffer".`);
    }
}
class HashMap {
    #internal;
    constructor(internal) {
        this.#internal = internal;
    }
    get(key) {
        for (const [k, v] of this.#internal) {
            if (deepEqual(key, k))
                return v;
        }
        return undefined;
    }
    /**
     * Returns a map of keys to values. **WARNING** Using `.get` on the returned map does not work as expected
     * with complex types (arrays, objects, etc). Use `.get` on this class instead.
     */
    raw() {
        return new Map(this.#internal);
    }
    array() {
        return this.#internal;
    }
    entries() {
        return this[Symbol.iterator]();
    }
    [Symbol.iterator]() {
        return this.#internal[Symbol.iterator]();
    }
}
export const KV_NAMESPACE = {
    get,
    getBatch,
    list,
    put,
    putBatch,
    delete: delete_,
    deleteBatch,
    deleteAll,
};
