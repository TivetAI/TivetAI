deno_core::extension!(
	tivet_runtime,
	deps = [
		tivet_kv
	],
	esm_entry_point = "ext:tivet_runtime/90_tivet_ns.js",
	esm = [
		dir "js",
		"90_tivet_ns.js"
	],
);
