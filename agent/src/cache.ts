// TODO: We want to refactor cache to be DB only. The cache should just live in the DB that is being used by everything else
// Redis is overkill for an operation that doesn't need to be called very often (< 2 per second) and file storage isn't compatible with many environments
// If we could roll cache into the database loader then we could save some dev effort
// Having a separate cache manager that uses the same database adapter as the memory manager sounds good

import { RedisClient } from "@elizaos/adapter-redis"
import {
    CacheManager,
    CacheStore,
    type Character,
    DbCacheAdapter,
    elizaLogger,
    FsCacheAdapter,
    type IDatabaseCacheAdapter
} from "@elizaos/core"
import path from "path"

function initializeFsCache(baseDir: string, character: Character) {
	if (!character?.id) {
		throw new Error("initializeFsCache requires id to be set in character definition")
	}
	const cacheDir = path.resolve(baseDir, character.id, "cache")

	const cache = new CacheManager(new FsCacheAdapter(cacheDir))
	return cache
}

function initializeDbCache(character: Character, db: IDatabaseCacheAdapter) {
	if (!character?.id) {
		throw new Error("initializeFsCache requires id to be set in character definition")
	}
	const cache = new CacheManager(new DbCacheAdapter(db, character.id))
	return cache
}

export function initializeCache(cacheStore: string, character: Character, baseDir?: string, db?: IDatabaseCacheAdapter) {
	switch (cacheStore) {
		case CacheStore.REDIS:
			if (process.env.REDIS_URL) {
				elizaLogger.info("Connecting to Redis...")
				const redisClient = new RedisClient(process.env.REDIS_URL)
				if (!character?.id) {
					throw new Error("CacheStore.REDIS requires id to be set in character definition")
				}
				return new CacheManager(
					new DbCacheAdapter(redisClient, character.id) // Using DbCacheAdapter since RedisClient also implements IDatabaseCacheAdapter
				)
			} else {
				throw new Error("REDIS_URL environment variable is not set.")
			}

		case CacheStore.DATABASE:
			if (db) {
				elizaLogger.info("Using Database Cache...")
				return initializeDbCache(character, db)
			} else {
				throw new Error("Database adapter is not provided for CacheStore.Database.")
			}

		case CacheStore.FILESYSTEM:
			elizaLogger.info("Using File System Cache...")
			if (!baseDir) {
				throw new Error("baseDir must be provided for CacheStore.FILESYSTEM.")
			}
			return initializeFsCache(baseDir, character)

		default:
			throw new Error(`Invalid cache store: ${cacheStore} or required configuration missing.`)
	}
}