import { PostgresDatabaseAdapter } from "@ai16z/adapter-postgres";
import { SqliteDatabaseAdapter } from "@ai16z/adapter-sqlite";
import { DiscordClientInterface } from "@ai16z/client-discord";
import { TwitterClientInterface } from "@ai16z/client-twitter";
import { createNodePlugin } from "@ai16z/plugin-node";
import { evmPlugin } from "@ai16z/plugin-evm";
import { bootstrapPlugin } from "@ai16z/plugin-bootstrap";
import { imageGenerationPlugin } from "@ai16z/plugin-image-generation";
import {
    AgentRuntime,
    CacheManager,
    Character,
    DbCacheAdapter,
    FsCacheAdapter,
    IAgentRuntime,
    ICacheManager,
    IDatabaseAdapter,
    IDatabaseCacheAdapter,
    ModelProviderName,
    defaultCharacter,
    elizaLogger,
    settings,
    stringToUuid,
    validateCharacterConfig,
} from "@ai16z/eliza";
import createGoatPlugin from "@ai16z/plugin-goat";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import yargs from "yargs";
import { DirectClient } from "@ai16z/client-direct";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export const wait = (minTime: number = 1000, maxTime: number = 3000) => {
    const waitTime =
        Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    return new Promise((resolve) => setTimeout(resolve, waitTime));
};

const logFetch = async (url: string, options: any) => {
    elizaLogger.info(`Fetching ${url}`);
    elizaLogger.info(options);
    return fetch(url, options);
};

export function parseArguments(): {
    character?: string;
    characters?: string;
} {
    try {
        return yargs(process.argv.slice(3))
            .option("character", {
                type: "string",
                description: "Path to the character JSON file",
            })
            .option("characters", {
                type: "string",
                description:
                    "Comma separated list of paths to character JSON files",
            })
            .parseSync();
    } catch (error) {
        elizaLogger.error("Error parsing arguments:", error);
        return {};
    }
}

function tryLoadFile(filePath: string): string | null {
    try {
        return fs.readFileSync(filePath, "utf8");
    } catch (e) {
        return null;
    }
}

function isAllStrings(arr: unknown[]): boolean {
    return Array.isArray(arr) && arr.every((item) => typeof item === "string");
}

export async function loadCharacters(
    charactersArg: string
): Promise<Character[]> {
    let characterPaths = charactersArg
        ?.split(",")
        .map((filePath) => filePath.trim());
    const loadedCharacters = [];

    if (characterPaths?.length > 0) {
        for (const characterPath of characterPaths) {
            let content = null;
            let resolvedPath = "";

            // Try different path resolutions in order
            const pathsToTry = [
                characterPath, // exact path as specified
                path.resolve(process.cwd(), characterPath), // relative to cwd
                path.resolve(process.cwd(), "agent", characterPath), // Add this
                path.resolve(__dirname, characterPath), // relative to current script
                path.resolve(
                    __dirname,
                    "characters",
                    path.basename(characterPath)
                ), // relative to agent/characters
                path.resolve(
                    __dirname,
                    "../characters",
                    path.basename(characterPath)
                ), // relative to characters dir from agent
                path.resolve(
                    __dirname,
                    "../../characters",
                    path.basename(characterPath)
                ), // relative to project root characters dir
            ];

            elizaLogger.info(
                "Trying paths:",
                pathsToTry.map((p) => ({
                    path: p,
                    exists: fs.existsSync(p),
                }))
            );

            for (const tryPath of pathsToTry) {
                content = tryLoadFile(tryPath);
                if (content !== null) {
                    resolvedPath = tryPath;
                    break;
                }
            }

            if (content === null) {
                elizaLogger.error(
                    `Error loading character from ${characterPath}: File not found in any of the expected locations`
                );
                elizaLogger.error("Tried the following paths:");
                pathsToTry.forEach((p) => elizaLogger.error(` - ${p}`));
                process.exit(1);
            }

            try {
                const character = JSON.parse(content);
                validateCharacterConfig(character);

                // Handle plugins
                if (isAllStrings(character.plugins)) {
                    elizaLogger.info("Plugins are: ", character.plugins);
                    const importedPlugins = await Promise.all(
                        character.plugins.map(async (plugin) => {
                            const importedPlugin = await import(plugin);
                            return importedPlugin.default;
                        })
                    );
                    character.plugins = importedPlugins;
                }

                loadedCharacters.push(character);
                elizaLogger.info(
                    `Successfully loaded character from: ${resolvedPath}`
                );
            } catch (e) {
                elizaLogger.error(
                    `Error parsing character from ${resolvedPath}: ${e}`
                );
                process.exit(1);
            }
        }
    }

    if (loadedCharacters.length === 0) {
        elizaLogger.info("No characters found, using default character");
        loadedCharacters.push(defaultCharacter);
    }

    return loadedCharacters;
}

