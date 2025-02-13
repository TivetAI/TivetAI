use anyhow::*;
use clap::Parser;

#[derive(Parser)]
pub enum SubCommand {
	Show,
}

impl SubCommand {
	pub async fn execute(self, config: tivet_config::Config) -> Result<()> {
		match self {
			Self::Show => {
				println!("{:#?}", *config);
				Ok(())
			}
		}
	}
}
