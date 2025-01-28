import {
    elizaLogger,
    type IAgentRuntime,
    type IImageDescriptionService,
    Service,
    ServiceType
} from "@elizaos/core";
import {
    AutoProcessor,
    AutoTokenizer,
    env,
    Florence2ForConditionalGeneration,
    type Florence2Processor,
    type PreTrainedModel,
    type PreTrainedTokenizer,
    RawImage,
    type Tensor,
} from "@huggingface/transformers";
import fs from "fs";
import os from "os";
import path from "path";
import sharp, { type AvailableFormatInfo, type FormatEnum } from "sharp";

interface ImageProvider {
    initialize(): Promise<void>;
    describeImage(
        imageData: Buffer,
        mimeType: string
    ): Promise<{ title: string; description: string }>;
}

class LocalImageProvider implements ImageProvider {
    private model: PreTrainedModel | null = null;
    private processor: Florence2Processor | null = null;
    private tokenizer: PreTrainedTokenizer | null = null;
    private modelId = "onnx-community/Florence-2-base-ft";

    async initialize(): Promise<void> {
        env.allowLocalModels = false;
        env.allowRemoteModels = true;
        env.backends.onnx.logLevel = "fatal";
        env.backends.onnx.wasm.proxy = false;
        env.backends.onnx.wasm.numThreads = 1;

        elizaLogger.info("Downloading Florence model...");
        this.model = await Florence2ForConditionalGeneration.from_pretrained(
            this.modelId,
            {
                device: "gpu",
                progress_callback: (progress) => {
                    if (progress.status === "downloading") {
                        const percent = (
                            (progress.loaded / progress.total) *
                            100
                        ).toFixed(1);
                        const dots = ".".repeat(
                            Math.floor(Number(percent) / 5)
                        );
                        elizaLogger.info(
                            `Downloading Florence model: [${dots.padEnd(20, " ")}] ${percent}%`
                        );
                    }
                },
            }
        );

        elizaLogger.info("Downloading processor...");
        this.processor = (await AutoProcessor.from_pretrained(
            this.modelId
        )) as Florence2Processor;

        elizaLogger.info("Downloading tokenizer...");
        this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId);
        elizaLogger.success("Image service initialization complete");
    }

    async describeImage(
        imageData: Buffer,
        mimeType: string
    ): Promise<{ title: string; description: string }> {
        if (!this.model || !this.processor || !this.tokenizer) {
            throw new Error("Model components not initialized");
        }
        const blob = new Blob([imageData], { type: mimeType });
        const image = await RawImage.fromBlob(blob);
        const visionInputs = await this.processor(image);
        const prompts = this.processor.construct_prompts("<DETAILED_CAPTION>");
        const textInputs = this.tokenizer(prompts);

        elizaLogger.log("Generating image description");
        const generatedIds = (await this.model.generate({
            ...textInputs,
            ...visionInputs,
            max_new_tokens: 256,
        })) as Tensor;

        const generatedText = this.tokenizer.batch_decode(generatedIds, {
            skip_special_tokens: false,
        })[0];

        const result = this.processor.post_process_generation(
            generatedText,
            "<DETAILED_CAPTION>",
            image.size
        );

        const detailedCaption = result["<DETAILED_CAPTION>"] as string;
        return { title: detailedCaption, description: detailedCaption };
    }
}

export class ImageDescriptionService
    extends Service
    implements IImageDescriptionService
{
    static serviceType: ServiceType = ServiceType.IMAGE_DESCRIPTION;

    private initialized = false;
    private runtime: IAgentRuntime | null = null;
    private provider: ImageProvider | null = null;

    getInstance(): IImageDescriptionService {
        return ImageDescriptionService.getInstance();
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        elizaLogger.log("Initializing ImageDescriptionService");
        this.runtime = runtime;
    }

    private async initializeProvider(): Promise<boolean> {
        if (!this.runtime) {
            throw new Error("Runtime is required for image recognition");
        }

        this.provider = new LocalImageProvider();

        try {
            await this.provider.initialize();
        } catch {
            elizaLogger.error(
                `Failed to initialize the local image vision model provider}`
            );
            return false;
        }
        return true;
    }

    private async loadImageData(
        imageUrlOrPath: string
    ): Promise<{ data: Buffer; mimeType: string }> {
        let loadedImageData: Buffer;
        let loadedMimeType: string;
        const { imageData, mimeType } = await this.fetchImage(imageUrlOrPath);
        const skipConversion =
            mimeType === "image/jpeg" ||
            mimeType === "image/jpg" ||
            mimeType === "image/png";
        if (skipConversion) {
            loadedImageData = imageData;
            loadedMimeType = mimeType;
        } else {
            const converted = await this.convertImageDataToFormat(
                imageData,
                "png"
            );
            loadedImageData = converted.imageData;
            loadedMimeType = converted.mimeType;
        }
        if (!loadedImageData || loadedImageData.length === 0) {
            throw new Error("Failed to fetch image data");
        }
        return { data: loadedImageData, mimeType: loadedMimeType };
    }

    private async convertImageDataToFormat(
        data: Buffer,
        format: keyof FormatEnum | AvailableFormatInfo = "png"
    ): Promise<{ imageData: Buffer; mimeType: string }> {
        const tempFilePath = path.join(
            os.tmpdir(),
            `tmp_img_${Date.now()}.${format}`
        );
        try {
            await sharp(data).toFormat(format).toFile(tempFilePath);
            const { imageData, mimeType } = await this.fetchImage(tempFilePath);
            return {
                imageData,
                mimeType,
            };
        } finally {
            fs.unlinkSync(tempFilePath); // Clean up temp file
        }
    }

    private async fetchImage(
        imageUrlOrPath: string
    ): Promise<{ imageData: Buffer; mimeType: string }> {
        let imageData: Buffer;
        let mimeType: string;
        if (fs.existsSync(imageUrlOrPath)) {
            imageData = fs.readFileSync(imageUrlOrPath);
            const ext = path.extname(imageUrlOrPath).slice(1).toLowerCase();
            mimeType = ext ? `image/${ext}` : "image/jpeg";
        } else {
            const response = await fetch(imageUrlOrPath);
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch image: ${response.statusText}`
                );
            }
            imageData = Buffer.from(await response.arrayBuffer());
            mimeType = response.headers.get("content-type") || "image/jpeg";
        }
        return { imageData, mimeType };
    }

    async describeImage(
        imageUrlOrPath: string
    ): Promise<{ title: string; description: string }> {
        if (!this.initialized) {
            this.initialized = await this.initializeProvider();
        }

        if (this.initialized) {
            try {
                const { data, mimeType } =
                    await this.loadImageData(imageUrlOrPath);
                return await this.provider.describeImage(data, mimeType);
            } catch (error) {
                elizaLogger.error("Error in describeImage:", error);
                throw error;
            }
        }
    }
}

export default ImageDescriptionService;
