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
import { getTokenForProvider, logFetch } from "./utils"
const __filename = fileURLToPath(import.meta.url) // get the resolved path to the file
const __dirname = path.dirname(__filename) // get the name of the directory

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
		fetch: logFetch, // TODO: Probably don't need this, adds unnecessary complexity
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
