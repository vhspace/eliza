export interface EmbeddingProviderConfig {
    endpoint?: string;
    apiKey?: string;
    dimensions?: number;
    model?: string;
    maxRetries?: number;
    timeout?: number;
    cacheResults?: boolean;
}

export interface EmbeddingError extends Error {
    code: string;
    statusCode?: number;
    retryable: boolean;
}

export class EmbeddingProviderError extends Error implements EmbeddingError {
    code: string;
    statusCode?: number;
    retryable: boolean;

    constructor(message: string, code: string, statusCode?: number, retryable = false) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.retryable = retryable;
        this.name = 'EmbeddingProviderError';
    }
}
