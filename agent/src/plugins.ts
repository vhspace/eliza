
import {
    type Character,
    elizaLogger,
    parseBooleanFromText
} from "@elizaos/core";
import { zgPlugin } from "@elizaos/plugin-0g";
import { agentKitPlugin } from "@elizaos/plugin-agentkit";
import { bootstrapPlugin } from "@elizaos/plugin-bootstrap";
import { dcapPlugin } from "@elizaos/plugin-dcap";
import { footballPlugin } from "@elizaos/plugin-football";
import { gelatoPlugin } from "@elizaos/plugin-gelato";
import createGoatPlugin from "@elizaos/plugin-goat";
import { elizaCodeinPlugin } from "@elizaos/plugin-iq6900";
import { lightningPlugin } from "@elizaos/plugin-lightning";
import { OmniflixPlugin } from "@elizaos/plugin-omniflix";
import { PrimusAdapter } from "@elizaos/plugin-primus";
import createZilliqaPlugin from "@elizaos/plugin-zilliqa";
// import { intifacePlugin } from "@elizaos/plugin-intiface";
import { zxPlugin } from "@elizaos/plugin-0x";
import { ThreeDGenerationPlugin } from "@elizaos/plugin-3d-generation";
import { abstractPlugin } from "@elizaos/plugin-abstract";
import { akashPlugin } from "@elizaos/plugin-akash";
import { alloraPlugin } from "@elizaos/plugin-allora";
import { ankrPlugin } from "@elizaos/plugin-ankr";
import { aptosPlugin } from "@elizaos/plugin-aptos";
import { artheraPlugin } from "@elizaos/plugin-arthera";
import { autonomePlugin } from "@elizaos/plugin-autonome";
import { availPlugin } from "@elizaos/plugin-avail";
import { avalanchePlugin } from "@elizaos/plugin-avalanche";
import { b2Plugin } from "@elizaos/plugin-b2";
import { binancePlugin } from "@elizaos/plugin-binance";
import { birdeyePlugin } from "@elizaos/plugin-birdeye";
import { bittensorPlugin } from "@elizaos/plugin-bittensor";
import { bnbPlugin } from "@elizaos/plugin-bnb";
import { chainbasePlugin } from "@elizaos/plugin-chainbase";
import { advancedTradePlugin, coinbaseCommercePlugin, coinbaseMassPaymentsPlugin, tokenContractPlugin, tradePlugin, webhookPlugin } from "@elizaos/plugin-coinbase";
import { coingeckoPlugin } from "@elizaos/plugin-coingecko";
import { coinmarketcapPlugin } from "@elizaos/plugin-coinmarketcap";
import { confluxPlugin } from "@elizaos/plugin-conflux";
import { createCosmosPlugin } from "@elizaos/plugin-cosmos";
import { cronosZkEVMPlugin } from "@elizaos/plugin-cronoszkevm";
import { devinPlugin } from "@elizaos/plugin-devin";
import { dexScreenerPlugin } from "@elizaos/plugin-dexscreener";
import { dkgPlugin } from "@elizaos/plugin-dkg";
import { echoChambersPlugin } from "@elizaos/plugin-echochambers";
import { emailPlugin } from "@elizaos/plugin-email";
import { emailAutomationPlugin } from "@elizaos/plugin-email-automation";
import { ethstoragePlugin } from "@elizaos/plugin-ethstorage";
import { evmPlugin } from "@elizaos/plugin-evm";
import { flowPlugin } from "@elizaos/plugin-flow";
import { formPlugin } from "@elizaos/plugin-form";
import { fuelPlugin } from "@elizaos/plugin-fuel";
import { genLayerPlugin } from "@elizaos/plugin-genlayer";
import { giphyPlugin } from "@elizaos/plugin-giphy";
import { gitcoinPassportPlugin } from "@elizaos/plugin-gitcoin-passport";
import { holdstationPlugin } from "@elizaos/plugin-holdstation";
import { hyperbolicPlugin } from "@elizaos/plugin-hyperbolic";
import { hyperliquidPlugin } from "@elizaos/plugin-hyperliquid";
import { imageGenerationPlugin } from "@elizaos/plugin-image-generation";
import { imgflipPlugin } from "@elizaos/plugin-imgflip";
import { initiaPlugin } from "@elizaos/plugin-initia";
import { injectivePlugin } from "@elizaos/plugin-injective";
import { lensPlugin } from "@elizaos/plugin-lensNetwork";
import { letzAIPlugin } from "@elizaos/plugin-letzai";
import { litPlugin } from "@elizaos/plugin-lit";
import { minaPlugin } from "@elizaos/plugin-mina";
import { mindNetworkPlugin } from "@elizaos/plugin-mind-network";
import { moralisPlugin } from "@elizaos/plugin-moralis";
import { multiversxPlugin } from "@elizaos/plugin-multiversx";
import { nearPlugin } from "@elizaos/plugin-near";
import createNFTCollectionsPlugin from "@elizaos/plugin-nft-collections";
import { nftGenerationPlugin } from "@elizaos/plugin-nft-generation";
import { createNodePlugin } from "@elizaos/plugin-node";
import { nvidiaNimPlugin } from "@elizaos/plugin-nvidia-nim";
import { obsidianPlugin } from "@elizaos/plugin-obsidian";
import { OpacityAdapter } from "@elizaos/plugin-opacity";
import { openWeatherPlugin } from "@elizaos/plugin-open-weather";
import { openaiPlugin } from "@elizaos/plugin-openai";
import { pythDataPlugin } from "@elizaos/plugin-pyth-data";
import { quaiPlugin } from "@elizaos/plugin-quai";
import { quickIntelPlugin } from "@elizaos/plugin-quick-intel";
import nitroPlugin from "@elizaos/plugin-router-nitro";
import { seiPlugin } from "@elizaos/plugin-sei";
import { sgxPlugin } from "@elizaos/plugin-sgx";
import { solanaPlugin } from "@elizaos/plugin-solana";
import { solanaAgentkitPlugin } from "@elizaos/plugin-solana-agent-kit";
import { solanaPluginV2 } from "@elizaos/plugin-solana-v2";
import { squidRouterPlugin } from "@elizaos/plugin-squid-router";
import { stargazePlugin } from "@elizaos/plugin-stargaze";
import { storyPlugin } from "@elizaos/plugin-story";
import { suiPlugin } from "@elizaos/plugin-sui";
import { sunoPlugin } from "@elizaos/plugin-suno";
import { TEEMode, teePlugin } from "@elizaos/plugin-tee";
import { teeLogPlugin } from "@elizaos/plugin-tee-log";
import { teeMarlinPlugin } from "@elizaos/plugin-tee-marlin";
import { verifiableLogPlugin } from "@elizaos/plugin-tee-verifiable-log";
import { thirdwebPlugin } from "@elizaos/plugin-thirdweb";
import { tonPlugin } from "@elizaos/plugin-ton";
import { trikonPlugin } from "@elizaos/plugin-trikon";
import { udioPlugin } from "@elizaos/plugin-udio";
import { webSearchPlugin } from "@elizaos/plugin-web-search";
import { zerionPlugin } from "@elizaos/plugin-zerion";
import { zksyncEraPlugin } from "@elizaos/plugin-zksync-era";

