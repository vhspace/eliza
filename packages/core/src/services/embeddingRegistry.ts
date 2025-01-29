import { EmbeddingProvider, ModelProviderName } from "../types";

export class EmbeddingRegistry {
    private static providers = new Map<ModelProviderName, EmbeddingProvider>();

    static registerProvider(type: ModelProviderName, provider: EmbeddingProvider) {
        this.providers.set(type, provider);
    }

    static getProvider(type: ModelProviderName): EmbeddingProvider | undefined {
        return this.providers.get(type);
    }

    static hasProvider(type: ModelProviderName): boolean {
        return this.providers.has(type);
    }
}
