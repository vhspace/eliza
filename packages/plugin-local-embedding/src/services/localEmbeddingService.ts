import { BaseEmbeddingService } from "@elizaos/core";
import { FlagEmbedding, EmbeddingModel } from "fastembed";

export class LocalEmbeddingProvider extends BaseEmbeddingService {
    private model: FlagEmbedding | null = null;

    constructor() {
        super();
        this.dimensions = 384; // BGE dimension
    }

    async initialize(): Promise<void> {
        if (this.model) return;

        const cacheDir = await this.getRootPath() + "/cache/";
        await fs.promises.mkdir(cacheDir, { recursive: true });

        this.model = await FlagEmbedding.init({
            cacheDir,
            model: EmbeddingModel.BGESmallENV15,
            maxLength: 512
        });
    }

    async generateEmbedding(input: string): Promise<number[]> {
        if (!this.model) await this.initialize();
        if (!this.model) throw new Error("Failed to initialize model");

        const embedding = await this.model.queryEmbed(input);
        return this.processEmbedding(embedding);
    }

    // ... rest of the implementation from current LocalEmbeddingManager
}
