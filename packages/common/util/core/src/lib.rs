use rand::Rng;
pub use tivet_util_macros as macros;
use tokio::time::{Duration, Instant};

pub mod billing;
pub mod check;
pub mod dev_defaults;
pub mod duration;
pub mod faker;
pub mod file_size;
pub mod format;
pub mod future;
pub mod geo;
pub mod glob;
pub mod math;
pub mod req;
pub mod route;
pub mod serde;
pub mod sort;
pub mod timestamp;
pub mod url;
pub mod uuid;

pub mod watch {
	/// Represented in seconds.
	///
	/// See docs/infrastructure/TIMEOUTS.md for reasoning.
	pub const DEFAULT_TIMEOUT: u64 = 40 * 1000;
}

#[cfg(feature = "macros")]
#[macro_export]
macro_rules! err_path {
	($($topics:expr),+ $(,)?) => {
		vec![
			$($topics.to_string(),)+
		]
	};
}

// TODO: Clean this up, pass flags to Bolt to configure this
#[macro_export]
macro_rules! inject_latency {
	() => {
		// if !$crate::env::is_production_namespace() {
		// 	tokio::time::sleep(::std::time::Duration::from_secs(1)).await;
		// }
	};
	($perf:expr) => {
		// if !$crate::env::is_production_namespace() {
		// 	let span = $perf.start("inject-latency").await;
		// 	tokio::time::sleep(::std::time::Duration::from_secs(1)).await;
		// 	span.end();
		// }
	};
}

pub struct Backoff {
	/// Maximum exponent for the backoff.
	max_exponent: usize,

	/// Maximum amount of retries.
	max_retries: Option<usize>,

	/// Base wait time in ms.
	wait: usize,

	/// Maximum randomness.
	randomness: usize,

	/// Iteration of the backoff.
	i: usize,

	/// Timestamp to sleep until in ms.
	sleep_until: Instant,
}

impl Backoff {
	pub fn new(
		max_exponent: usize,
		max_retries: Option<usize>,
		wait: usize,
		randomness: usize,
	) -> Backoff {
		Backoff {
			max_exponent,
			max_retries,
			wait,
			randomness,
			i: 0,
			sleep_until: Instant::now(),
		}
	}

	pub fn new_at(
		max_exponent: usize,
		max_retries: Option<usize>,
		wait: usize,
		randomness: usize,
		i: usize,
	) -> Backoff {
		Backoff {
			max_exponent,
			max_retries,
			wait,
			randomness,
			i,
			sleep_until: Instant::now(),
		}
	}

	pub fn tick_index(&self) -> usize {
		self.i
	}

	/// Waits for the next backoff tick.
	///
	/// Returns false if the index is greater than `max_retries`.
	pub async fn tick(&mut self) -> bool {
		if self.max_retries.map_or(false, |x| self.i > x) {
			return false;
		}

		tokio::time::sleep_until(self.sleep_until).await;

		let next_wait = self.wait * 2usize.pow(self.i.min(self.max_exponent) as u32)
			+ rand::thread_rng().gen_range(0..self.randomness);
		self.sleep_until += Duration::from_millis(next_wait as u64);

		self.i += 1;

		true
	}

	/// Returns the instant of the next backoff tick. Does not wait.
	///
	/// Returns None if the index is greater than `max_retries`.
	pub fn step(&mut self) -> Option<Instant> {
		if self.max_retries.map_or(false, |x| self.i > x) {
			return None;
		}

		let next_wait = self.wait * 2usize.pow(self.i.min(self.max_exponent) as u32)
			+ rand::thread_rng().gen_range(0..self.randomness);
		self.sleep_until += Duration::from_millis(next_wait as u64);

		self.i += 1;

		Some(self.sleep_until)
	}

	pub fn default_infinite() -> Backoff {
		Backoff::new(8, None, 1_000, 1_000)
	}
}

impl Default for Backoff {
	fn default() -> Backoff {
		Backoff::new(5, Some(16), 1_000, 1_000)
	}
}

/// Used to statically assert a clean exit. See
/// https://stackoverflow.com/a/62408044
pub struct CleanExit;

#[cfg(test)]
mod tests {
	use std::time::Instant;

	#[tokio::test]
	#[ignore]
	async fn test_backoff() {
		// Manually validate with `--nocapture` that the ticks are powers of 2

		let mut backoff = super::Backoff::new(5, Some(8), 100, 100);
		let mut last_tick = Instant::now();
		loop {
			let now = Instant::now();
			let dt = now.duration_since(last_tick);
			last_tick = now;
			println!("tick: {}", dt.as_secs_f64());

			if !backoff.tick().await {
				println!("cancelling");
				break;
			}
		}
	}
}

/// Slices a string without panicking on char boundaries. Defaults to the left side of the char if a slice
// is invalid. Will still panic if start > end.
pub fn safe_slice(s: &str, start: usize, end: usize) -> &str {
	// Adjust start to the nearest valid boundary to the left
	let adjusted_start = s
		.char_indices()
		.take_while(|&(i, _)| i <= start)
		.last()
		.map(|(i, _)| i)
		.unwrap_or(0);

	// Adjust end to the nearest valid boundary to the left
	let adjusted_end = s
		.char_indices()
		.take_while(|&(i, _)| i <= end)
		.last()
		.map(|(i, _)| i)
		.unwrap_or(s.len());

	&s[adjusted_start..adjusted_end]
}
