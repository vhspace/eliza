import { DirectClient } from "@elizaos/client-direct"
import {
	AgentRuntime,
	CacheStore,
	type Character,
	elizaLogger,
	type ICacheManager,
	type IDatabaseAdapter,
	type IDatabaseCacheAdapter,
	ModelProviderName,
	parseBooleanFromText,
	settings,
	stringToUuid
} from "@elizaos/core"
import fs from "fs"
import net from "net"
import path from "path"
import { fileURLToPath } from "url"
import { initializeCache } from "./cache"
import { jsonToCharacter, loadAllCharacters, loadCharacterTryPath } from "./characters"
import { initializeClients } from "./clients"
import { initializeDatabase } from "./database"
import { handlePluginImporting, importPlugins } from "./plugins"
const __filename = fileURLToPath(import.meta.url) // get the resolved path to the file
const __dirname = path.dirname(__filename) // get the name of the directory

export const wait = (minTime = 1000, maxTime = 3000) => {
	const waitTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime
	return new Promise((resolve) => setTimeout(resolve, waitTime))
}

const logFetch = async (url: string, options: any) => {
	elizaLogger.debug(`Fetching ${url}`)
	// Disabled to avoid disclosure of sensitive information such as API keys
	// elizaLogger.debug(JSON.stringify(options, null, 2));
	return fetch(url, options)
}

export function getTokenForProvider(provider: ModelProviderName, character: Character): string | undefined {
	switch (provider) {
		// no key needed for llama_local or gaianet
		case ModelProviderName.LLAMALOCAL:
			return ""
		case ModelProviderName.OLLAMA:
			return ""
		case ModelProviderName.GAIANET:
			return "";
		case ModelProviderName.BEDROCK:
			return ""
		case ModelProviderName.OPENAI:
			return character.settings?.secrets?.OPENAI_API_KEY || settings.OPENAI_API_KEY
		case ModelProviderName.ETERNALAI:
			return character.settings?.secrets?.ETERNALAI_API_KEY || settings.ETERNALAI_API_KEY
		case ModelProviderName.NINETEEN_AI:
			return character.settings?.secrets?.NINETEEN_AI_API_KEY || settings.NINETEEN_AI_API_KEY
		case ModelProviderName.LLAMACLOUD:
		case ModelProviderName.TOGETHER:
			return character.settings?.secrets?.LLAMACLOUD_API_KEY || settings.LLAMACLOUD_API_KEY || character.settings?.secrets?.TOGETHER_API_KEY || settings.TOGETHER_API_KEY || character.settings?.secrets?.OPENAI_API_KEY || settings.OPENAI_API_KEY
		case ModelProviderName.CLAUDE_VERTEX:
		case ModelProviderName.ANTHROPIC:
			return character.settings?.secrets?.ANTHROPIC_API_KEY || character.settings?.secrets?.CLAUDE_API_KEY || settings.ANTHROPIC_API_KEY || settings.CLAUDE_API_KEY
		case ModelProviderName.REDPILL:
			return character.settings?.secrets?.REDPILL_API_KEY || settings.REDPILL_API_KEY
		case ModelProviderName.OPENROUTER:
			return character.settings?.secrets?.OPENROUTER_API_KEY || settings.OPENROUTER_API_KEY
		case ModelProviderName.GROK:
			return character.settings?.secrets?.GROK_API_KEY || settings.GROK_API_KEY
		case ModelProviderName.HEURIST:
			return character.settings?.secrets?.HEURIST_API_KEY || settings.HEURIST_API_KEY
		case ModelProviderName.GROQ:
			return character.settings?.secrets?.GROQ_API_KEY || settings.GROQ_API_KEY
		case ModelProviderName.GALADRIEL:
			return character.settings?.secrets?.GALADRIEL_API_KEY || settings.GALADRIEL_API_KEY
		case ModelProviderName.FAL:
			return character.settings?.secrets?.FAL_API_KEY || settings.FAL_API_KEY
		case ModelProviderName.ALI_BAILIAN:
			return character.settings?.secrets?.ALI_BAILIAN_API_KEY || settings.ALI_BAILIAN_API_KEY
		case ModelProviderName.VOLENGINE:
			return character.settings?.secrets?.VOLENGINE_API_KEY || settings.VOLENGINE_API_KEY
		case ModelProviderName.NANOGPT:
			return character.settings?.secrets?.NANOGPT_API_KEY || settings.NANOGPT_API_KEY
		case ModelProviderName.HYPERBOLIC:
			return character.settings?.secrets?.HYPERBOLIC_API_KEY || settings.HYPERBOLIC_API_KEY

		case ModelProviderName.VENICE:
			return character.settings?.secrets?.VENICE_API_KEY || settings.VENICE_API_KEY
		case ModelProviderName.ATOMA:
			return character.settings?.secrets?.ATOMASDK_BEARER_AUTH || settings.ATOMASDK_BEARER_AUTH
		case ModelProviderName.NVIDIA:
			return character.settings?.secrets?.NVIDIA_API_KEY || settings.NVIDIA_API_KEY
		case ModelProviderName.AKASH_CHAT_API:
			return character.settings?.secrets?.AKASH_CHAT_API_KEY || settings.AKASH_CHAT_API_KEY
		case ModelProviderName.GOOGLE:
			return character.settings?.secrets?.GOOGLE_GENERATIVE_AI_API_KEY || settings.GOOGLE_GENERATIVE_AI_API_KEY
		case ModelProviderName.MISTRAL:
			return character.settings?.secrets?.MISTRAL_API_KEY || settings.MISTRAL_API_KEY
		case ModelProviderName.LETZAI:
			return character.settings?.secrets?.LETZAI_API_KEY || settings.LETZAI_API_KEY
		case ModelProviderName.INFERA:
			return character.settings?.secrets?.INFERA_API_KEY || settings.INFERA_API_KEY
		case ModelProviderName.DEEPSEEK:
			return character.settings?.secrets?.DEEPSEEK_API_KEY || settings.DEEPSEEK_API_KEY
		case ModelProviderName.LIVEPEER:
			return character.settings?.secrets?.LIVEPEER_GATEWAY_URL || settings.LIVEPEER_GATEWAY_URL
		default:
			const errorMessage = `Failed to get token - unsupported model provider: ${provider}`
			elizaLogger.error(errorMessage)
			throw new Error(errorMessage)
	}
}

