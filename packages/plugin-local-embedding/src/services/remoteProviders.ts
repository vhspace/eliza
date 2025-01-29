import { BaseEmbeddingProvider } from "./baseProvider";
import { getEndpoint } from "@elizaos/core/models";
import { ModelProviderName } from "@elizaos/core";
import settings from "@elizaos/core/settings";
import { EmbeddingProviderConfig, EmbeddingProviderError } from "../types";

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
    constructor() {
        super();
        this.dimensions = 1536;
    }

    async generateEmbedding(input: string): Promise<number[]> {
        return this.getRemoteEmbedding(input, {
            model: "text-embedding-ada-002",
            endpoint: settings.OPENAI_API_URL || "https://api.openai.com/v1",
            apiKey: settings.OPENAI_API_KEY,
            dimensions: this.dimensions,
        });
    }
}

export class OllamaEmbeddingProvider extends BaseEmbeddingProvider {
    private endpoint: string;

    constructor(config: EmbeddingProviderConfig = {}) {
        super(config);
        this.dimensions = config.dimensions || 384;
        this.endpoint = config.endpoint || getEndpoint(ModelProviderName.OLLAMA);
    }

    async generateEmbedding(input: string): Promise<number[]> {
        return this.getRemoteEmbedding(input, {
            model: "mxbai-embed-large",
            endpoint: this.endpoint,
            isOllama: true,
            dimensions: this.dimensions,
        });
    }
}

export class GaiaNetEmbeddingProvider extends BaseEmbeddingProvider {
    private endpoint: string;
    private apiKey: string;

    constructor(config: EmbeddingProviderConfig = {}) {
        super(config);
        this.dimensions = config.dimensions || 384;
        this.endpoint = config.endpoint || getEndpoint(ModelProviderName.GAIANET);
        this.apiKey = config.apiKey || settings.GAIANET_API_KEY || "";
    }

    async generateEmbedding(input: string): Promise<number[]> {
        return this.getRemoteEmbedding(input, {
            model: "gaianet-embed",
            endpoint: this.endpoint,
            apiKey: this.apiKey,
            dimensions: this.dimensions,
        });
    }
}

export class HuggingFaceEmbeddingProvider extends BaseEmbeddingProvider {
    constructor(config: EmbeddingProviderConfig = {}) {
        super({
            dimensions: 768,
            model: "sentence-transformers/all-mpnet-base-v2",
            ...config
        });
    }

    async generateEmbedding(input: string): Promise<number[]> {
        return this.getRemoteEmbedding(input, {
            model: this.config.model!,
            endpoint: this.config.endpoint || "https://api-inference.huggingface.co/pipeline/feature-extraction",
            apiKey: this.config.apiKey,
            dimensions: this.dimensions
        });
    }
}

export class CohereEmbeddingProvider extends BaseEmbeddingProvider {
    constructor(config: EmbeddingProviderConfig = {}) {
        super({
            dimensions: 1024,
            model: "embed-english-v2.0",
            ...config
        });
    }

    async generateEmbedding(input: string): Promise<number[]> {
        return this.getRemoteEmbedding(input, {
            model: this.config.model!,
            endpoint: this.config.endpoint || "https://api.cohere.ai/v1",
            apiKey: this.config.apiKey,
            dimensions: this.dimensions
        });
    }
}

export class AzureOpenAIEmbeddingProvider extends BaseEmbeddingProvider {
    constructor(config: EmbeddingProviderConfig = {}) {
        super({
            dimensions: 1536,
            model: "text-embedding-ada-002",
            ...config
        });
    }

    async generateEmbedding(input: string): Promise<number[]> {
        if (!this.config.endpoint) {
            throw new EmbeddingProviderError(
                'Azure endpoint is required',
                'CONFIGURATION_ERROR',
                undefined,
                false
            );
        }
        return this.getRemoteEmbedding(input, {
            model: this.config.model!,
            endpoint: this.config.endpoint,
            apiKey: this.config.apiKey,
            dimensions: this.dimensions
        });
    }
}
