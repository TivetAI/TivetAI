use std::{collections::HashSet, time::Duration};

use tivet_operation::prelude::*;

const WORKER_INSTANCE_LOST_THRESHOLD: i64 = util::duration::seconds(30);

pub async fn start(config: tivet_config::Config, pools: tivet_pools::Pools) -> GlobalResult<()> {
	let mut interval = tokio::time::interval(Duration::from_secs(15));
	loop {
		interval.tick().await;

		let ts = util::timestamp::now();
		run_from_env(config.clone(), pools.clone(), ts).await?;
	}
}

#[tracing::instrument(skip_all)]
pub async fn run_from_env(
	config: tivet_config::Config,
	pools: tivet_pools::Pools,
	ts: i64,
) -> GlobalResult<()> {
	let client = chirp_client::SharedClient::from_env(pools.clone())?.wrap_new("workflow-gc");
	let cache = tivet_cache::CacheInner::from_env(pools.clone())?;
	let ctx = OperationContext::new(
		"workflow-gc".into(),
		Duration::from_secs(60),
		config,
		tivet_connection::Connection::new(client, pools, cache),
		Uuid::new_v4(),
		Uuid::new_v4(),
		util::timestamp::now(),
		util::timestamp::now(),
		(),
	);

	// Reset all workflows on worker instances that have not had a ping in the last 30 seconds
	let rows = sql_fetch_all!(
		[ctx, (Uuid, Uuid,)]
		"
		UPDATE db_workflow.workflows AS w
		SET
			worker_instance_id = NULL,
			wake_immediate = true,
			wake_deadline_ts = NULL,
			wake_signals = ARRAY[],
			wake_sub_workflow_id = NULL
		FROM db_workflow.worker_instances AS wi
		WHERE
			wi.last_ping_ts < $1 AND
			wi.worker_instance_id = w.worker_instance_id AND
			w.output IS NULL AND
			w.silence_ts IS NULL AND
			-- Check for any wake condition so we don't restart a permanently dead workflow
			(
				w.wake_immediate OR
				w.wake_deadline_ts IS NOT NULL OR
				cardinality(w.wake_signals) > 0 OR
				w.wake_sub_workflow_id IS NOT NULL
			)
		RETURNING w.workflow_id, wi.worker_instance_id
		",
		ts - WORKER_INSTANCE_LOST_THRESHOLD,
	)
	.await?;

	if !rows.is_empty() {
		let unique_worker_instance_ids = rows
			.iter()
			.map(|(_, worker_instance_id)| worker_instance_id)
			.collect::<HashSet<_>>();

		tracing::info!(
			worker_instance_ids=?unique_worker_instance_ids,
			total_workflows=%rows.len(),
			"handled failover",
		);
	}

	Ok(())
}
