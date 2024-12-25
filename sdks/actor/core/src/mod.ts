/**
 * This file re-exports types from our internal bindings as a module dependency.
 *
 * An alternative approach is to use `declare module Tivet` then have developers
 * use `import "path/to/types.d.ts"`. However, this is rather annoying to do in
 * every file that uses Tivet. Additionally, it's not something most JS
 * developers are used to.
 */

export type { ActorContext } from "./bridge_types/90_tivet_ns.d.ts";
export type { Metadata } from "./bridge_types/types/metadata.d.ts";
export type { Kv } from "./bridge_types/40_tivet_kv.d.ts";
