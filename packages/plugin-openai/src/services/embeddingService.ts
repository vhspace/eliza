import { BaseEmbeddingService } from "@elizaos/core";
import { validateApiKey, callOpenAiApi } from "../actions/action";

export class OpenAIEmbeddingProvider extends BaseEmbeddingService {
    private initialized = false;

    constructor() {
        super();
        this.dimensions = 1536; // OpenAI embedding dimension
    }

    async initialize(): Promise<void> {
        validateApiKey();
        this.initialized = true;
    }

    async generateEmbedding(input: string): Promise<number[]> {
        if (!this.initialized) await this.initialize();

        const apiKey = validateApiKey();
        const response = await callOpenAiApi(
            "https://api.openai.com/v1/embeddings",
            {
                model: "text-embedding-ada-002",
                input: input
            },
            apiKey
        );

        return response.data[0].embedding;
    }
}
