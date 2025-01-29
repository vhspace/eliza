import { Plugin, ModelProviderName } from "@elizaos/core";
import { EmbeddingRegistry } from "@elizaos/core";
import settings from "@elizaos/core/setting";
import {
    LocalEmbeddingProvider,
    OpenAIEmbeddingProvider,
    OllamaEmbeddingProvider,
    GaiaNetEmbeddingProvider,
    HuggingFaceEmbeddingProvider,
    CohereEmbeddingProvider,
    AzureOpenAIEmbeddingProvider
} from "./services";

// Create providers with configurations
const providers = {
    [ModelProviderName.BGE]: new LocalEmbeddingProvider({
        cacheResults: true,
        maxRetries: 2
    }),

    [ModelProviderName.OPENAI]: new OpenAIEmbeddingProvider({
        apiKey: settings.OPENAI_API_KEY,
        endpoint: settings.OPENAI_API_URL,
        maxRetries: 3
    }),

    [ModelProviderName.OLLAMA]: new OllamaEmbeddingProvider({
        endpoint: settings.OLLAMA_API_URL,
        maxRetries: 2
    }),

    [ModelProviderName.HUGGINGFACE]: new HuggingFaceEmbeddingProvider({
        apiKey: settings.HUGGINGFACE_API_KEY,
        maxRetries: 3
    }),

    [ModelProviderName.COHERE]: new CohereEmbeddingProvider({
        apiKey: settings.COHERE_API_KEY,
        maxRetries: 3
    }),

    [ModelProviderName.AZURE_OPENAI]: new AzureOpenAIEmbeddingProvider({
        endpoint: settings.AZURE_OPENAI_ENDPOINT,
        apiKey: settings.AZURE_OPENAI_KEY,
        maxRetries: 3
    })
};

// Register all providers
Object.entries(providers).forEach(([name, provider]) => {
    EmbeddingRegistry.registerProvider(name as ModelProviderName, provider);
});

export const embeddingPlugin: Plugin = {
    name: "embedding",
    description: "Unified embedding provider plugin",
    providers: Object.entries(providers).map(([type, provider]) => ({
        type: "embedding",
        provider
    }))
};

// Export everything for direct use
export * from "./services";
export * from "./types";
