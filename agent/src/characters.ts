// TODO: Characters should be loaded from memory, with fallbacks to onchain, from file etc for backwards compatibility
// The CLI should enable users to import / export character files, but primarily they should be edited from the GUI
// Characters in memory can update themselves, so we will want to make this the default and deprecate other options
// For loading from chain we might want to consider this as an import option instead of a runtime option

import {
    type Character,
    defaultCharacter,
    elizaLogger,
    validateCharacterConfig
} from "@elizaos/core"
import { onchainJson } from "@elizaos/plugin-iq6900"
// import { intifacePlugin } from "@elizaos/plugin-intiface";
import { normalizeCharacter } from "@elizaos/plugin-di"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import yargs from "yargs"
import { handlePluginImporting } from "./plugins"

const __filename = fileURLToPath(import.meta.url) // get the resolved path to the file
const __dirname = path.dirname(__filename) // get the name of the directory


export function parseArguments(): {
	character?: string
	characters?: string
} {
	try {
		return yargs(process.argv.slice(3))
			.option("character", {
				type: "string",
				description: "Path to the character JSON file",
			})
			.option("characters", {
				type: "string",
				description: "Comma separated list of paths to character JSON files",
			})
			.parseSync()
	} catch (error) {
		elizaLogger.error("Error parsing arguments:", error)
		return {}
	}
}

function tryLoadFile(filePath: string): string | null {
	try {
		return fs.readFileSync(filePath, "utf8")
	} catch (e) {
		return null
	}
}
function mergeCharacters(base: Character, child: Character): Character {
	const mergeObjects = (baseObj: any, childObj: any) => {
		const result: any = {}
		const keys = new Set([...Object.keys(baseObj || {}), ...Object.keys(childObj || {})])
		keys.forEach((key) => {
			if (typeof baseObj[key] === "object" && typeof childObj[key] === "object" && !Array.isArray(baseObj[key]) && !Array.isArray(childObj[key])) {
				result[key] = mergeObjects(baseObj[key], childObj[key])
			} else if (Array.isArray(baseObj[key]) || Array.isArray(childObj[key])) {
				result[key] = [...(baseObj[key] || []), ...(childObj[key] || [])]
			} else {
				result[key] = childObj[key] !== undefined ? childObj[key] : baseObj[key]
			}
		})
		return result
	}
	return mergeObjects(base, child)
}
function isAllStrings(arr: unknown[]): boolean {
	return Array.isArray(arr) && arr.every((item) => typeof item === "string")
}
export async function loadCharacterFromOnchain(): Promise<Character[]> {
	const jsonText = onchainJson

	console.log("JSON:", jsonText)
	if (!jsonText) return []
	const loadedCharacters = []
	try {
		const character = JSON.parse(jsonText)
		validateCharacterConfig(character)

		// .id isn't really valid
		const characterId = character.id || character.name
		const characterPrefix = `CHARACTER.${characterId.toUpperCase().replace(/ /g, "_")}.`

		const characterSettings = Object.entries(process.env)
			.filter(([key]) => key.startsWith(characterPrefix))
			.reduce((settings, [key, value]) => {
				const settingKey = key.slice(characterPrefix.length)
				settings[settingKey] = value
				return settings
			}, {})

		if (Object.keys(characterSettings).length > 0) {
			character.settings = character.settings || {}
			character.settings.secrets = {
				...characterSettings,
				...character.settings.secrets,
			}
		}

		// Handle plugins
		if (isAllStrings(character.plugins)) {
			elizaLogger.info("Plugins are: ", character.plugins)
			const importedPlugins = await Promise.all(
				character.plugins.map(async (plugin) => {
					const importedPlugin = await import(plugin)
					return importedPlugin.default
				})
			)
			character.plugins = importedPlugins
		}

		loadedCharacters.push(character)
		elizaLogger.info(`Successfully loaded character from: ${process.env.IQ_WALLET_ADDRESS}`)
		return loadedCharacters
	} catch (e) {
		elizaLogger.error(`Error parsing character from ${process.env.IQ_WALLET_ADDRESS}: ${e}`)
		process.exit(1)
	}
}

async function loadCharactersFromUrl(url: string): Promise<Character[]> {
	try {
		const response = await fetch(url)
		const responseJson = await response.json()

		let characters: Character[] = []
		if (Array.isArray(responseJson)) {
			characters = await Promise.all(responseJson.map((character) => jsonToCharacter(url, character)))
		} else {
			const character = await jsonToCharacter(url, responseJson)
			characters.push(character)
		}
		return characters
	} catch (e) {
		elizaLogger.error(`Error loading character(s) from ${url}: ${e}`)
		process.exit(1)
	}
}

export async function jsonToCharacter(filePath: string, character: any): Promise<Character> {
	validateCharacterConfig(character)

	// .id isn't really valid
	const characterId = character.id || character.name
	const characterPrefix = `CHARACTER.${characterId.toUpperCase().replace(/ /g, "_")}.`
	const characterSettings = Object.entries(process.env)
		.filter(([key]) => key.startsWith(characterPrefix))
		.reduce((settings, [key, value]) => {
			const settingKey = key.slice(characterPrefix.length)
			return { ...settings, [settingKey]: value }
		}, {})
	if (Object.keys(characterSettings).length > 0) {
		character.settings = character.settings || {}
		character.settings.secrets = {
			...characterSettings,
			...character.settings.secrets,
		}
	}
	// Handle plugins
	character.plugins = await handlePluginImporting(character.plugins)
	if (character.extends) {
		elizaLogger.info(`Merging  ${character.name} character with parent characters`)
		for (const extendPath of character.extends) {
			const baseCharacter = await loadCharacter(path.resolve(path.dirname(filePath), extendPath))
			character = mergeCharacters(baseCharacter, character)
			elizaLogger.info(`Merged ${character.name} with ${baseCharacter.name}`)
		}
	}
	return character
}