// v2 TODO: should be a registered pattern to get the registered token from the plugin being used
export function getTokenForProvider(
    provider: ModelProviderName,
    character: Character
) {
    switch (provider) {
        case ModelProviderName.OPENAI:
            return (
                character.settings?.secrets?.OPENAI_API_KEY ||
                settings.OPENAI_API_KEY
            );
        case ModelProviderName.ETERNALAI:
            return (
                character.settings?.secrets?.ETERNALAI_API_KEY ||
                settings.ETERNALAI_API_KEY
            );
        case ModelProviderName.LLAMACLOUD:
        case ModelProviderName.TOGETHER:
            return (
                character.settings?.secrets?.LLAMACLOUD_API_KEY ||
                settings.LLAMACLOUD_API_KEY ||
                character.settings?.secrets?.TOGETHER_API_KEY ||
                settings.TOGETHER_API_KEY ||
                character.settings?.secrets?.XAI_API_KEY ||
                settings.XAI_API_KEY ||
                character.settings?.secrets?.OPENAI_API_KEY ||
                settings.OPENAI_API_KEY
            );
        case ModelProviderName.ANTHROPIC:
            return (
                character.settings?.secrets?.ANTHROPIC_API_KEY ||
                character.settings?.secrets?.CLAUDE_API_KEY ||
                settings.ANTHROPIC_API_KEY ||
                settings.CLAUDE_API_KEY
            );
        case ModelProviderName.REDPILL:
            return (
                character.settings?.secrets?.REDPILL_API_KEY ||
                settings.REDPILL_API_KEY
            );
        case ModelProviderName.OPENROUTER:
            return (
                character.settings?.secrets?.OPENROUTER ||
                settings.OPENROUTER_API_KEY
            );
        case ModelProviderName.GROK:
            return (
                character.settings?.secrets?.GROK_API_KEY ||
                settings.GROK_API_KEY
            );
        case ModelProviderName.HEURIST:
            return (
                character.settings?.secrets?.HEURIST_API_KEY ||
                settings.HEURIST_API_KEY
            );
        case ModelProviderName.GROQ:
            return (
                character.settings?.secrets?.GROQ_API_KEY ||
                settings.GROQ_API_KEY
            );
        case ModelProviderName.GALADRIEL:
            return (
                character.settings?.secrets?.GALADRIEL_API_KEY ||
                settings.GALADRIEL_API_KEY
            );
        case ModelProviderName.FAL:
            return (
                character.settings?.secrets?.FAL_API_KEY || settings.FAL_API_KEY
            );
        case ModelProviderName.ALI_BAILIAN:
            return (
                character.settings?.secrets?.ALI_BAILIAN_API_KEY ||
                settings.ALI_BAILIAN_API_KEY
            );
        case ModelProviderName.VOLENGINE:
            return (
                character.settings?.secrets?.VOLENGINE_API_KEY ||
                settings.VOLENGINE_API_KEY
            );
    }
}

// v2 TODO: should be a registered pattern to get the database adapter being used
function initializeDatabase(dataDir: string) {
    if (process.env.POSTGRES_URL) {
        elizaLogger.info("Initializing PostgreSQL connection...");
        const db = new PostgresDatabaseAdapter({
            connectionString: process.env.POSTGRES_URL,
            parseInputs: true,
        });

        // Test the connection
        db.init()
            .then(() => {
                elizaLogger.success(
                    "Successfully connected to PostgreSQL database"
                );
            })
            .catch((error) => {
                elizaLogger.error("Failed to connect to PostgreSQL:", error);
            });

        return db;
    } else {
        const filePath =
            process.env.SQLITE_FILE ?? path.resolve(dataDir, "db.sqlite");
        // ":memory:";
        const db = new SqliteDatabaseAdapter(new Database(filePath));
        return db;
    }
}

// also adds plugins from character file into the runtime
export async function initializeClients(
    character: Character,
    runtime: IAgentRuntime
) {
    // each client can only register once
    // and if we want two we can explicitly support it
    const clients: Record<string, any> = {};
    const clientTypes: string[] =
        character.clients?.map((str) => str.toLowerCase()) || [];
    elizaLogger.log("initializeClients", clientTypes, "for", character.name);

    // v2 TODO: Instead of checking if client type includes "discord" or "twitter", should just be a loop and hook
    // So we don't need to check per platform
    if (clientTypes.includes("discord")) {
        const discordClient = await DiscordClientInterface.start(runtime);
        if (discordClient) clients.discord = discordClient;
    }

    if (clientTypes.includes("twitter")) {
        const twitterClient = await TwitterClientInterface.start(runtime);
        if (twitterClient) clients.twitter = twitterClient;
    }

    elizaLogger.log("client keys", Object.keys(clients));

    if (character.plugins?.length > 0) {
        for (const plugin of character.plugins) {
            // if plugin has clients, add those..
            if (plugin.clients) {
                for (const client of plugin.clients) {
                    clients.push(await client.start(runtime));
                }
            }
        }
    }

    return clients;
}

function getSecret(character: Character, secret: string) {
    return character.settings?.secrets?.[secret] || process.env[secret];
}