export async function createAgent(character: Character, db: IDatabaseAdapter, cache: ICacheManager, token: string): Promise<AgentRuntime> {
	const { plugins, verifiableInferenceAdapter } = await importPlugins(character, token);
	return new AgentRuntime({
		databaseAdapter: db,
		token,
		modelProvider: character.modelProvider,
		evaluators: [],
		character,
		// character.plugins are handled when clients are added
		plugins,
		providers: [],
		managers: [],
		cacheManager: cache,
		fetch: logFetch,
		verifiableInferenceAdapter,
	})
}

async function startAgent(character: Character, directClient: DirectClient): Promise<AgentRuntime> {
	let db: IDatabaseAdapter & IDatabaseCacheAdapter
	try {
		character.id ??= stringToUuid(character.name)
		character.username ??= character.name

		const token = getTokenForProvider(character.modelProvider, character)
		const dataDir = path.join(__dirname, "../data")

		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true })
		}

		db = initializeDatabase(dataDir) as IDatabaseAdapter & IDatabaseCacheAdapter

		await db.init()

		const cache = initializeCache(process.env.CACHE_STORE ?? CacheStore.DATABASE, character, "", db) // "" should be replaced with dir for file system caching. THOUGHTS: might probably make this into an env
		const runtime: AgentRuntime = await createAgent(character, db, cache, token)

		// start services/plugins/process knowledge
		await runtime.initialize()

		// start assigned clients
		runtime.clients = await initializeClients(character, runtime)

		// add to container
		directClient.registerAgent(runtime)

		// report to console
		elizaLogger.debug(`Started ${character.name} as ${runtime.agentId}`)

		return runtime
	} catch (error) {
		elizaLogger.error(`Error starting agent for character ${character.name}:`, error)
		elizaLogger.error(error)
		if (db) {
			await db.close()
		}
		throw error
	}
}

const checkPortAvailable = (port: number): Promise<boolean> => {
	return new Promise((resolve) => {
		const server = net.createServer()

		server.once("error", (err: NodeJS.ErrnoException) => {
			if (err.code === "EADDRINUSE") {
				resolve(false)
			}
		})

		server.once("listening", () => {
			server.close()
			resolve(true)
		})

		server.listen(port)
	})
}

const startAgents = async () => {
	const directClient = new DirectClient()
	let serverPort = Number.parseInt(settings.SERVER_PORT || "3000")
	const characters = await loadAllCharacters()

	try {
		for (const character of characters) {
			await startAgent(character, directClient)
		}
	} catch (error) {
		elizaLogger.error("Error starting agents:", error)
	}

	// Find available port
	while (!(await checkPortAvailable(serverPort))) {
		elizaLogger.warn(`Port ${serverPort} is in use, trying ${serverPort + 1}`)
		serverPort++
	}

	// upload some agent functionality into directClient
	directClient.startAgent = async (character) => {
		// Handle plugins
		character.plugins = await handlePluginImporting(character.plugins)

		// wrap it so we don't have to inject directClient later
		return startAgent(character, directClient)
	}

	directClient.loadCharacterTryPath = loadCharacterTryPath
	directClient.jsonToCharacter = jsonToCharacter

	directClient.start(serverPort)

	if (serverPort !== Number.parseInt(settings.SERVER_PORT || "3000")) {
		elizaLogger.log(`Server started on alternate port ${serverPort}`)
	}

	elizaLogger.log("Run `pnpm start:client` to start the client and visit the outputted URL (http://localhost:5173) to chat with your agents. When running multiple agents, use client with different port `SERVER_PORT=3001 pnpm start:client`")
}

startAgents().catch((error) => {
	elizaLogger.error("Unhandled error in startAgents:", error)
	process.exit(1)
})

// Prevent unhandled exceptions from crashing the process if desired
if (
	process.env.PREVENT_UNHANDLED_EXIT &&
	parseBooleanFromText(process.env.PREVENT_UNHANDLED_EXIT)
) {
	// Handle uncaught exceptions to prevent the process from crashing
	process.on("uncaughtException", function (err) {
		console.error("uncaughtException", err);
	});

	// Handle unhandled rejections to prevent the process from crashing
	process.on("unhandledRejection", function (err) {
		console.error("unhandledRejection", err);
	});
}
