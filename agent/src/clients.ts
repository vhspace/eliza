// TODO: Move all client setup into each client package
// Clients should be dynamically imported and registered at runtime like other plugins
// We make just want to turn all clients into plugins to keep it simple

import { AlexaClientInterface } from "@elizaos/client-alexa"
import { AutoClientInterface } from "@elizaos/client-auto"
import { DiscordClientInterface } from "@elizaos/client-discord"
import { InstagramClientInterface } from "@elizaos/client-instagram"
import { LensAgentClient } from "@elizaos/client-lens"
import { SlackClientInterface } from "@elizaos/client-slack"
import { TelegramClientInterface } from "@elizaos/client-telegram"
import { TelegramAccountClientInterface } from "@elizaos/client-telegram-account"
import { TwitterClientInterface } from "@elizaos/client-twitter"
import { FarcasterClientInterface } from "@elizaos/client-farcaster"
import { JeeterClientInterface } from "@elizaos/client-simsai"
import { XmtpClientInterface } from "@elizaos/client-xmtp"
import { Character, Client, Clients, elizaLogger, IAgentRuntime } from "@elizaos/core"

// also adds plugins from character file into the runtime
export async function initializeClients(character: Character, runtime: IAgentRuntime) {
	// each client can only register once
	// and if we want two we can explicitly support it
	const clients: Record<string, any> = {}
	const clientTypes: string[] = character.clients?.map((str) => str.toLowerCase()) || []
	elizaLogger.log("initializeClients", clientTypes, "for", character.name)


	// Start Auto Client if "auto" detected as a configured client
	if (clientTypes.includes(Clients.AUTO)) {
		const autoClient = await AutoClientInterface.start(runtime)
		if (autoClient) clients.auto = autoClient
	}

	if (clientTypes.includes(Clients.XMTP)) {
        const xmtpClient = await XmtpClientInterface.start(runtime);
        if (xmtpClient) clients.xmtp = xmtpClient;
    }

	if (clientTypes.includes(Clients.DISCORD)) {
		const discordClient = await DiscordClientInterface.start(runtime)
		if (discordClient) clients.discord = discordClient
	}

	if (clientTypes.includes(Clients.TELEGRAM)) {
		const telegramClient = await TelegramClientInterface.start(runtime)
		if (telegramClient) clients.telegram = telegramClient
	}

    if (clientTypes.includes(Clients.TELEGRAM_ACCOUNT)) {
        const telegramAccountClient = await TelegramAccountClientInterface.start(runtime);
        if (telegramAccountClient) clients.telegram_account = telegramAccountClient;
    }

	if (clientTypes.includes(Clients.TWITTER)) {
		const twitterClient = await TwitterClientInterface.start(runtime)
		if (twitterClient) {
			clients.twitter = twitterClient
		}
	}

	if (clientTypes.includes(Clients.ALEXA)) {
		const alexaClient = await AlexaClientInterface.start(runtime);
		if (alexaClient) {
			clients.alexa = alexaClient;
		}
	}

	if (clientTypes.includes(Clients.INSTAGRAM)) {
		const instagramClient = await InstagramClientInterface.start(runtime)
		if (instagramClient) {
			clients.instagram = instagramClient
		}
	}

	if (clientTypes.includes(Clients.FARCASTER)) {
		const farcasterClient = await FarcasterClientInterface.start(runtime)
		if (farcasterClient) {
			clients.farcaster = farcasterClient
		}
	}

	if (clientTypes.includes("lens")) {
		const lensClient = new LensAgentClient(runtime)
		lensClient.start()
		clients.lens = lensClient
	}

	if (clientTypes.includes(Clients.SIMSAI)) {
		const simsaiClient = await JeeterClientInterface.start(runtime)
		if (simsaiClient) clients.simsai = simsaiClient
	}

	elizaLogger.log("client keys", Object.keys(clients))

	// TODO: Add Slack client to the list
	// Initialize clients as an object

	if (clientTypes.includes("slack")) {
		const slackClient = await SlackClientInterface.start(runtime)
		if (slackClient) clients.slack = slackClient // Use object property instead of push
	}

	function determineClientType(client: Client): string {
		// Check if client has a direct type identifier
		if ("type" in client) {
			return (client as any).type
		}

		// Check constructor name
		const constructorName = client.constructor?.name
		if (constructorName && !constructorName.includes("Object")) {
			return constructorName.toLowerCase().replace("client", "")
		}

		// Fallback: Generate a unique identifier
		return `client_${Date.now()}`
	}

	if (character.plugins?.length > 0) {
		for (const plugin of character.plugins) {
			if (plugin.clients) {
				for (const client of plugin.clients) {
					const startedClient = await client.start(runtime)
					const clientType = determineClientType(client)
					elizaLogger.debug(`Initializing client of type: ${clientType}`)
					clients[clientType] = startedClient
				}
			}
		}
	}

	return clients
}