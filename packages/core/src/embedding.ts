// TODO: Refactor to call the registered embedding model

import elizaLogger from "./logger.ts";
import { type IAgentRuntime } from "./types.ts";

export function getEmbeddingZeroVector(): number[] {
    let embeddingDimension = 384; // Default BGE dimension

    return Array(embeddingDimension).fill(0);
}

/**
 * Gets embeddings from a remote API endpoint.  Falls back to local BGE/384
 *
 * @param {string} input - The text to generate embeddings for
 * @param {EmbeddingOptions} options - Configuration options including:
 *   - model: The model name to use
 *   - endpoint: Base API endpoint URL
 *   - apiKey: Optional API key for authentication
 *   - isOllama: Whether this is an Ollama endpoint
 *   - dimensions: Desired embedding dimensions
 * @param {IAgentRuntime} runtime - The agent runtime context
 * @returns {Promise<number[]>} Array of embedding values
 * @throws {Error} If the API request fails
 */

export async function embed(runtime: IAgentRuntime, input: string) {
    elizaLogger.debug("Embedding request:", {
        input: input?.slice(0, 50) + "...",
        inputType: typeof input,
        inputLength: input?.length,
        isString: typeof input === "string",
        isEmpty: !input,
    });

    // Validate input
    if (!input || typeof input !== "string" || input.trim().length === 0) {
        elizaLogger.warn("Invalid embedding input:", {
            input,
            type: typeof input,
            length: input?.length,
        });
        return []; // Return empty embedding array
    }

    // Check cache first
    const cachedEmbedding = await retrieveCachedEmbedding(runtime, input);
    if (cachedEmbedding) return cachedEmbedding;

    // const config = getEmbeddingConfig();
    // const isNode = typeof process !== "undefined" && process.versions?.node;

    // // Determine which embedding path to use
    // if (config.provider === EmbeddingProvider.OpenAI) {
    //     return await getRemoteEmbedding(input, {
    //         model: config.model,
    //         endpoint: settings.OPENAI_API_URL || "https://api.openai.com/v1",
    //         apiKey: settings.OPENAI_API_KEY,
    //         dimensions: config.dimensions,
    //     });
    // }

    // BGE - try local first if in Node
    // if (isNode) {
        try {
            // return await getLocalEmbedding(input);
        } catch (error) {
            elizaLogger.warn(
                "Local embedding failed, falling back to remote",
                error
            );
        }

    async function retrieveCachedEmbedding(
        runtime: IAgentRuntime,
        input: string
    ) {
        if (!input) {
            elizaLogger.log("No input to retrieve cached embedding for");
            return null;
        }

        const similaritySearchResult =
            await runtime.messageManager.getCachedEmbeddings(input);
        if (similaritySearchResult.length > 0) {
            return similaritySearchResult[0].embedding;
        }
        return null;
    }
}