async function loadCharacter(filePath: string): Promise<Character> {
	const content = tryLoadFile(filePath)
	if (!content) {
		throw new Error(`Character file not found: ${filePath}`)
	}
	const character = JSON.parse(content)
	return jsonToCharacter(filePath, character)
}

export async function loadCharacterTryPath(characterPath: string): Promise<Character> {
	let content: string | null = null
	let resolvedPath = ""

	// Try different path resolutions in order
	const pathsToTry = [
		characterPath, // exact path as specified
		path.resolve(process.cwd(), characterPath), // relative to cwd
		path.resolve(process.cwd(), "agent", characterPath), // Add this
		path.resolve(__dirname, characterPath), // relative to current script
		path.resolve(__dirname, "characters", path.basename(characterPath)), // relative to agent/characters
		path.resolve(__dirname, "../characters", path.basename(characterPath)), // relative to characters dir from agent
		path.resolve(__dirname, "../../characters", path.basename(characterPath)), // relative to project root characters dir
	]

	elizaLogger.info(
		"Trying paths:",
		pathsToTry.map((p) => ({
			path: p,
			exists: fs.existsSync(p),
		}))
	)

	for (const tryPath of pathsToTry) {
		content = tryLoadFile(tryPath)
		if (content !== null) {
			resolvedPath = tryPath
			break
		}
	}

	if (content === null) {
		elizaLogger.error(`Error loading character from ${characterPath}: File not found in any of the expected locations`)
		elizaLogger.error("Tried the following paths:")
		pathsToTry.forEach((p) => elizaLogger.error(` - ${p}`))
		throw new Error(`Error loading character from ${characterPath}: File not found in any of the expected locations`)
	}
	try {
		const character: Character = await loadCharacter(resolvedPath)
		elizaLogger.info(`Successfully loaded character from: ${resolvedPath}`)
		return character
	} catch (e) {
		elizaLogger.error(`Error parsing character from ${resolvedPath}: ${e}`)
		throw new Error(`Error parsing character from ${resolvedPath}: ${e}`)
	}
}

function commaSeparatedStringToArray(commaSeparated: string): string[] {
	return commaSeparated?.split(",").map((value) => value.trim())
}

async function readCharactersFromStorage(characterPaths: string[]): Promise<string[]> {
	try {
		const uploadDir = path.join(process.cwd(), "data", "characters")
		await fs.promises.mkdir(uploadDir, { recursive: true })
		const fileNames = await fs.promises.readdir(uploadDir)
		fileNames.forEach((fileName) => {
			characterPaths.push(path.join(uploadDir, fileName))
		})
	} catch (err) {
		elizaLogger.error(`Error reading directory: ${err.message}`)
	}

	return characterPaths
}

export async function loadCharacters(charactersArg: string): Promise<Character[]> {
	let characterPaths = commaSeparatedStringToArray(charactersArg)

	if (process.env.USE_CHARACTER_STORAGE === "true") {
		characterPaths = await readCharactersFromStorage(characterPaths)
	}

	const loadedCharacters: Character[] = []

	if (characterPaths?.length > 0) {
		for (const characterPath of characterPaths) {
			try {
				const character: Character = await loadCharacterTryPath(characterPath)
				loadedCharacters.push(character)
			} catch (e) {
				process.exit(1)
			}
		}
	}

	if (hasValidRemoteUrls()) {
		elizaLogger.info("Loading characters from remote URLs")
		const characterUrls = commaSeparatedStringToArray(process.env.REMOTE_CHARACTER_URLS)
		for (const characterUrl of characterUrls) {
			const characters = await loadCharactersFromUrl(characterUrl)
			loadedCharacters.push(...characters)
		}
	}

	if (loadedCharacters.length === 0) {
		elizaLogger.info("No characters found, using default character")
		loadedCharacters.push(defaultCharacter)
	}

	return loadedCharacters
}

const hasValidRemoteUrls = () => process.env.REMOTE_CHARACTER_URLS && process.env.REMOTE_CHARACTER_URLS !== "" && process.env.REMOTE_CHARACTER_URLS.startsWith("http")

export const loadAllCharacters = async () => {
	const args = parseArguments()
	const charactersArg = args.characters || args.character
	let characters = [defaultCharacter]

	if (process.env.IQ_WALLET_ADDRESS && process.env.IQSOlRPC) {
		characters = await loadCharacterFromOnchain()
	}

	const notOnchainJson = !onchainJson || onchainJson == "null"

	if ((notOnchainJson && charactersArg) || hasValidRemoteUrls()) {
		characters = await loadCharacters(charactersArg)
	}

	// Normalize characters for injectable plugins
	characters = await Promise.all(characters.map(normalizeCharacter))
	return characters;
}