import { BaseEmbeddingProvider } from "./baseProvider";
import { FlagEmbedding, EmbeddingModel } from "fastembed";
import path from "node:path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { EmbeddingProviderConfig } from "../types";

export class LocalEmbeddingProvider extends BaseEmbeddingProvider {
    private model: FlagEmbedding | null = null;

    constructor(config: EmbeddingProviderConfig = {}) {
        super(config);
        this.dimensions = config.dimensions || 384;
    }

    async initialize(): Promise<void> {
        if (this.model) return;

        const cacheDir = await this.getRootPath() + "/cache/";
        await fs.mkdir(cacheDir, { recursive: true });

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

    private async getRootPath(): Promise<string> {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        return path.resolve(__dirname, "../..");
    }

    private processEmbedding(embedding: any): number[] {
        if (ArrayBuffer.isView(embedding) && embedding.constructor === Float32Array) {
            return Array.from(embedding);
        }
        if (Array.isArray(embedding) && ArrayBuffer.isView(embedding[0])) {
            return Array.from(embedding[0]);
        }
        if (Array.isArray(embedding)) {
            return embedding;
        }
        throw new Error(`Unexpected embedding format: ${typeof embedding}`);
    }
}
