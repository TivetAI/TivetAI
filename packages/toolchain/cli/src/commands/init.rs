use anyhow::*;
use clap::Parser;
use inquire::validator::Validation;
use serde::Serialize;
use std::{fmt, result::Result as StdResult};
use tokio::fs;
use toolchain::errors;

/// Initiate a new project
#[derive(Parser, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Opts {}

impl Opts {
	pub async fn execute(&self) -> Result<()> {
		// Check if project already exists
		if let Result::Ok(path) = toolchain::config::Config::config_path(None).await {
			return Err(errors::UserError::new(format!(
				"Tivet config already exists at {}",
				path.display()
			))
			.into());
		}

		// Prompt init settings
		let prompt = tokio::task::spawn_blocking(|| {
			let project_name = inquire::Text::new("What is your project name?")
				.with_default("my-app")
				.with_validator(|input: &str| {
					let is_valid = input
						.chars()
						.all(|c| c.is_alphanumeric() || c == '-' || c == '_');
					if is_valid {
						StdResult::Ok(Validation::Valid)
					} else {
						StdResult::Ok(Validation::Invalid(
							"Project name must be alphanumeric and can include '-' or '_'".into(),
						))
					}
				})
				.prompt()?;

			let lang = inquire::Select::new(
				"What language will you write your Tivet Actor in?",
				vec![Language::TypeScript, Language::JavaScript, Language::Docker],
			)
			.with_starting_cursor(0)
			.with_help_message(
				"This can be changed later. Multiple languages can be used in the same project.",
			)
			.prompt()?;

			let config_format = inquire::Select::new(
				"What config format do you prefer?",
				vec![ConfigFormat::Json, ConfigFormat::Jsonc],
			)
			.with_starting_cursor(0)
			.prompt()?;

			Ok(PromptOutput {
				project_name,
				lang,
				config_format,
			})
		})
		.await??;

		let project_path = std::env::current_dir()?.join(&prompt.project_name);

		println!();
		println!("Creating new Tivet project at {}", project_path.display());

		fs::create_dir(&project_path)
			.await
			.map_err(|err| anyhow!("failed to create project dir: {err}"))?;

		// Change dir so all subsequent tasks operate in this project
		std::env::set_current_dir(&project_path).context("failed to change dir")?;

		// Generate config
		let config = match prompt.lang {
			Language::TypeScript | Language::JavaScript => {
				// Write package config
				let package_config = include_str!("../../static/init/js/package.json")
					.replace("__NAME__", &prompt.project_name);
				fs::write(project_path.join("package.json"), package_config).await?;

				// Write script
				let (config_body, readme_body, script_name, script_body, test_name, test_body) =
					match prompt.lang {
						Language::TypeScript => {
							let tsconfig = include_str!(
								"../../../../../examples/javascript/bare-template-ts/tsconfig.json"
							);
							fs::write(project_path.join("tsconfig.json"), tsconfig).await?;

							(
                                include_str!("../../../../../examples/javascript/bare-template-ts/tivet.json"),
                                include_str!("../../../../../examples/javascript/bare-template-ts/README.md"),
                                "counter.ts",
                                include_str!("../../../../../examples/javascript/bare-template-ts/counter.ts"),
                                "counter_test.ts",
                                include_str!(
                                    "../../../../../examples/javascript/bare-template-ts/counter_test.ts"
                                ),
                            )
						}
						Language::JavaScript => (
							include_str!(
								"../../../../../examples/javascript/bare-template-js/tivet.json"
							),
							include_str!(
								"../../../../../examples/javascript/bare-template-js/README.md"
							),
							"counter.js",
							include_str!(
								"../../../../../examples/javascript/bare-template-js/counter.js"
							),
							"counter_test.js",
							include_str!(
								"../../../../../examples/javascript/bare-template-js/counter_test.js"
							),
						),
						_ => unreachable!(),
					};
				fs::write(project_path.join(script_name), script_body).await?;
				fs::write(project_path.join(test_name), test_body).await?;

				// Yarn P'n'P doesn't play nice with TSX and older Node versions (https://github.com/privatenumber/tsx/issues/166)
				let yarnrc_body = "nodeLinker: node-modules\n";
				fs::write(project_path.join(".yarnrc.yml"), yarnrc_body).await?;

				let readme_body = readme_body.replace("__NAME__", &prompt.project_name);
				fs::write(project_path.join("README.md"), readme_body).await?;

				config_body.to_string()
			}
			Language::Docker => {
				let readme_body =
					include_str!("../../../../../examples/misc/bare-template-docker/README.md");
				let readme_body = readme_body.replace("__NAME__", &prompt.project_name);
				fs::write(project_path.join("README.md"), readme_body).await?;

				let dockerfile_body =
					include_str!("../../../../../examples/misc/bare-template-docker/Dockerfile");
				fs::write(project_path.join("Dockerfile"), dockerfile_body).await?;

				let config_body =
					include_str!("../../../../../examples/misc/bare-template-docker/tivet.json");

				config_body.to_string()
			}
		};

		// Create JSON config
		let config_name = match prompt.config_format {
			ConfigFormat::Json => "tivet.json",
			ConfigFormat::Jsonc => "tivet.jsonc",
		};
		fs::write(project_path.join(config_name), config).await?;

		println!("Project created successfully.");

		println!();
		println!();
		println!("    ==========   Welcome to Tivet!   ==========");
		println!();
		println!("Resources:");
		println!();
		println!("  Documentation:      https://tivet.gg/docs");
		//println!("  Examples:         https://tivet.gg/docs/examples");
		println!("  Discord:            https://tivet.gg/discord");
		println!("  Issues:             https://github.com/tivet-gg/tivet/issues");
		println!("  Questions & Ideas:  https://github.com/tivet-gg/tivet/discussions");
		//println!("  Enterprise:       https://tivet.gg/sales");
		println!();
		println!("Next steps:");
		println!();
		println!("  $ cd {}", prompt.project_name);
		println!("  $ tivet deploy");
		println!();

		crate::util::telemetry::capture_event(
			"cli_init",
			Some(|event: &mut async_posthog::Event| {
				event.insert_prop(
					"$set",
					serde_json::json!({
						"cli_init_prompt": prompt,
					}),
				)?;
				Ok(())
			}),
		)
		.await;

		Ok(())
	}
}

#[derive(Serialize)]
struct PromptOutput {
	project_name: String,
	lang: Language,
	config_format: ConfigFormat,
}

#[derive(Serialize)]
enum Language {
	TypeScript,
	JavaScript,
	Docker,
}

impl fmt::Display for Language {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		let output = match self {
			Language::TypeScript => "TypeScript",
			Language::JavaScript => "JavaScript",
			Language::Docker => "Other (Docker)",
		};
		write!(f, "{}", output)
	}
}

#[derive(Serialize)]
enum ConfigFormat {
	Json,
	Jsonc,
}

impl fmt::Display for ConfigFormat {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		let output = match self {
			ConfigFormat::Json => "JSON (tivet.json)",
			ConfigFormat::Jsonc => "JSON with comments (tivet.jsonc)",
			// ConfigFormat::Json => "tivet.json (vanilla JSON)",
			// ConfigFormat::Jsonc => "tivet.jsonc (JSON with comments)",
		};
		write!(f, "{}", output)
	}
}
