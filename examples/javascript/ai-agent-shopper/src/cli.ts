import { intro, isCancel, outro, password, text } from "@clack/prompts";
import { TestClient } from "@tivet-gg/actor-client/test";
import type { CoreMessage } from "ai";
import colors from "picocolors";
import type ShopperAgent from "./shopper_agent";
import type { ShoppingCartItem } from "./shopper_agent";

function displayCart(cart: ShoppingCartItem[]) {
	console.log(`\n${colors.yellow("Current Shopping Cart:")}`);
	if (cart.length === 0) {
		console.log(colors.dim("(empty)"));
	} else {
		for (const item of cart) {
			console.log(colors.green(`- ${item.slug}: ${item.count} units`));
		}
	}
	console.log();
}

function displayCartSummary(cart: ShoppingCartItem[]) {
	const totalItems = cart.reduce((sum, item) => sum + item.count, 0);
	const itemNames = cart.map((item) => item.slug).join(", ");
	console.log(
		colors.magenta(`\n🛒 You have ${totalItems} items in your cart: ${itemNames}\n`)
	);
}

function exportCartToJson(cart: ShoppingCartItem[]) {
	const fs = require("fs");
	const filePath = "./shopping_cart.json";
	fs.writeFileSync(filePath, JSON.stringify(cart, null, 2));
	console.log(colors.cyan(`Cart exported to ${filePath}\n`));
}

function displayMessages(messages: CoreMessage[]) {
	console.log(`\n${colors.yellow("Message History:")}`);
	if (messages.length === 0) {
		console.log(colors.dim("(no messages)"));
	} else {
		for (const msg of messages) {
			console.log(colors.dim(`\n[${msg.role}]:`));
			console.log(colors.white(msg.content as string));
		}
	}
	console.log();
}

function displayHelp() {
	console.log(colors.yellow("\nAvailable commands:"));
	console.log("/cart - View cart contents");
	console.log("/messages - View chat history");
	console.log("/search [keywords] - Search for products");
	console.log("/summary - Get a cart summary");
	console.log("/add [slug] [count] - Add item to cart");
	console.log("/remove [slug] - Remove item from cart");
	console.log("/details [slug] - View item details");
	console.log("/export - Export cart to JSON");
	console.log("/help - Show this help menu");
	console.log("/reset - Clear cart and history");
	console.log("/exit - Exit the assistant\n");
}

async function main() {
	const client = new TestClient();

	let openaiKey = process.env.OPENAI_KEY;
	if (!openaiKey) {
		openaiKey = (await password({
			message:
				"Please enter your OpenAI API key: (this is only stored in-memory)",
			mask: "•",
		})) as string;

		if (isCancel(openaiKey)) {
			outro(colors.red("Operation cancelled"));
			process.exit(0);
		}
	}
	if (!openaiKey) throw new Error("OpenAI API key is required");

	const shopperAgent = await client.get<ShopperAgent>(
		{
			name: "shopper_agent",
		},
		{
			parameters: {
				openaiKey,
			},
		},
	);

	shopperAgent.on("textPart", (text: string) => {
		process.stdout.write(colors.cyan(text));
	});

	shopperAgent.on("textFinish", () => {
		process.stdout.write("\n\n");
	});

	intro(colors.blue("Welcome to the Hardware Store Assistant!"));

	displayMessages(await shopperAgent.getMessages());
	displayCart(await shopperAgent.getShoppingCart());
	displayHelp();

	while (true) {
		const question = await text({
			message:
				"How can I help you? (type '/help' to view commands)",
			placeholder: "e.g. What’s a good cordless drill?",
		});

		if (isCancel(question) || question === "/exit") break;

		if (question.startsWith("/")) {
			if (question === "/cart") {
				displayCart(await shopperAgent.getShoppingCart());
				continue;
			}
			if (question === "/messages") {
				displayMessages(await shopperAgent.getMessages());
				continue;
			}
			if (question === "/reset") {
				await shopperAgent.resetState();
				console.log(colors.yellow("\nChat history and shopping cart have been reset.\n"));
				continue;
			}
			if (question === "/help") {
				displayHelp();
				continue;
			}
			if (question.startsWith("/search")) {
				const searchQuery = question.slice(7).trim();
				if (!searchQuery) {
					console.log(colors.dim("\nProvide terms after /search, e.g. '/search hammer'\n"));
					continue;
				}
				const searchTerms = searchQuery
					.split(/[^a-zA-Z]+/)
					.map((term) => term.trim().toLowerCase())
					.filter((term) => term.length > 0);
				const results = await shopperAgent.searchCatalog(searchTerms);
				console.log(`\n${colors.yellow("Search Results:")}`);
				if (results.length === 0) console.log(colors.dim("(no results)"));
				else {
					for (const item of results) {
						console.log(colors.green(`- ${item.slug}: ${item.name}`));
						console.log(colors.blue(`  Price: $${item.price}`));
					}
				}
				console.log();
				continue;
			}
			if (question === "/summary") {
				displayCartSummary(await shopperAgent.getShoppingCart());
				continue;
			}
			if (question === "/export") {
				exportCartToJson(await shopperAgent.getShoppingCart());
				continue;
			}
			if (question.startsWith("/add ")) {
				const parts = question.slice(5).trim().split(" ");
				const slug = parts[0];
				const count = parseInt(parts[1]) || 1;
				await shopperAgent.addToCart({ slug, count });
				console.log(colors.green(`\n✅ Added ${count}x ${slug} to cart.\n`));
				continue;
			}
			if (question.startsWith("/remove ")) {
				const slug = question.slice(8).trim();
				await shopperAgent.removeFromCart(slug);
				console.log(colors.red(`\n❌ Removed ${slug} from cart.\n`));
				continue;
			}
			if (question.startsWith("/details ")) {
				const slug = question.slice(9).trim();
				const item = await shopperAgent.getCatalogItem(slug);
				if (!item) {
					console.log(colors.red(`\nItem '${slug}' not found.\n`));
					continue;
				}
				console.log(colors.green(`\n📦 ${item.name} (${slug})`));
				console.log(colors.blue(`Price: $${item.price}`));
				console.log(colors.dim(`Description: ${item.description || "No description."}\n`));
				continue;
			}
			throw new Error(`Invalid command: ${question}`);
		}

		if (question) {
			try {
				await shopperAgent.processPrompt(question);
			} catch (error) {
				console.error(colors.red("Error:"), `${error}`);
			}
		}
	}

	await shopperAgent.disconnect();
	outro(colors.blue("Thanks for shopping with us!"));
}

await main();