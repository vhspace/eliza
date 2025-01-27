// TODO: Move all setup into the adapters themselves and dynamically import the adapter based on the current project.json
// This can be templated so that the agent can be cloned into a new repo and the correct adapter can be loaded at runtime / dynamically
// The goal is that the CLI can add or replace the adapter with a single line

import { MongoDBDatabaseAdapter } from "@elizaos/adapter-mongodb"
import { PGLiteDatabaseAdapter } from "@elizaos/adapter-pglite"
import { PostgresDatabaseAdapter } from "@elizaos/adapter-postgres"
import { QdrantDatabaseAdapter } from "@elizaos/adapter-qdrant"
import { SqliteDatabaseAdapter } from "@elizaos/adapter-sqlite"
import { SupabaseDatabaseAdapter } from "@elizaos/adapter-supabase"

import {
	elizaLogger
} from "@elizaos/core"

// import { intifacePlugin } from "@elizaos/plugin-intiface";
import Database from "better-sqlite3"
import { MongoClient } from "mongodb"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url) // get the resolved path to the file
const __dirname = path.dirname(__filename) // get the name of the directory

export function initializeDatabase(dataDir: string) {
	if (process.env.MONGODB_CONNECTION_STRING) {
		elizaLogger.log("Initializing database on MongoDB Atlas");
		const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING, {
			maxPoolSize: 100,
			minPoolSize: 5,
			maxIdleTimeMS: 60000,
			connectTimeoutMS: 10000,
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 45000,
			compressors: ['zlib'],
			retryWrites: true,
			retryReads: true
		});

		const dbName = process.env.MONGODB_DATABASE || 'elizaAgent';
		const db = new MongoDBDatabaseAdapter(client, dbName);

		// Test the connection
		db.init()
			.then(() => {
				elizaLogger.success(
					"Successfully connected to MongoDB Atlas"
				);
			})
			.catch((error) => {
				elizaLogger.error("Failed to connect to MongoDB Atlas:", error);
				throw error; // Re-throw to handle it in the calling code
			});

		return db;
	} else if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
		elizaLogger.info("Initializing Supabase connection...");
		const db = new SupabaseDatabaseAdapter(
			process.env.SUPABASE_URL,
			process.env.SUPABASE_ANON_KEY,
		);

		// Test the connection
		db.init()
			.then(() => {
				elizaLogger.success("Successfully connected to Supabase database")
			})
			.catch((error) => {
				elizaLogger.error("Failed to connect to Supabase:", error)
			})

		return db
	} else if (process.env.POSTGRES_URL) {
		elizaLogger.info("Initializing PostgreSQL connection...")
		const db = new PostgresDatabaseAdapter({
			connectionString: process.env.POSTGRES_URL,
			parseInputs: true,
		})

		// Test the connection
		db.init()
			.then(() => {
				elizaLogger.success("Successfully connected to PostgreSQL database")
			})
			.catch((error) => {
				elizaLogger.error("Failed to connect to PostgreSQL:", error)
			})

		return db
	} else if (process.env.PGLITE_DATA_DIR) {
		elizaLogger.info("Initializing PgLite adapter...")
		// `dataDir: memory://` for in memory pg
		const db = new PGLiteDatabaseAdapter({
			dataDir: process.env.PGLITE_DATA_DIR,
		})
		return db
	} else if (
		process.env.QDRANT_URL && process.env.QDRANT_KEY && process.env.QDRANT_PORT && process.env.QDRANT_VECTOR_SIZE) {
		elizaLogger.info("Initializing Qdrant adapter...")
		const db = new QdrantDatabaseAdapter(process.env.QDRANT_URL, process.env.QDRANT_KEY, Number(process.env.QDRANT_PORT), Number(process.env.QDRANT_VECTOR_SIZE),)
		return db
	} else {
		const filePath = process.env.SQLITE_FILE ?? path.resolve(dataDir, "db.sqlite")
		elizaLogger.info(`Initializing SQLite database at ${filePath}...`)
		const db = new SqliteDatabaseAdapter(new Database(filePath))

		// Test the connection
		db.init()
			.then(() => {
				elizaLogger.success("Successfully connected to SQLite database")
			})
			.catch((error) => {
				elizaLogger.error("Failed to connect to SQLite:", error)
			})

		return db
	}
}