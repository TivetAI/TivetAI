use global_error::{GlobalError, GlobalResult};
use uuid::Uuid;

use crate::{error::WorkflowError, history::location::Location};

/// Allows for checking if a global error returned from an activity is recoverable.
pub trait GlobalErrorExt {
	fn is_workflow_recoverable(&self) -> bool;
}

impl GlobalErrorExt for GlobalError {
	fn is_workflow_recoverable(&self) -> bool {
		match self {
			GlobalError::Raw(inner_err) => inner_err
				.downcast_ref::<WorkflowError>()
				.map(|err| err.is_recoverable())
				.unwrap_or_default(),
			_ => false,
		}
	}
}

impl<T> GlobalErrorExt for GlobalResult<T> {
	fn is_workflow_recoverable(&self) -> bool {
		match self {
			Err(GlobalError::Raw(inner_err)) => inner_err
				.downcast_ref::<WorkflowError>()
				.map(|err| err.is_recoverable())
				.unwrap_or_default(),
			_ => false,
		}
	}
}

pub mod time {
	use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

	use global_error::{unwrap, GlobalResult};

	pub trait TsToMillis {
		fn to_millis(self) -> GlobalResult<i64>;
	}

	impl TsToMillis for i64 {
		fn to_millis(self) -> GlobalResult<i64> {
			Ok(self)
		}
	}

	impl TsToMillis for Instant {
		fn to_millis(self) -> GlobalResult<i64> {
			let now_instant = Instant::now();

			let system_time = if self >= now_instant {
				SystemTime::now().checked_add(self.duration_since(now_instant))
			} else {
				SystemTime::now().checked_sub(now_instant.duration_since(self))
			};

			let ms = unwrap!(system_time, "invalid timestamp")
				.duration_since(SystemTime::UNIX_EPOCH)?
				.as_millis()
				.try_into()?;

			Ok(ms)
		}
	}

	impl TsToMillis for tokio::time::Instant {
		fn to_millis(self) -> GlobalResult<i64> {
			self.into_std().to_millis()
		}
	}

	impl TsToMillis for SystemTime {
		fn to_millis(self) -> GlobalResult<i64> {
			let ms = self
				.duration_since(SystemTime::UNIX_EPOCH)?
				.as_millis()
				.try_into()?;

			Ok(ms)
		}
	}

	pub trait DurationToMillis {
		fn to_millis(self) -> GlobalResult<u64>;
	}

	impl DurationToMillis for i64 {
		fn to_millis(self) -> GlobalResult<u64> {
			self.try_into().map_err(Into::into)
		}
	}

	impl DurationToMillis for i32 {
		fn to_millis(self) -> GlobalResult<u64> {
			self.try_into().map_err(Into::into)
		}
	}

	impl DurationToMillis for u64 {
		fn to_millis(self) -> GlobalResult<u64> {
			Ok(self)
		}
	}

	impl DurationToMillis for Duration {
		fn to_millis(self) -> GlobalResult<u64> {
			Ok(self.as_millis().try_into()?)
		}
	}

	pub async fn sleep_until_ts(ts: u64) {
		let target_time = UNIX_EPOCH + Duration::from_millis(ts);
		if let Ok(sleep_duration) = target_time.duration_since(SystemTime::now()) {
			tokio::time::sleep(sleep_duration).await;
		}
	}
}

pub(crate) fn new_conn(
	shared_client: &chirp_client::SharedClientHandle,
	pools: &tivet_pools::Pools,
	cache: &tivet_cache::Cache,
	ray_id: Uuid,
	req_id: Uuid,
	name: &str,
) -> tivet_connection::Connection {
	let client = shared_client.clone().wrap(
		req_id,
		ray_id,
		vec![chirp_client::TraceEntry {
			context_name: name.into(),
			req_id: Some(req_id.into()),
			ts: tivet_util::timestamp::now(),
		}],
	);

	tivet_connection::Connection::new(client, pools.clone(), cache.clone())
}

/// Returns true if `subset` is a subset of `superset`.
pub fn is_value_subset(subset: &serde_json::Value, superset: &serde_json::Value) -> bool {
	match (subset, superset) {
		(serde_json::Value::Object(sub_obj), serde_json::Value::Object(super_obj)) => {
			sub_obj.iter().all(|(k, sub_val)| {
				super_obj
					.get(k)
					.map_or(false, |super_val| is_value_subset(sub_val, super_val))
			})
		}
		(serde_json::Value::Array(sub_arr), serde_json::Value::Array(super_arr)) => sub_arr
			.iter()
			.zip(super_arr)
			.all(|(sub_val, super_val)| is_value_subset(sub_val, super_val)),
		_ => subset == superset,
	}
}

pub fn format_location(loc: &Location) -> String {
	let mut s = "{".to_string();

	let mut iter = loc.iter();

	if let Some(x) = iter.next() {
		s.push_str(&x.to_string());
	}

	for x in iter {
		s.push_str(", ");
		s.push_str(&x.to_string());
	}

	s.push('}');

	s
}