// import { intifacePlugin } from "@elizaos/plugin-intiface";
import { getSecret } from "./utils";

let nodePlugin: any | undefined

export const importPlugins = async (character: Character, token: string) => {
    nodePlugin ??= createNodePlugin();
    elizaLogger.log(`Creating runtime for character ${character.name}`)

	const teeMode = getSecret(character, "TEE_MODE") || "OFF"
	const walletSecretSalt = getSecret(character, "WALLET_SECRET_SALT")

	// Validate TEE configuration
	if (teeMode !== TEEMode.OFF && !walletSecretSalt) {
		elizaLogger.error("A WALLET_SECRET_SALT required when TEE_MODE is enabled")
		throw new Error("Invalid TEE configuration")
	}

	let goatPlugin: any | undefined

	if (getSecret(character, "EVM_PRIVATE_KEY")) {
		goatPlugin = await createGoatPlugin((secret) => getSecret(character, secret))
	}

        let zilliqaPlugin: any | undefined;
        if (getSecret(character, "ZILLIQA_PRIVATE_KEY")) {
          zilliqaPlugin = await createZilliqaPlugin((secret) =>
             getSecret(character, secret)
          );
        }

	// Initialize Reclaim adapter if environment variables are present
	// let verifiableInferenceAdapter;
	// if (
	//     process.env.RECLAIM_APP_ID &&
	//     process.env.RECLAIM_APP_SECRET &&
	//     process.env.VERIFIABLE_INFERENCE_ENABLED === "true"
	// ) {
	//     verifiableInferenceAdapter = new ReclaimAdapter({
	//         appId: process.env.RECLAIM_APP_ID,
	//         appSecret: process.env.RECLAIM_APP_SECRET,
	//         modelProvider: character.modelProvider,
	//         token,
	//     });
	//     elizaLogger.log("Verifiable inference adapter initialized");
	// }
	// Initialize Opacity adapter if environment variables are present
	let verifiableInferenceAdapter
	if (process.env.OPACITY_TEAM_ID && process.env.OPACITY_CLOUDFLARE_NAME && process.env.OPACITY_PROVER_URL && process.env.VERIFIABLE_INFERENCE_ENABLED === "true") {
		verifiableInferenceAdapter = new OpacityAdapter({
			teamId: process.env.OPACITY_TEAM_ID,
			teamName: process.env.OPACITY_CLOUDFLARE_NAME,
			opacityProverUrl: process.env.OPACITY_PROVER_URL,
			modelProvider: character.modelProvider,
			token: token,
		})
		elizaLogger.log("Verifiable inference adapter initialized")
		elizaLogger.log("teamId", process.env.OPACITY_TEAM_ID)
		elizaLogger.log("teamName", process.env.OPACITY_CLOUDFLARE_NAME)
		elizaLogger.log("opacityProverUrl", process.env.OPACITY_PROVER_URL)
		elizaLogger.log("modelProvider", character.modelProvider)
		elizaLogger.log("token", token)
	}
	if (process.env.PRIMUS_APP_ID && process.env.PRIMUS_APP_SECRET && process.env.VERIFIABLE_INFERENCE_ENABLED === "true") {
		verifiableInferenceAdapter = new PrimusAdapter({
			appId: process.env.PRIMUS_APP_ID,
			appSecret: process.env.PRIMUS_APP_SECRET,
			attMode: "proxytls",
			modelProvider: character.modelProvider,
			token,
		})
		elizaLogger.log("Verifiable inference primus adapter initialized")
	}
    return {
        plugins: [
        parseBooleanFromText(getSecret(character, "BITMIND")) &&
        getSecret(character, "BITMIND_API_TOKEN")
            ? bittensorPlugin
            : null,
        parseBooleanFromText(getSecret(character, "EMAIL_AUTOMATION_ENABLED"))
            ? emailAutomationPlugin
            : null,
        getSecret(character, "IQ_WALLET_ADDRESS") &&
        getSecret(character, "IQSOlRPC")
            ? elizaCodeinPlugin
            : null,
        bootstrapPlugin,
        getSecret(character, "CDP_API_KEY_NAME") &&
        getSecret(character, "CDP_API_KEY_PRIVATE_KEY") &&
        getSecret(character, "CDP_AGENT_KIT_NETWORK")
            ? agentKitPlugin
            : null,
        getSecret(character, "DEXSCREENER_API_KEY") ? dexScreenerPlugin : null,
        getSecret(character, "FOOTBALL_API_KEY") ? footballPlugin : null,
        getSecret(character, "CONFLUX_CORE_PRIVATE_KEY") ? confluxPlugin : null,
        nodePlugin,
        getSecret(character, "ROUTER_NITRO_EVM_PRIVATE_KEY") &&
        getSecret(character, "ROUTER_NITRO_EVM_ADDRESS")
            ? nitroPlugin
            : null,
        getSecret(character, "TAVILY_API_KEY") ? webSearchPlugin : null,
        getSecret(character, "SOLANA_PUBLIC_KEY") ||
        (getSecret(character, "WALLET_PUBLIC_KEY") &&
            !getSecret(character, "WALLET_PUBLIC_KEY")?.startsWith("0x"))
            ? [solanaPlugin, solanaPluginV2]
            : null,
        getSecret(character, "SOLANA_PRIVATE_KEY")
            ? solanaAgentkitPlugin
            : null,
        getSecret(character, "AUTONOME_JWT_TOKEN") ? autonomePlugin : null,
        (getSecret(character, "NEAR_ADDRESS") ||
            getSecret(character, "NEAR_WALLET_PUBLIC_KEY")) &&
        getSecret(character, "NEAR_WALLET_SECRET_KEY")
            ? nearPlugin
            : null,
        getSecret(character, "EVM_PUBLIC_KEY") ||
        (getSecret(character, "WALLET_PUBLIC_KEY") &&
            getSecret(character, "WALLET_PUBLIC_KEY")?.startsWith("0x"))
            ? evmPlugin
            : null,
        (getSecret(character, "EVM_PUBLIC_KEY") ||
            getSecret(character, "INJECTIVE_PUBLIC_KEY")) &&
        getSecret(character, "INJECTIVE_PRIVATE_KEY")
            ? injectivePlugin
            : null,
        getSecret(character, "COSMOS_RECOVERY_PHRASE") &&
            getSecret(character, "COSMOS_AVAILABLE_CHAINS") &&
            createCosmosPlugin(),
        (getSecret(character, "SOLANA_PUBLIC_KEY") ||
            (getSecret(character, "WALLET_PUBLIC_KEY") &&
                !getSecret(character, "WALLET_PUBLIC_KEY")?.startsWith(
                    "0x",
                ))) &&
        getSecret(character, "SOLANA_ADMIN_PUBLIC_KEY") &&
        getSecret(character, "SOLANA_PRIVATE_KEY") &&
        getSecret(character, "SOLANA_ADMIN_PRIVATE_KEY")
            ? nftGenerationPlugin
            : null,
        getSecret(character, "ZEROG_PRIVATE_KEY") ? zgPlugin : null,
        getSecret(character, "COINMARKETCAP_API_KEY")
            ? coinmarketcapPlugin
            : null,
        getSecret(character, "ZERION_API_KEY") ? zerionPlugin : null,
        getSecret(character, "COINBASE_COMMERCE_KEY")
            ? coinbaseCommercePlugin
            : null,
        getSecret(character, "FAL_API_KEY") ||
        getSecret(character, "OPENAI_API_KEY") ||
        getSecret(character, "VENICE_API_KEY") ||
        getSecret(character, "NVIDIA_API_KEY") ||
        getSecret(character, "NINETEEN_AI_API_KEY") ||
        getSecret(character, "HEURIST_API_KEY") ||
        getSecret(character, "LIVEPEER_GATEWAY_URL")
            ? imageGenerationPlugin
            : null,
        getSecret(character, "FAL_API_KEY") ? ThreeDGenerationPlugin : null,
        ...(getSecret(character, "COINBASE_API_KEY") &&
        getSecret(character, "COINBASE_PRIVATE_KEY")
            ? [
                  coinbaseMassPaymentsPlugin,
                  tradePlugin,
                  tokenContractPlugin,
                  advancedTradePlugin,
              ]
            : []),
        ...(teeMode !== TEEMode.OFF && walletSecretSalt ? [teePlugin] : []),
        teeMode !== TEEMode.OFF &&
        walletSecretSalt &&
        getSecret(character, "VLOG")
            ? verifiableLogPlugin
            : null,
        getSecret(character, "SGX") ? sgxPlugin : null,
        getSecret(character, "ENABLE_TEE_LOG") &&
        ((teeMode !== TEEMode.OFF && walletSecretSalt) ||
            getSecret(character, "SGX"))
            ? teeLogPlugin
            : null,
        getSecret(character, "OMNIFLIX_API_URL") &&
        getSecret(character, "OMNIFLIX_MNEMONIC")
            ? OmniflixPlugin
            : null,
        getSecret(character, "COINBASE_API_KEY") &&
        getSecret(character, "COINBASE_PRIVATE_KEY") &&
        getSecret(character, "COINBASE_NOTIFICATION_URI")
            ? webhookPlugin
            : null,
        goatPlugin,
        zilliqaPlugin,
        getSecret(character, "COINGECKO_API_KEY") ||
        getSecret(character, "COINGECKO_PRO_API_KEY")
            ? coingeckoPlugin
            : null,
        getSecret(character, "MORALIS_API_KEY") ? moralisPlugin : null,
        getSecret(character, "EVM_PROVIDER_URL") ? goatPlugin : null,
        getSecret(character, "ABSTRACT_PRIVATE_KEY") ? abstractPlugin : null,
        getSecret(character, "B2_PRIVATE_KEY") ? b2Plugin : null,
        getSecret(character, "BINANCE_API_KEY") &&
        getSecret(character, "BINANCE_SECRET_KEY")
            ? binancePlugin
            : null,
        getSecret(character, "FLOW_ADDRESS") &&
        getSecret(character, "FLOW_PRIVATE_KEY")
            ? flowPlugin
            : null,
        getSecret(character, "LENS_ADDRESS") &&
        getSecret(character, "LENS_PRIVATE_KEY")
            ? lensPlugin
            : null,
        getSecret(character, "APTOS_PRIVATE_KEY") ? aptosPlugin : null,
        getSecret(character, "MIND_COLD_WALLET_ADDRESS")
            ? mindNetworkPlugin
            : null,
        getSecret(character, "MVX_PRIVATE_KEY") ? multiversxPlugin : null,
        getSecret(character, "ZKSYNC_PRIVATE_KEY") ? zksyncEraPlugin : null,
        getSecret(character, "CRONOSZKEVM_PRIVATE_KEY")
            ? cronosZkEVMPlugin
            : null,
        getSecret(character, "TEE_MARLIN") ? teeMarlinPlugin : null,
        getSecret(character, "TON_PRIVATE_KEY") ? tonPlugin : null,
        getSecret(character, "THIRDWEB_SECRET_KEY") ? thirdwebPlugin : null,
        getSecret(character, "SUI_PRIVATE_KEY") ? suiPlugin : null,
        getSecret(character, "STORY_PRIVATE_KEY") ? storyPlugin : null,
        getSecret(character, "SQUID_SDK_URL") &&
        getSecret(character, "SQUID_INTEGRATOR_ID") &&
        getSecret(character, "SQUID_EVM_ADDRESS") &&
        getSecret(character, "SQUID_EVM_PRIVATE_KEY") &&
        getSecret(character, "SQUID_API_THROTTLE_INTERVAL")
            ? squidRouterPlugin
            : null,
        getSecret(character, "FUEL_PRIVATE_KEY") ? fuelPlugin : null,
        getSecret(character, "AVALANCHE_PRIVATE_KEY") ? avalanchePlugin : null,
        getSecret(character, "BIRDEYE_API_KEY") ? birdeyePlugin : null,
        getSecret(character, "ECHOCHAMBERS_API_URL") &&
        getSecret(character, "ECHOCHAMBERS_API_KEY")
            ? echoChambersPlugin
            : null,
        getSecret(character, "LETZAI_API_KEY") ? letzAIPlugin : null,
        getSecret(character, "STARGAZE_ENDPOINT") ? stargazePlugin : null,
        getSecret(character, "GIPHY_API_KEY") ? giphyPlugin : null,
        getSecret(character, "PASSPORT_API_KEY") ? gitcoinPassportPlugin : null,
        getSecret(character, "GENLAYER_PRIVATE_KEY") ? genLayerPlugin : null,
        getSecret(character, "AVAIL_SEED") &&
        getSecret(character, "AVAIL_APP_ID")
            ? availPlugin
            : null,
        getSecret(character, "OPEN_WEATHER_API_KEY") ? openWeatherPlugin : null,
        getSecret(character, "OBSIDIAN_API_TOKEN") ? obsidianPlugin : null,
        getSecret(character, "ARTHERA_PRIVATE_KEY")?.startsWith("0x")
            ? artheraPlugin
            : null,
        getSecret(character, "ALLORA_API_KEY") ? alloraPlugin : null,
        getSecret(character, "HYPERLIQUID_PRIVATE_KEY")
            ? hyperliquidPlugin
            : null,
        getSecret(character, "HYPERLIQUID_TESTNET") ? hyperliquidPlugin : null,
        getSecret(character, "AKASH_MNEMONIC") &&
        getSecret(character, "AKASH_WALLET_ADDRESS")
            ? akashPlugin
            : null,
        getSecret(character, "CHAINBASE_API_KEY") ? chainbasePlugin : null,
        getSecret(character, "QUAI_PRIVATE_KEY") ? quaiPlugin : null,
        getSecret(character, "RESERVOIR_API_KEY")
            ? createNFTCollectionsPlugin()
            : null,
        getSecret(character, "ZERO_EX_API_KEY") ? zxPlugin : null,
        getSecret(character, "DKG_PRIVATE_KEY") ? dkgPlugin : null,
        getSecret(character, "PYTH_TESTNET_PROGRAM_KEY") ||
        getSecret(character, "PYTH_MAINNET_PROGRAM_KEY")
            ? pythDataPlugin
            : null,
        getSecret(character, "LND_TLS_CERT") &&
        getSecret(character, "LND_MACAROON") &&
        getSecret(character, "LND_SOCKET")
            ? lightningPlugin
            : null,
        getSecret(character, "OPENAI_API_KEY") &&
        parseBooleanFromText(
            getSecret(character, "ENABLE_OPEN_AI_COMMUNITY_PLUGIN"),
        )
            ? openaiPlugin
            : null,
        getSecret(character, "DEVIN_API_TOKEN") ? devinPlugin : null,
        getSecret(character, "INITIA_PRIVATE_KEY") ? initiaPlugin : null,
        getSecret(character, "HOLDSTATION_PRIVATE_KEY")
            ? holdstationPlugin
            : null,
        getSecret(character, "NVIDIA_NIM_API_KEY") ||
        getSecret(character, "NVIDIA_NGC_API_KEY")
            ? nvidiaNimPlugin
            : null,
        getSecret(character, "BNB_PRIVATE_KEY") ||
        getSecret(character, "BNB_PUBLIC_KEY")?.startsWith("0x")
            ? bnbPlugin
            : null,
        (getSecret(character, "EMAIL_INCOMING_USER") &&
            getSecret(character, "EMAIL_INCOMING_PASS")) ||
        (getSecret(character, "EMAIL_OUTGOING_USER") &&
            getSecret(character, "EMAIL_OUTGOING_PASS"))
            ? emailPlugin
            : null,
        getSecret(character, "SEI_PRIVATE_KEY") ? seiPlugin : null,
        getSecret(character, "HYPERBOLIC_API_KEY") ? hyperbolicPlugin : null,
        getSecret(character, "SUNO_API_KEY") ? sunoPlugin : null,
        getSecret(character, "UDIO_AUTH_TOKEN") ? udioPlugin : null,
        getSecret(character, "IMGFLIP_USERNAME") &&
        getSecret(character, "IMGFLIP_PASSWORD")
            ? imgflipPlugin
            : null,
        getSecret(character, "FUNDING_PRIVATE_KEY") &&
        getSecret(character, "EVM_RPC_URL")
            ? litPlugin
            : null,
        getSecret(character, "ETHSTORAGE_PRIVATE_KEY")
            ? ethstoragePlugin
            : null,
        getSecret(character, "MINA_PRIVATE_KEY") ? minaPlugin : null,
        getSecret(character, "FORM_PRIVATE_KEY") ? formPlugin : null,
        getSecret(character, "ANKR_WALLET") ? ankrPlugin : null,
        getSecret(character, "DCAP_EVM_PRIVATE_KEY") &&
        getSecret(character, "DCAP_MODE")
            ? dcapPlugin
            : null,
        getSecret(character, "QUICKINTEL_API_KEY") ? quickIntelPlugin : null,
        getSecret(character, "GELATO_RELAY_API_KEY") ? gelatoPlugin : null,
        getSecret(character, "TRIKON_WALLET_ADDRESS") ? trikonPlugin : null,
    ].flat().filter(Boolean),
    verifiableInferenceAdapter
}
};

export async function handlePluginImporting(plugins: string[]) {
	if (plugins.length > 0) {
		elizaLogger.info("Plugins are: ", plugins)
		const importedPlugins = await Promise.all(
			plugins.map(async (plugin) => {
				try {
					const importedPlugin = await import(plugin)
					const functionName = plugin.replace("@elizaos/plugin-", "").replace(/-./g, (x) => x[1].toUpperCase()) + "Plugin" // Assumes plugin function is camelCased with Plugin suffix
					return importedPlugin.default || importedPlugin[functionName]
				} catch (importError) {
					elizaLogger.error(`Failed to import plugin: ${plugin}`, importError)
					return [] // Return null for failed imports
				}
			})
		)
		return importedPlugins
	} else {
		return []
	}
}