let nodePlugin: any | undefined;

export async function createAgent(
    character: Character,
    db: IDatabaseAdapter,
    cache: ICacheManager,
    token: string
): Promise<AgentRuntime> {
    elizaLogger.success(
        elizaLogger.successesTitle,
        "Creating runtime for character",
        character.name
    );

    nodePlugin ??= createNodePlugin();

    let goatPlugin: any | undefined;
    if (getSecret(character, "ALCHEMY_API_KEY")) {
        goatPlugin = await createGoatPlugin((secret) =>
            getSecret(character, secret)
        );
    }

    return new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        // character.plugins are handled when clients are added
        plugins: [
            bootstrapPlugin,
            nodePlugin,
            getSecret(character, "EVM_PRIVATE_KEY") ||
            (getSecret(character, "WALLET_PUBLIC_KEY") &&
                getSecret(character, "WALLET_PUBLIC_KEY")?.startsWith("0x"))
                ? evmPlugin
                : null,
            getSecret(character, "FAL_API_KEY") ||
            getSecret(character, "OPENAI_API_KEY") ||
            getSecret(character, "VENICE_API_KEY") ||
            getSecret(character, "HEURIST_API_KEY")
                ? imageGenerationPlugin
                : null,
            getSecret(character, "ALCHEMY_API_KEY") ? goatPlugin : null,
        ].filter(Boolean),
        providers: [],
        actions: [],
        services: [],
        managers: [],
        cacheManager: cache,
        fetch: logFetch,
    });
}

function initializeFsCache(baseDir: string, character: Character) {
    const cacheDir = path.resolve(baseDir, character.id, "cache");

    const cache = new CacheManager(new FsCacheAdapter(cacheDir));
    return cache;
}

function initializeDbCache(character: Character, db: IDatabaseCacheAdapter) {
    const cache = new CacheManager(new DbCacheAdapter(db, character.id));
    return cache;
}

async function startAgent(
    character: Character,
    directClient
): Promise<AgentRuntime> {
    let db: IDatabaseAdapter & IDatabaseCacheAdapter;
    try {
        character.id ??= stringToUuid(character.name);
        character.username ??= character.name;

        const token = getTokenForProvider(character.modelProvider, character);
        const dataDir = path.join(__dirname, "../data");

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        db = initializeDatabase(dataDir) as IDatabaseAdapter &
            IDatabaseCacheAdapter;

        await db.init();

        const cache = initializeDbCache(character, db);
        const runtime: AgentRuntime = await createAgent(
            character,
            db,
            cache,
            token
        );

        // start services/plugins/process knowledge
        await runtime.initialize();

        // start assigned clients
        runtime.clients = await initializeClients(character, runtime);

        directClient.registerAgent(runtime);
        console.log("registered agent");

        // report to console
        elizaLogger.debug(`Started ${character.name} as ${runtime.agentId}`);

        return runtime;
    } catch (error) {
        elizaLogger.error(
            `Error starting agent for character ${character.name}:`,
            error
        );
        console.error(error);
        if (db) {
            await db.close();
        }
        throw error;
    }
}

const startAgents = async () => {
    const dc = new DirectClient();
    await dc.start(parseInt(settings.SERVER_PORT || "3000"));
    const args = parseArguments();

    let charactersArg = args.characters || args.character;

    let characters = [defaultCharacter];

    if (charactersArg) {
        characters = await loadCharacters(charactersArg);
    }

    try {
        for (const character of characters) {
            await startAgent(character, dc);
        }
    } catch (error) {
        elizaLogger.error("Error starting agents:", error);
    }

    function chat() {
        const agentId = characters[0].name ?? "Agent";
        rl.question("You: ", async (input) => {
            console.log("input", input);
            await handleUserInput(input, agentId);
            if (input.toLowerCase() !== "exit") {
                chat(); // Loop back to ask another question
            }
        });
    }

    if (!args["non-interactive"]) {
        elizaLogger.log("Chat started. Type 'exit' to quit.");
        chat();
    }
};

startAgents().catch((error) => {
    elizaLogger.error("Unhandled error in startAgents:", error);
    process.exit(1); // Exit the process after logging
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function handleUserInput(input, agentId) {
    if (input.toLowerCase() === "exit") {
        gracefulExit();
    }

    try {
        console.log("input", input);
        const serverPort = parseInt(settings.SERVER_PORT || "3000");
        console.log("send message");
        const response = await fetch(
            `http://localhost:${serverPort}/${agentId}/message`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: input,
                    userId: "user",
                    userName: "User",
                }),
            }
        );

        const data = await response.json();
        data.forEach((message) =>
            elizaLogger.log(`${"Agent"}: ${message.text}`)
        );
    } catch (error) {
        console.error("Error fetching response:", error);
    }
}

async function gracefulExit() {
    elizaLogger.log("Terminating and cleaning up resources...");
    rl.close();
    process.exit(0);
}

rl.on("SIGINT", gracefulExit);
rl.on("SIGTERM", gracefulExit);
