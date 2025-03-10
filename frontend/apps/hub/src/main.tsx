import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import "./index.css";
import { initThirdPartyProviders } from "./components/third-party-providers";
import { tivetClient } from "./queries/global";

initThirdPartyProviders();

tivetClient.cloud
	.bootstrap()
	.then((response) => {
		run({ cacheKey: [response.deployHash, __APP_BUILD_ID__].join("-") });
	})
	.catch(() => {
		run();
	});

function run({ cacheKey }: { cacheKey?: string } = {}) {
	// biome-ignore lint/style/noNonNullAssertion: it should always be present
	const rootElement = document.getElementById("root")!;
	if (!rootElement.innerHTML) {
		const root = ReactDOM.createRoot(rootElement);
		root.render(
			<StrictMode>
				<App cacheKey={cacheKey} />
			</StrictMode>,
		);
	}
}
