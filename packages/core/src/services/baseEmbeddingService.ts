import { EmbeddingProvider, EmbeddingConfig, IAgentRuntime } from "../types";

export abstract class BaseEmbeddingService implements EmbeddingProvider {
    protected dimensions: number = 384; // Default dimension

    abstract initialize(): Promise<void>;
    abstract generateEmbedding(input: string): Promise<number[]>;

    getZeroVector(): number[] {
        return Array(this.dimensions).fill(0);
    }

    protected async retrieveFromCache(runtime: IAgentRuntime, input: string): Promise<number[] | null> {
        if (!input) return null;
        const results = await runtime.messageManager.getCachedEmbeddings(input);
        return results.length > 0 ? results[0].embedding : null;
    }
}
