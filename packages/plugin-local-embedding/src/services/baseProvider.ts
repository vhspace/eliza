import { BaseEmbeddingService } from "@elizaos/core";
import elizaLogger from "@elizaos/core/logger";
import { EmbeddingProviderConfig, EmbeddingProviderError } from "../types";

export abstract class BaseEmbeddingProvider extends BaseEmbeddingService {
    protected config: EmbeddingProviderConfig;
    protected retryCount: number = 0;

    constructor(config: EmbeddingProviderConfig = {}) {
        super();
        this.config = {
            maxRetries: 3,
            timeout: 30000,
            cacheResults: true,
            ...config
        };
        this.dimensions = config.dimensions || 384;
    }

    protected async withRetry<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: Error | null = null;

        for (let i = 0; i <= this.config.maxRetries!; i++) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;
                if (error instanceof EmbeddingProviderError && !error.retryable) {
                    throw error;
                }
                if (i < this.config.maxRetries!) {
                    const delay = Math.min(1000 * Math.pow(2, i), 10000);
                    elizaLogger.warn(`Retry ${i + 1}/${this.config.maxRetries} after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }

    protected async getRemoteEmbedding(
        input: string,
        options: {
            model: string;
            endpoint: string;
            apiKey?: string;
            dimensions?: number;
            isOllama?: boolean;
        }
    ): Promise<number[]> {
        return this.withRetry(async () => {
            const baseEndpoint = options.endpoint.endsWith("/v1")
                ? options.endpoint
                : `${options.endpoint}${options.isOllama ? "/v1" : ""}`;

            const fullUrl = `${baseEndpoint}/embeddings`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.config.timeout);

            try {
                const response = await fetch(fullUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
                    },
                    body: JSON.stringify({
                        input,
                        model: options.model,
                        dimensions: options.dimensions || this.dimensions,
                    }),
                    signal: controller.signal
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new EmbeddingProviderError(
                        `API Error: ${errorText}`,
                        'API_ERROR',
                        response.status,
                        response.status >= 500 || response.status === 429
                    );
                }

                const data = await response.json();
                if (!data?.data?.[0]?.embedding) {
                    throw new EmbeddingProviderError(
                        'Invalid response format',
                        'INVALID_RESPONSE',
                        undefined,
                        false
                    );
                }

                return data.data[0].embedding;
            } catch (e: any) {
                if (e.name === 'AbortError') {
                    throw new EmbeddingProviderError(
                        'Request timeout',
                        'TIMEOUT',
                        undefined,
                        true
                    );
                }
                throw e;
            } finally {
                clearTimeout(timeout);
            }
        });
    }
}
