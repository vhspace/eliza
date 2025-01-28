import { Anthropic } from '@anthropic-ai/sdk';
import { createFunction, GenerateTextParams, IAgentRuntime } from '@elizaos/core';

// TODO: CONFIGURE THIS
// https://docs.anthropic.com/en/docs/about-claude/models

export const models: Record<
  'SMALL' | 'MEDIUM' | 'LARGE',
  Anthropic.Messages.Model
> = {
  SMALL: 'claude-3-5-haiku-latest',
  MEDIUM: 'claude-3-5-sonnet-latest',
  LARGE: 'claude-3-5-sonnet-latest',
};

const maxTokens = 8192;

export const anthropicGenerateText = createFunction({
  name: 'generate::text',
  handler: async (runtime, params: GenerateTextParams) => {
    const anthropic = new Anthropic(runtime.getSetting('token'));

    const response = await anthropic.messages.create({
      model: models[params.model],
      max_tokens: maxTokens,
      system: params.system,
      stop_sequences: params.stop,
      messages: params.prompt
        ? [
            {
              role: 'assistant',
              content: params.prompt,
            },
          ]
        : [],
    });

    if (response.content[0].type === 'text') {
      return response.content[0].text;
    }

    throw new Error('No response');
  },
});

export default function registerPlugin (runtime: IAgentRuntime  ) {
  runtime.registerFunction(anthropicGenerateText.name, anthropicGenerateText.handler);
}

/*

V1 settings

[ModelProviderName.ANTHROPIC]: {
        endpoint: "https://api.anthropic.com/v1",
        model: {
            [ModelClass.SMALL]: {
                name:
                    settings.SMALL_ANTHROPIC_MODEL || "claude-3-haiku-20240307",
                stop: [],
                maxInputTokens: 200000,
                maxOutputTokens: 4096,
                frequency_penalty: 0.4,
                presence_penalty: 0.4,
                temperature: 0.7,
            },
            [ModelClass.MEDIUM]: {
                name:
                    settings.MEDIUM_ANTHROPIC_MODEL ||
                    "claude-3-5-sonnet-20241022",
                stop: [],
                maxInputTokens: 200000,
                maxOutputTokens: 4096,
                frequency_penalty: 0.4,
                presence_penalty: 0.4,
                temperature: 0.7,
            },

            [ModelClass.LARGE]: {
                name:
                    settings.LARGE_ANTHROPIC_MODEL ||
                    "claude-3-5-sonnet-20241022",
                stop: [],
                maxInputTokens: 200000,
                maxOutputTokens: 4096,
                frequency_penalty: 0.4,
                presence_penalty: 0.4,
                temperature: 0.7,
            },
        },
    },
*/


// embedding code

// if (config.provider === EmbeddingProvider.Ollama) {
//   return await getRemoteEmbedding(input, {
//       model: config.model,
//       endpoint:
//           runtime.character.modelEndpointOverride ||
//           getEndpoint(ModelProviderName.OLLAMA),
//       isOllama: true,
//       dimensions: config.dimensions,
//   });
// }

// if (config.provider == EmbeddingProvider.GaiaNet) {
//   return await getRemoteEmbedding(input, {
//       model: config.model,
//       endpoint:
//           runtime.character.modelEndpointOverride ||
//           getEndpoint(ModelProviderName.GAIANET) ||
//           settings.SMALL_GAIANET_SERVER_URL ||
//           settings.MEDIUM_GAIANET_SERVER_URL ||
//           settings.LARGE_GAIANET_SERVER_URL,
//       apiKey: settings.GAIANET_API_KEY || runtime.token,
//       dimensions: config.dimensions,
//   });
// }

// if (config.provider === EmbeddingProvider.Heurist) {
//   return await getRemoteEmbedding(input, {
//       model: config.model,
//       endpoint: getEndpoint(ModelProviderName.HEURIST),
//       apiKey: runtime.token,
//       dimensions: config.dimensions,
//   });
// }


    // Fallback to remote override
//     return await getRemoteEmbedding(input, {
//       model: config.model,
//       endpoint:
//           runtime.character.modelEndpointOverride ||
//           getEndpoint(runtime.character.modelProvider),
//       apiKey: runtime.token,
//       dimensions: config.dimensions,
//   });



//   interface EmbeddingOptions {
//     model: string;
//     endpoint: string;
//     apiKey?: string;
//     length?: number;
//     isOllama?: boolean;
//     dimensions?: number;
//     provider?: string;
// }

// export const EmbeddingProvider = {
//     OpenAI: "OpenAI",
//     Ollama: "Ollama",
//     GaiaNet: "GaiaNet",
//     Heurist: "Heurist",
//     BGE: "BGE",
// } as const;

// export type EmbeddingProviderType =
//     (typeof EmbeddingProvider)[keyof typeof EmbeddingProvider];

// export type EmbeddingConfig = {
//     readonly dimensions: number;
//     readonly model: string;
//     readonly provider: EmbeddingProviderType;
// };

// export const getEmbeddingConfig = (): EmbeddingConfig => ({
//     dimensions:
//         settings.USE_OPENAI_EMBEDDING?.toLowerCase() === "true"
//             ? getEmbeddingModelSettings(ModelProviderName.OPENAI).dimensions
//             : settings.USE_OLLAMA_EMBEDDING?.toLowerCase() === "true"
//               ? getEmbeddingModelSettings(ModelProviderName.OLLAMA).dimensions
//               : settings.USE_GAIANET_EMBEDDING?.toLowerCase() === "true"
//                 ? getEmbeddingModelSettings(ModelProviderName.GAIANET)
//                       .dimensions
//                 : settings.USE_HEURIST_EMBEDDING?.toLowerCase() === "true"
//                   ? getEmbeddingModelSettings(ModelProviderName.HEURIST)
//                         .dimensions
//                   : 384, // BGE
//     model:
//         settings.USE_OPENAI_EMBEDDING?.toLowerCase() === "true"
//             ? getEmbeddingModelSettings(ModelProviderName.OPENAI).name
//             : settings.USE_OLLAMA_EMBEDDING?.toLowerCase() === "true"
//               ? getEmbeddingModelSettings(ModelProviderName.OLLAMA).name
//               : settings.USE_GAIANET_EMBEDDING?.toLowerCase() === "true"
//                 ? getEmbeddingModelSettings(ModelProviderName.GAIANET).name
//                 : settings.USE_HEURIST_EMBEDDING?.toLowerCase() === "true"
//                   ? getEmbeddingModelSettings(ModelProviderName.HEURIST).name
//                   : "BGE-small-en-v1.5",
//     provider:
//         settings.USE_OPENAI_EMBEDDING?.toLowerCase() === "true"
//             ? "OpenAI"
//             : settings.USE_OLLAMA_EMBEDDING?.toLowerCase() === "true"
//               ? "Ollama"
//               : settings.USE_GAIANET_EMBEDDING?.toLowerCase() === "true"
//                 ? "GaiaNet"
//                 : settings.USE_HEURIST_EMBEDDING?.toLowerCase() === "true"
//                   ? "Heurist"
//                   : "BGE",
// });

// async function getRemoteEmbedding(
//     input: string,
//     options: EmbeddingOptions
// ): Promise<number[]> {
//     // Ensure endpoint ends with /v1 for OpenAI
//     const baseEndpoint = options.endpoint.endsWith("/v1")
//         ? options.endpoint
//         : `${options.endpoint}${options.isOllama ? "/v1" : ""}`;

//     // Construct full URL
//     const fullUrl = `${baseEndpoint}/embeddings`;

//     const requestOptions = {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             ...(options.apiKey
//                 ? {
//                       Authorization: `Bearer ${options.apiKey}`,
//                   }
//                 : {}),
//         },
//         body: JSON.stringify({
//             input,
//             model: options.model,
//             dimensions:
//                 options.dimensions ||
//                 options.length ||
//                 getEmbeddingConfig().dimensions, // Prefer dimensions, fallback to length
//         }),
//     };

//     try {
//         const response = await fetch(fullUrl, requestOptions);

//         if (!response.ok) {
//             elizaLogger.error("API Response:", await response.text()); // Debug log
//             throw new Error(
//                 `Embedding API Error: ${response.status} ${response.statusText}`
//             );
//         }

//         interface EmbeddingResponse {
//             data: Array<{ embedding: number[] }>;
//         }

//         const data: EmbeddingResponse = await response.json();
//         return data?.data?.[0].embedding;
//     } catch (e) {
//         elizaLogger.error("Full error details:", e);
//         throw e;
//     }
// }

// export function getEmbeddingType(runtime: IAgentRuntime): "local" | "remote" {
//     return "local";
// }


// export function getEmbeddingType(runtime: IAgentRuntime): "local" | "remote" {
//   const isNode =
//       typeof process !== "undefined" &&
//       process.versions != null &&
//       process.versions.node != null;

//   // Use local embedding if:
//   // - Running in Node.js
//   // - Not using OpenAI provider
//   // - Not forcing OpenAI embeddings
//   const isLocal =
//       isNode &&
//       runtime.character.modelProvider !== ModelProviderName.OPENAI &&
//       runtime.character.modelProvider !== ModelProviderName.GAIANET &&
//       runtime.character.modelProvider !== ModelProviderName.HEURIST &&
//       !settings.USE_OPENAI_EMBEDDING;

//   return isLocal ? "local" : "remote";
// }

// export function getEmbeddingZeroVector(): number[] {
//   let embeddingDimension = 384; // Default BGE dimension

//   if (settings.USE_OPENAI_EMBEDDING?.toLowerCase() === "true") {
//       embeddingDimension = getEmbeddingModelSettings(
//           ModelProviderName.OPENAI
//       ).dimensions; // OpenAI dimension
//   } else if (settings.USE_OLLAMA_EMBEDDING?.toLowerCase() === "true") {
//       embeddingDimension = getEmbeddingModelSettings(
//           ModelProviderName.OLLAMA
//       ).dimensions; // Ollama mxbai-embed-large dimension
//   } else if (settings.USE_GAIANET_EMBEDDING?.toLowerCase() === "true") {
//       embeddingDimension = getEmbeddingModelSettings(
//           ModelProviderName.GAIANET
//       ).dimensions; // GaiaNet dimension
//   } else if (settings.USE_HEURIST_EMBEDDING?.toLowerCase() === "true") {
//       embeddingDimension = getEmbeddingModelSettings(
//           ModelProviderName.HEURIST
//       ).dimensions; // Heurist dimension
//   }

//   return Array(embeddingDimension).fill(0);
// }


// generate image code from the plugin-node service (probably wrong anyways

// const IMAGE_DESCRIPTION_PROMPT =
//     "Describe this image and give it a title. The first line should be the title, and then a line break, then a detailed description of the image. Respond with the format 'title\\ndescription'";

// Utility functions
// const convertToBase64DataUrl = (
//   imageData: Buffer,
//   mimeType: string
// ): string => {
//   const base64Data = imageData.toString("base64");
//   return `data:${mimeType};base64,${base64Data}`;
// };

// const handleApiError = async (
//   response: Response,
//   provider: string
// ): Promise<never> => {
//   const responseText = await response.text();
//   elizaLogger.error(
//       `${provider} API error:`,
//       response.status,
//       "-",
//       responseText
//   );
//   throw new Error(`HTTP error! status: ${response.status}`);
// };

// const parseImageResponse = (
//   text: string
// ): { title: string; description: string } => {
//   const [title, ...descriptionParts] = text.split("\n");
//   return { title, description: descriptionParts.join("\n") };
// };

// class AnthropicImageProvider implements ImageProvider {
//   constructor(private runtime: IAgentRuntime) {
//   }

//   async initialize(): Promise<void> {
//   }

//   async describeImage(
//       imageData: Buffer,
//       mimeType: string,
//   ): Promise<{ title: string; description: string }> {
//       const endpoint = getEndpoint(ModelProviderName.ANTHROPIC);
//       const apiKey = this.runtime.getSetting("ANTHROPIC_API_KEY");

//       const content = [
//           {type: "text", text: IMAGE_DESCRIPTION_PROMPT},
//           {
//               type: "image",
//               source: {
//                   type: "base64",
//                   media_type: mimeType,
//                   data: imageData.toString("base64"),
//               },
//           },
//       ];

//       const response = await fetch(`${endpoint}/messages`, {
//           method: "POST",
//           headers: {
//               "Content-Type": "application/json",
//               "x-api-key": apiKey,
//               "anthropic-version": "2023-06-01",
//           },
//           body: JSON.stringify(
//               {
//                   model: "claude-3-haiku-20240307",
//                   max_tokens: 1024,
//                   messages: [{role: "user", content}],
//               }),
//       });

//       if (!response.ok) {
//           await handleApiError(response, "Anthropic");
//       }

//       const data = await response.json();
//       return parseImageResponse(data.content[0].text);
//   }
// }

// class OpenAIImageProvider implements ImageProvider {
//   constructor(private runtime: IAgentRuntime) {}

//   async initialize(): Promise<void> {}

//   async describeImage(
//       imageData: Buffer,
//       mimeType: string
//   ): Promise<{ title: string; description: string }> {
//       const imageUrl = convertToBase64DataUrl(imageData, mimeType);

//       const content = [
//           { type: "text", text: IMAGE_DESCRIPTION_PROMPT },
//           { type: "image_url", image_url: { url: imageUrl } },
//       ];

//       const endpoint =
//           this.runtime.imageVisionModelProvider === ModelProviderName.OPENAI
//               ? getEndpoint(this.runtime.imageVisionModelProvider)
//               : "https://api.openai.com/v1";

//       const response = await fetch(endpoint + "/chat/completions", {
//           method: "POST",
//           headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${this.runtime.getSetting("OPENAI_API_KEY")}`,
//           },
//           body: JSON.stringify({
//               model: "gpt-4o-mini",
//               messages: [{ role: "user", content }],
//               max_tokens: 500,
//           }),
//       });

//       if (!response.ok) {
//           await handleApiError(response, "OpenAI");
//       }

//       const data = await response.json();
//       return parseImageResponse(data.choices[0].message.content);
//   }
// }

// class GroqImageProvider implements ImageProvider {
//   constructor(private runtime: IAgentRuntime) {}

//   async initialize(): Promise<void> {}

//   async describeImage(
//       imageData: Buffer,
//       mimeType: string
//   ): Promise<{ title: string; description: string }> {
//       const imageUrl = convertToBase64DataUrl(imageData, mimeType);

//       const content = [
//           { type: "text", text: IMAGE_DESCRIPTION_PROMPT },
//           { type: "image_url", image_url: { url: imageUrl } },
//       ];

//       const endpoint =
//           this.runtime.imageVisionModelProvider === ModelProviderName.GROQ
//               ? getEndpoint(this.runtime.imageVisionModelProvider)
//               : "https://api.groq.com/openai/v1/";

//       const response = await fetch(endpoint + "/chat/completions", {
//           method: "POST",
//           headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${this.runtime.getSetting("GROQ_API_KEY")}`,
//           },
//           body: JSON.stringify({
//               model: /*this.runtime.imageVisionModelName ||*/ "llama-3.2-90b-vision-preview",
//               messages: [{ role: "user", content }],
//               max_tokens: 1024,
//           }),
//       });

//       if (!response.ok) {
//           await handleApiError(response, "Groq");
//       }

//       const data = await response.json();
//       return parseImageResponse(data.choices[0].message.content);
//   }
// }

// class GoogleImageProvider implements ImageProvider {
//   constructor(private runtime: IAgentRuntime) {}

//   async initialize(): Promise<void> {}

//   async describeImage(
//       imageData: Buffer,
//       mimeType: string
//   ): Promise<{ title: string; description: string }> {
//       const endpoint = getEndpoint(ModelProviderName.GOOGLE);
//       const apiKey = this.runtime.getSetting("GOOGLE_GENERATIVE_AI_API_KEY");

//       const response = await fetch(
//           `${endpoint}/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
//           {
//               method: "POST",
//               headers: {
//                   "Content-Type": "application/json",
//               },
//               body: JSON.stringify({
//                   contents: [
//                       {
//                           parts: [
//                               { text: IMAGE_DESCRIPTION_PROMPT },
//                               {
//                                   inline_data: {
//                                       mime_type: mimeType,
//                                       data: imageData.toString("base64"),
//                                   },
//                               },
//                           ],
//                       },
//                   ],
//               }),
//           }
//       );

//       if (!response.ok) {
//           await handleApiError(response, "Google Gemini");
//       }

//       const data = await response.json();
//       return parseImageResponse(data.candidates[0].content.parts[0].text);
//   }
// }

        // const availableModels = [
        //     ModelProviderName.LLAMALOCAL,
        //     ModelProviderName.ANTHROPIC,
        //     ModelProviderName.GOOGLE,
        //     ModelProviderName.OPENAI,
        //     ModelProviderName.GROQ,
        // ].join(", ");

        // const model = models[this.runtime?.character?.modelProvider];

        // if (this.runtime.imageVisionModelProvider) {
        //     if (
        //         this.runtime.imageVisionModelProvider ===
        //         ModelProviderName.LLAMALOCAL ||
        //         this.runtime.imageVisionModelProvider ===
        //         ModelProviderName.OLLAMA
        //     ) {
        //         this.provider = new LocalImageProvider();
        //         elizaLogger.debug("Using local provider for vision model");
        //     } else if (
        //         this.runtime.imageVisionModelProvider ===
        //         ModelProviderName.ANTHROPIC
        //     ) {
        //         this.provider = new AnthropicImageProvider(this.runtime);
        //         elizaLogger.debug("Using anthropic for vision model");
        //     } else if (
        //         this.runtime.imageVisionModelProvider ===
        //         ModelProviderName.GOOGLE
        //     ) {
        //         this.provider = new GoogleImageProvider(this.runtime);
        //         elizaLogger.debug("Using google for vision model");
        //     } else if (
        //         this.runtime.imageVisionModelProvider ===
        //         ModelProviderName.OPENAI
        //     ) {
        //         this.provider = new OpenAIImageProvider(this.runtime);
        //         elizaLogger.debug("Using openai for vision model");
        //     } else if (
        //         this.runtime.imageVisionModelProvider === ModelProviderName.GROQ
        //     ) {
        //         this.provider = new GroqImageProvider(this.runtime);
        //         elizaLogger.debug("Using Groq for vision model");
        //     } else {
        //         elizaLogger.warn(
        //             `Unsupported image vision model provider: ${this.runtime.imageVisionModelProvider}. ` +
        //             `Please use one of the following: ${availableModels}. ` +
        //             `Update the 'imageVisionModelProvider' field in the character file.`
        //         );
        //         return false;
        //     }
        // } else if (
        //     model === models[ModelProviderName.LLAMALOCAL] ||
        //     model === models[ModelProviderName.OLLAMA]
        // ) {
        //     elizaLogger.debug("Using local provider for vision model");
        // } else if (model === models[ModelProviderName.ANTHROPIC]) {
        //     this.provider = new AnthropicImageProvider(this.runtime);
        //     elizaLogger.debug("Using anthropic for vision model");
        // } else if (model === models[ModelProviderName.GOOGLE]) {
        //     this.provider = new GoogleImageProvider(this.runtime);
        //     elizaLogger.debug("Using google for vision model");
        // } else if (model === models[ModelProviderName.GROQ]) {
        //     this.provider = new GroqImageProvider(this.runtime);
        //     elizaLogger.debug("Using groq for vision model");
        // } else {
        //     elizaLogger.debug("Using default openai for vision model");
        //     this.provider = new OpenAIImageProvider(this.runtime);
        // })




// old generateImage code

// const modelSettings = getImageModelSettings(runtime.imageModelProvider);
// const model = modelSettings.name;
// elizaLogger.info("Generating image with options:", {
//     imageModelProvider: model,
// });

// const apiKey =
//     runtime.imageModelProvider === runtime.modelProvider
//         ? runtime.token
//         : (() => {
//               // First try to match the specific provider
//               switch (runtime.imageModelProvider) {
//                   case ModelProviderName.HEURIST:
//                       return runtime.getSetting("HEURIST_API_KEY");
//                   case ModelProviderName.TOGETHER:
//                       return runtime.getSetting("TOGETHER_API_KEY");
//                   case ModelProviderName.FAL:
//                       return runtime.getSetting("FAL_API_KEY");
//                   case ModelProviderName.OPENAI:
//                       return runtime.getSetting("OPENAI_API_KEY");
//                   case ModelProviderName.VENICE:
//                       return runtime.getSetting("VENICE_API_KEY");
//                   case ModelProviderName.LIVEPEER:
//                       return runtime.getSetting("LIVEPEER_GATEWAY_URL");
//                   default:
//                       // If no specific match, try the fallback chain
//                       return (
//                           runtime.getSetting("HEURIST_API_KEY") ??
//                           runtime.getSetting("NINETEEN_AI_API_KEY") ??
//                           runtime.getSetting("TOGETHER_API_KEY") ??
//                           runtime.getSetting("FAL_API_KEY") ??
//                           runtime.getSetting("OPENAI_API_KEY") ??
//                           runtime.getSetting("VENICE_API_KEY") ??
//                           runtime.getSetting("LIVEPEER_GATEWAY_URL")
//                       );
//               }
//           })();
// try {
//     if (runtime.imageModelProvider === ModelProviderName.HEURIST) {
//         const response = await fetch(
//             "http://sequencer.heurist.xyz/submit_job",
//             {
//                 method: "POST",
//                 headers: {
//                     Authorization: `Bearer ${apiKey}`,
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({
//                     job_id: data.jobId || crypto.randomUUID(),
//                     model_input: {
//                         SD: {
//                             prompt: data.prompt,
//                             neg_prompt: data.negativePrompt,
//                             num_iterations: data.numIterations || 20,
//                             width: data.width || 512,
//                             height: data.height || 512,
//                             guidance_scale: data.guidanceScale || 3,
//                             seed: data.seed || -1,
//                         },
//                     },
//                     model_id: model,
//                     deadline: 60,
//                     priority: 1,
//                 }),
//             }
//         );

//         if (!response.ok) {
//             throw new Error(
//                 `Heurist image generation failed: ${response.statusText}`
//             );
//         }

//         const imageURL = await response.json();
//         return { success: true, data: [imageURL] };
//     } else if (
//         runtime.imageModelProvider === ModelProviderName.TOGETHER ||
//         // for backwards compat
//         runtime.imageModelProvider === ModelProviderName.LLAMACLOUD
//     ) {
//         const together = new Together({ apiKey: apiKey as string });
//         const response = await together.images.create({
//             model: model,
//             prompt: data.prompt,
//             width: data.width,
//             height: data.height,
//             steps: modelSettings?.steps ?? 4,
//             n: data.count,
//         });

//         // Add type assertion to handle the response properly
//         const togetherResponse =
//             response as unknown as TogetherAIImageResponse;

//         if (
//             !togetherResponse.data ||
//             !Array.isArray(togetherResponse.data)
//         ) {
//             throw new Error("Invalid response format from Together AI");
//         }

//         // Rest of the code remains the same...
//         const base64s = await Promise.all(
//             togetherResponse.data.map(async (image) => {
//                 if (!image.url) {
//                     elizaLogger.error("Missing URL in image data:", image);
//                     throw new Error("Missing URL in Together AI response");
//                 }

//                 // Fetch the image from the URL
//                 const imageResponse = await fetch(image.url);
//                 if (!imageResponse.ok) {
//                     throw new Error(
//                         `Failed to fetch image: ${imageResponse.statusText}`
//                     );
//                 }

//                 // Convert to blob and then to base64
//                 const blob = await imageResponse.blob();
//                 const arrayBuffer = await blob.arrayBuffer();
//                 const base64 = Buffer.from(arrayBuffer).toString("base64");

//                 // Return with proper MIME type
//                 return `data:image/jpeg;base64,${base64}`;
//             })
//         );

//         if (base64s.length === 0) {
//             throw new Error("No images generated by Together AI");
//         }

//         elizaLogger.debug(`Generated ${base64s.length} images`);
//         return { success: true, data: base64s };
//     } else if (runtime.imageModelProvider === ModelProviderName.FAL) {
//         fal.config({
//             credentials: apiKey as string,
//         });

//         // Prepare the input parameters according to their schema
//         const input = {
//             prompt: data.prompt,
//             image_size: "square" as const,
//             num_inference_steps: modelSettings?.steps ?? 50,
//             guidance_scale: data.guidanceScale || 3.5,
//             num_images: data.count,
//             enable_safety_checker:
//                 runtime.getSetting("FAL_AI_ENABLE_SAFETY_CHECKER") ===
//                 "true",
//             safety_tolerance: Number(
//                 runtime.getSetting("FAL_AI_SAFETY_TOLERANCE") || "2"
//             ),
//             output_format: "png" as const,
//             seed: data.seed ?? 6252023,
//             ...(runtime.getSetting("FAL_AI_LORA_PATH")
//                 ? {
//                       loras: [
//                           {
//                               path: runtime.getSetting("FAL_AI_LORA_PATH"),
//                               scale: 1,
//                           },
//                       ],
//                   }
//                 : {}),
//         };

//         // Subscribe to the model
//         const result = await fal.subscribe(model, {
//             input,
//             logs: true,
//             onQueueUpdate: (update) => {
//                 if (update.status === "IN_PROGRESS") {
//                     elizaLogger.info(update.logs.map((log) => log.message));
//                 }
//             },
//         });
//         // Convert the returned image URLs to base64 to match existing functionality
//         const base64Promises = result.data.images.map(async (image) => {
//             const response = await fetch(image.url);
//             const blob = await response.blob();
//             const buffer = await blob.arrayBuffer();
//             const base64 = Buffer.from(buffer).toString("base64");
//             return `data:${image.content_type};base64,${base64}`;
//         });

//         const base64s = await Promise.all(base64Promises);
//         return { success: true, data: base64s };
//     } else if (runtime.imageModelProvider === ModelProviderName.VENICE) {
//         const response = await fetch(
//             "https://api.venice.ai/api/v1/image/generate",
//             {
//                 method: "POST",
//                 headers: {
//                     Authorization: `Bearer ${apiKey}`,
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({
//                     model: model,
//                     prompt: data.prompt,
//                     cfg_scale: data.guidanceScale,
//                     negative_prompt: data.negativePrompt,
//                     width: data.width,
//                     height: data.height,
//                     steps: data.numIterations,
//                     safe_mode: data.safeMode,
//                     seed: data.seed,
//                     style_preset: data.stylePreset,
//                     hide_watermark: data.hideWatermark,
//                 }),
//             }
//         );

//         const result = await response.json();

//         if (!result.images || !Array.isArray(result.images)) {
//             throw new Error("Invalid response format from Venice AI");
//         }

//         const base64s = result.images.map((base64String) => {
//             if (!base64String) {
//                 throw new Error(
//                     "Empty base64 string in Venice AI response"
//                 );
//             }
//             return `data:image/png;base64,${base64String}`;
//         });

//         return { success: true, data: base64s };
//     } else if (
//         runtime.imageModelProvider === ModelProviderName.NINETEEN_AI
//     ) {
//         const response = await fetch(
//             "https://api.nineteen.ai/v1/text-to-image",
//             {
//                 method: "POST",
//                 headers: {
//                     Authorization: `Bearer ${apiKey}`,
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({
//                     model: model,
//                     prompt: data.prompt,
//                     negative_prompt: data.negativePrompt,
//                     width: data.width,
//                     height: data.height,
//                     steps: data.numIterations,
//                     cfg_scale: data.guidanceScale || 3,
//                 }),
//             }
//         );

//         const result = await response.json();

//         if (!result.images || !Array.isArray(result.images)) {
//             throw new Error("Invalid response format from Nineteen AI");
//         }

//         const base64s = result.images.map((base64String) => {
//             if (!base64String) {
//                 throw new Error(
//                     "Empty base64 string in Nineteen AI response"
//                 );
//             }
//             return `data:image/png;base64,${base64String}`;
//         });

//         return { success: true, data: base64s };
//     } else if (runtime.imageModelProvider === ModelProviderName.LIVEPEER) {
//         if (!apiKey) {
//             throw new Error("Livepeer Gateway is not defined");
//         }
//         try {
//             const baseUrl = new URL(apiKey);
//             if (!baseUrl.protocol.startsWith("http")) {
//                 throw new Error("Invalid Livepeer Gateway URL protocol");
//             }

//             const response = await fetch(
//                 `${baseUrl.toString()}text-to-image`,
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json",
//                         Authorization: "Bearer eliza-app-img",
//                     },
//                     body: JSON.stringify({
//                         model_id:
//                             data.modelId || "ByteDance/SDXL-Lightning",
//                         prompt: data.prompt,
//                         width: data.width || 1024,
//                         height: data.height || 1024,
//                     }),
//                 }
//             );
//             const result = await response.json();
//             if (!result.images?.length) {
//                 throw new Error("No images generated");
//             }
//             const base64Images = await Promise.all(
//                 result.images.map(async (image) => {
//                     console.log("imageUrl console log", image.url);
//                     let imageUrl;
//                     if (image.url.includes("http")) {
//                         imageUrl = image.url;
//                     } else {
//                         imageUrl = `${apiKey}${image.url}`;
//                     }
//                     const imageResponse = await fetch(imageUrl);
//                     if (!imageResponse.ok) {
//                         throw new Error(
//                             `Failed to fetch image: ${imageResponse.statusText}`
//                         );
//                     }
//                     const blob = await imageResponse.blob();
//                     const arrayBuffer = await blob.arrayBuffer();
//                     const base64 =
//                         Buffer.from(arrayBuffer).toString("base64");
//                     return `data:image/jpeg;base64,${base64}`;
//                 })
//             );
//             return {
//                 success: true,
//                 data: base64Images,
//             };
//         } catch (error) {
//             console.error(error);
//             return { success: false, error: error };
//         }
//     } else {
//         let targetSize = `${data.width}x${data.height}`;
//         if (
//             targetSize !== "1024x1024" &&
//             targetSize !== "1792x1024" &&
//             targetSize !== "1024x1792"
//         ) {
//             targetSize = "1024x1024";
//         }
//         const openaiApiKey = runtime.getSetting("OPENAI_API_KEY") as string;
//         if (!openaiApiKey) {
//             throw new Error("OPENAI_API_KEY is not set");
//         }
//         const openai = new OpenAI({
//             apiKey: openaiApiKey as string,
//         });
//         const response = await openai.images.generate({
//             model,
//             prompt: data.prompt,
//             size: targetSize as "1024x1024" | "1792x1024" | "1024x1792",
//             n: data.count,
//             response_format: "b64_json",
//         });
//         const base64s = response.data.map(
//             (image) => `data:image/png;base64,${image.b64_json}`
//         );
//         return { success: true, data: base64s };
//     }
// } catch (error) {
//     console.error(error);
//     return { success: false, error: error };
// }
 
// old generateText code

// const provider = runtime.modelProvider;
// elizaLogger.debug("Provider settings:", {
//     provider,
//     hasRuntime: !!runtime,
//     runtimeSettings: {
//         CLOUDFLARE_GW_ENABLED: runtime.getSetting("CLOUDFLARE_GW_ENABLED"),
//         CLOUDFLARE_AI_ACCOUNT_ID: runtime.getSetting(
//             "CLOUDFLARE_AI_ACCOUNT_ID"
//         ),
//         CLOUDFLARE_AI_GATEWAY_ID: runtime.getSetting(
//             "CLOUDFLARE_AI_GATEWAY_ID"
//         ),
//     },
// });

// const endpoint =
//     runtime.character.modelEndpointOverride || getEndpoint(provider);
// const modelSettings = getModelSettings(runtime.modelProvider, modelClass);
// let model = modelSettings.name;

// // allow character.json settings => secrets to override models
// // FIXME: add MODEL_MEDIUM support
// switch (provider) {
//     // if runtime.getSetting("LLAMACLOUD_MODEL_LARGE") is true and modelProvider is LLAMACLOUD, then use the large model
//     case ModelProviderName.LLAMACLOUD:
//         {
//             switch (modelClass) {
//                 case ModelClass.LARGE:
//                     {
//                         model =
//                             runtime.getSetting("LLAMACLOUD_MODEL_LARGE") ||
//                             model;
//                     }
//                     break;
//                 case ModelClass.SMALL:
//                     {
//                         model =
//                             runtime.getSetting("LLAMACLOUD_MODEL_SMALL") ||
//                             model;
//                     }
//                     break;
//             }
//         }
//         break;
//     case ModelProviderName.TOGETHER:
//         {
//             switch (modelClass) {
//                 case ModelClass.LARGE:
//                     {
//                         model =
//                             runtime.getSetting("TOGETHER_MODEL_LARGE") ||
//                             model;
//                     }
//                     break;
//                 case ModelClass.SMALL:
//                     {
//                         model =
//                             runtime.getSetting("TOGETHER_MODEL_SMALL") ||
//                             model;
//                     }
//                     break;
//             }
//         }
//         break;
//     case ModelProviderName.OPENROUTER:
//         {
//             switch (modelClass) {
//                 case ModelClass.LARGE:
//                     {
//                         model =
//                             runtime.getSetting("LARGE_OPENROUTER_MODEL") ||
//                             model;
//                     }
//                     break;
//                 case ModelClass.SMALL:
//                     {
//                         model =
//                             runtime.getSetting("SMALL_OPENROUTER_MODEL") ||
//                             model;
//                     }
//                     break;
//             }
//         }
//         break;
// }

// elizaLogger.info("Selected model:", model);

// const modelConfiguration = runtime.character?.settings?.modelConfig;
// const temperature =
//     modelConfiguration?.temperature || modelSettings.temperature;
// const frequency_penalty =
//     modelConfiguration?.frequency_penalty ||
//     modelSettings.frequency_penalty;
// const presence_penalty =
//     modelConfiguration?.presence_penalty || modelSettings.presence_penalty;
// const max_context_length =
//     modelConfiguration?.maxInputTokens || modelSettings.maxInputTokens;
// const max_response_length =
//     modelConfiguration?.max_response_length ||
//     modelSettings.maxOutputTokens;
// const experimental_telemetry =
//     modelConfiguration?.experimental_telemetry ||
//     modelSettings.experimental_telemetry;

// const apiKey = runtime.token;

// try {
//     elizaLogger.debug(
//         `Trimming context to max length of ${max_context_length} tokens.`
//     );

//     context = await trimTokens(context, max_context_length, runtime);

//     let response: string;

//     const _stop = stop || modelSettings.stop;
//     elizaLogger.debug(
//         `Using provider: ${provider}, model: ${model}, temperature: ${temperature}, max response length: ${max_response_length}`
//     );

//     switch (provider) {
//         // OPENAI & LLAMACLOUD shared same structure.
//         case ModelProviderName.OPENAI:
//         case ModelProviderName.ALI_BAILIAN:
//         case ModelProviderName.VOLENGINE:
//         case ModelProviderName.LLAMACLOUD:
//         case ModelProviderName.NANOGPT:
//         case ModelProviderName.HYPERBOLIC:
//         case ModelProviderName.TOGETHER:
//         case ModelProviderName.NINETEEN_AI:
//         case ModelProviderName.AKASH_CHAT_API: {
//             elizaLogger.debug(
//                 "Initializing OpenAI model with Cloudflare check"
//             );
//             const baseURL =
//                 getCloudflareGatewayBaseURL(runtime, "openai") || endpoint;

//             //elizaLogger.debug("OpenAI baseURL result:", { baseURL });
//             const openai = createOpenAI({
//                 apiKey,
//                 baseURL,
//                 fetch: runtime.fetch,
//             });

//             const { text: openaiResponse } = await aiGenerateText({
//                 model: openai.languageModel(model),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps: maxSteps,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = openaiResponse;
//             console.log("Received response from OpenAI model.");
//             break;
//         }

//         case ModelProviderName.ETERNALAI: {
//             elizaLogger.debug("Initializing EternalAI model.");
//             const openai = createOpenAI({
//                 apiKey,
//                 baseURL: endpoint,
//                 fetch: async (
//                     input: RequestInfo | URL,
//                     init?: RequestInit
//                 ): Promise<Response> => {
//                     const url =
//                         typeof input === "string"
//                             ? input
//                             : input.toString();
//                     const chain_id =
//                         runtime.getSetting("ETERNALAI_CHAIN_ID") || "45762";

//                     const options: RequestInit = { ...init };
//                     if (options?.body) {
//                         const body = JSON.parse(options.body as string);
//                         body.chain_id = chain_id;
//                         options.body = JSON.stringify(body);
//                     }

//                     const fetching = await runtime.fetch(url, options);

//                     if (
//                         parseBooleanFromText(
//                             runtime.getSetting("ETERNALAI_LOG")
//                         )
//                     ) {
//                         elizaLogger.info(
//                             "Request data: ",
//                             JSON.stringify(options, null, 2)
//                         );
//                         const clonedResponse = fetching.clone();
//                         try {
//                             clonedResponse.json().then((data) => {
//                                 elizaLogger.info(
//                                     "Response data: ",
//                                     JSON.stringify(data, null, 2)
//                                 );
//                             });
//                         } catch (e) {
//                             elizaLogger.debug(e);
//                         }
//                     }
//                     return fetching;
//                 },
//             });

//             let system_prompt =
//                 runtime.character.system ??
//                 settings.SYSTEM_PROMPT ??
//                 undefined;
//             try {
//                 const on_chain_system_prompt =
//                     await getOnChainEternalAISystemPrompt(runtime);
//                 if (!on_chain_system_prompt) {
//                     elizaLogger.error(
//                         new Error("invalid on_chain_system_prompt")
//                     );
//                 } else {
//                     system_prompt = on_chain_system_prompt;
//                     elizaLogger.info(
//                         "new on-chain system prompt",
//                         system_prompt
//                     );
//                 }
//             } catch (e) {
//                 elizaLogger.error(e);
//             }

//             const { text: openaiResponse } = await aiGenerateText({
//                 model: openai.languageModel(model),
//                 prompt: context,
//                 system: system_prompt,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//             });

//             response = openaiResponse;
//             elizaLogger.debug("Received response from EternalAI model.");
//             break;
//         }

//         case ModelProviderName.GOOGLE: {
//             const google = createGoogleGenerativeAI({
//                 apiKey,
//                 fetch: runtime.fetch,
//             });

//             const { text: googleResponse } = await aiGenerateText({
//                 model: google(model),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps: maxSteps,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = googleResponse;
//             elizaLogger.debug("Received response from Google model.");
//             break;
//         }

//         case ModelProviderName.MISTRAL: {
//             const mistral = createMistral();

//             const { text: mistralResponse } = await aiGenerateText({
//                 model: mistral(model),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//             });

//             response = mistralResponse;
//             elizaLogger.debug("Received response from Mistral model.");
//             break;
//         }

//         case ModelProviderName.ANTHROPIC: {
//             elizaLogger.debug(
//                 "Initializing Anthropic model with Cloudflare check"
//             );
//             const baseURL =
//                 getCloudflareGatewayBaseURL(runtime, "anthropic") ||
//                 "https://api.anthropic.com/v1";
//             elizaLogger.debug("Anthropic baseURL result:", { baseURL });

//             const anthropic = createAnthropic({
//                 apiKey,
//                 baseURL,
//                 fetch: runtime.fetch,
//             });
//             const { text: anthropicResponse } = await aiGenerateText({
//                 model: anthropic.languageModel(model),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps: maxSteps,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = anthropicResponse;
//             elizaLogger.debug("Received response from Anthropic model.");
//             break;
//         }

//         case ModelProviderName.CLAUDE_VERTEX: {
//             elizaLogger.debug("Initializing Claude Vertex model.");

//             const anthropic = createAnthropic({
//                 apiKey,
//                 fetch: runtime.fetch,
//             });

//             const { text: anthropicResponse } = await aiGenerateText({
//                 model: anthropic.languageModel(model),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps: maxSteps,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = anthropicResponse;
//             elizaLogger.debug(
//                 "Received response from Claude Vertex model."
//             );
//             break;
//         }

//         case ModelProviderName.GROK: {
//             elizaLogger.debug("Initializing Grok model.");
//             const grok = createOpenAI({
//                 apiKey,
//                 baseURL: endpoint,
//                 fetch: runtime.fetch,
//             });

//             const { text: grokResponse } = await aiGenerateText({
//                 model: grok.languageModel(model, {
//                     parallelToolCalls: false,
//                 }),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps: maxSteps,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = grokResponse;
//             elizaLogger.debug("Received response from Grok model.");
//             break;
//         }

//         case ModelProviderName.GROQ: {
//             elizaLogger.debug(
//                 "Initializing Groq model with Cloudflare check"
//             );
//             const baseURL = getCloudflareGatewayBaseURL(runtime, "groq");
//             elizaLogger.debug("Groq baseURL result:", { baseURL });
//             const groq = createGroq({
//                 apiKey,
//                 fetch: runtime.fetch,
//                 baseURL,
//             });

//             const { text: groqResponse } = await aiGenerateText({
//                 model: groq.languageModel(model),
//                 prompt: context,
//                 temperature,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry,
//             });

//             response = groqResponse;
//             elizaLogger.debug("Received response from Groq model.");
//             break;
//         }

//         case ModelProviderName.LLAMALOCAL: {
//             elizaLogger.debug(
//                 "Using local Llama model for text completion."
//             );
//             const textGenerationService =
//                 runtime.getService<ITextGenerationService>(
//                     ServiceType.TEXT_GENERATION
//                 );

//             if (!textGenerationService) {
//                 throw new Error("Text generation service not found");
//             }

//             response = await textGenerationService.queueTextCompletion(
//                 context,
//                 temperature,
//                 _stop,
//                 frequency_penalty,
//                 presence_penalty,
//                 max_response_length
//             );
//             elizaLogger.debug("Received response from local Llama model.");
//             break;
//         }

//         case ModelProviderName.REDPILL: {
//             elizaLogger.debug("Initializing RedPill model.");
//             const serverUrl = getEndpoint(provider);
//             const openai = createOpenAI({
//                 apiKey,
//                 baseURL: serverUrl,
//                 fetch: runtime.fetch,
//             });

//             const { text: redpillResponse } = await aiGenerateText({
//                 model: openai.languageModel(model),
//                 prompt: context,
//                 temperature: temperature,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps: maxSteps,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = redpillResponse;
//             elizaLogger.debug("Received response from redpill model.");
//             break;
//         }

//         case ModelProviderName.OPENROUTER: {
//             elizaLogger.debug("Initializing OpenRouter model.");
//             const serverUrl = getEndpoint(provider);
//             const openrouter = createOpenAI({
//                 apiKey,
//                 baseURL: serverUrl,
//                 fetch: runtime.fetch,
//             });

//             const { text: openrouterResponse } = await aiGenerateText({
//                 model: openrouter.languageModel(model),
//                 prompt: context,
//                 temperature: temperature,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps: maxSteps,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = openrouterResponse;
//             elizaLogger.debug("Received response from OpenRouter model.");
//             break;
//         }

//         case ModelProviderName.OLLAMA:
//             {
//                 elizaLogger.debug("Initializing Ollama model.");

//                 const ollamaProvider = createOllama({
//                     baseURL: getEndpoint(provider) + "/api",
//                     fetch: runtime.fetch,
//                 });
//                 const ollama = ollamaProvider(model);

//                 elizaLogger.debug("****** MODEL\n", model);

//                 const { text: ollamaResponse } = await aiGenerateText({
//                     model: ollama,
//                     prompt: context,
//                     tools: tools,
//                     onStepFinish: onStepFinish,
//                     temperature: temperature,
//                     maxSteps: maxSteps,
//                     maxTokens: max_response_length,
//                     frequencyPenalty: frequency_penalty,
//                     presencePenalty: presence_penalty,
//                     experimental_telemetry: experimental_telemetry,
//                 });

//                 response = ollamaResponse;
//             }
//             elizaLogger.debug("Received response from Ollama model.");
//             break;

//         case ModelProviderName.HEURIST: {
//             elizaLogger.debug("Initializing Heurist model.");
//             const heurist = createOpenAI({
//                 apiKey: apiKey,
//                 baseURL: endpoint,
//                 fetch: runtime.fetch,
//             });

//             const { text: heuristResponse } = await aiGenerateText({
//                 model: heurist.languageModel(model),
//                 prompt: context,
//                 system:
//                     customSystemPrompt ??
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 maxSteps: maxSteps,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = heuristResponse;
//             elizaLogger.debug("Received response from Heurist model.");
//             break;
//         }
//         case ModelProviderName.GAIANET: {
//             elizaLogger.debug("Initializing GAIANET model.");

//             var baseURL = getEndpoint(provider);
//             if (!baseURL) {
//                 switch (modelClass) {
//                     case ModelClass.SMALL:
//                         baseURL =
//                             settings.SMALL_GAIANET_SERVER_URL ||
//                             "https://llama3b.gaia.domains/v1";
//                         break;
//                     case ModelClass.MEDIUM:
//                         baseURL =
//                             settings.MEDIUM_GAIANET_SERVER_URL ||
//                             "https://llama8b.gaia.domains/v1";
//                         break;
//                     case ModelClass.LARGE:
//                         baseURL =
//                             settings.LARGE_GAIANET_SERVER_URL ||
//                             "https://qwen72b.gaia.domains/v1";
//                         break;
//                 }
//             }

//             elizaLogger.debug("Using GAIANET model with baseURL:", baseURL);

//             const openai = createOpenAI({
//                 apiKey,
//                 baseURL: endpoint,
//                 fetch: runtime.fetch,
//             });

//             const { text: openaiResponse } = await aiGenerateText({
//                 model: openai.languageModel(model),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps: maxSteps,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = openaiResponse;
//             elizaLogger.debug("Received response from GAIANET model.");
//             break;
//         }

//         case ModelProviderName.ATOMA: {
//             elizaLogger.debug("Initializing Atoma model.");
//             const atoma = createOpenAI({
//                 apiKey,
//                 baseURL: endpoint,
//                 fetch: runtime.fetch,
//             });

//             const { text: atomaResponse } = await aiGenerateText({
//                 model: atoma.languageModel(model),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps: maxSteps,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = atomaResponse;
//             elizaLogger.debug("Received response from Atoma model.");
//             break;
//         }

//         case ModelProviderName.GALADRIEL: {
//             elizaLogger.debug("Initializing Galadriel model.");
//             const headers = {};
//             const fineTuneApiKey = runtime.getSetting(
//                 "GALADRIEL_FINE_TUNE_API_KEY"
//             );
//             if (fineTuneApiKey) {
//                 headers["Fine-Tune-Authentication"] = fineTuneApiKey;
//             }
//             const galadriel = createOpenAI({
//                 headers,
//                 apiKey: apiKey,
//                 baseURL: endpoint,
//                 fetch: runtime.fetch,
//             });

//             const { text: galadrielResponse } = await aiGenerateText({
//                 model: galadriel.languageModel(model),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps: maxSteps,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = galadrielResponse;
//             elizaLogger.debug("Received response from Galadriel model.");
//             break;
//         }

//         case ModelProviderName.INFERA: {
//             elizaLogger.debug("Initializing Infera model.");

//             const apiKey = settings.INFERA_API_KEY || runtime.token;

//             const infera = createOpenAI({
//                 apiKey,
//                 baseURL: endpoint,
//                 headers: {
//                     api_key: apiKey,
//                     "Content-Type": "application/json",
//                 },
//             });

//             const { text: inferaResponse } = await aiGenerateText({
//                 model: infera.languageModel(model),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 temperature: temperature,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//             });
//             response = inferaResponse;
//             elizaLogger.debug("Received response from Infera model.");
//             break;
//         }

//         case ModelProviderName.VENICE: {
//             elizaLogger.debug("Initializing Venice model.");
//             const venice = createOpenAI({
//                 apiKey: apiKey,
//                 baseURL: endpoint,
//             });

//             const { text: veniceResponse } = await aiGenerateText({
//                 model: venice.languageModel(model),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 temperature: temperature,
//                 maxSteps: maxSteps,
//                 maxTokens: max_response_length,
//             });

//             response = veniceResponse;
//             elizaLogger.debug("Received response from Venice model.");
//             break;
//         }

//         case ModelProviderName.NVIDIA: {
//             elizaLogger.debug("Initializing NVIDIA model.");
//             const nvidia = createOpenAI({
//                 apiKey: apiKey,
//                 baseURL: endpoint,
//             });

//             const { text: nvidiaResponse } = await aiGenerateText({
//                 model: nvidia.languageModel(model),
//                 prompt: context,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 temperature: temperature,
//                 maxSteps: maxSteps,
//                 maxTokens: max_response_length,
//             });

//             response = nvidiaResponse;
//             elizaLogger.debug("Received response from NVIDIA model.");
//             break;
//         }

//         case ModelProviderName.DEEPSEEK: {
//             elizaLogger.debug("Initializing Deepseek model.");
//             const serverUrl = models[provider].endpoint;
//             const deepseek = createOpenAI({
//                 apiKey,
//                 baseURL: serverUrl,
//                 fetch: runtime.fetch,
//             });

//             const { text: deepseekResponse } = await aiGenerateText({
//                 model: deepseek.languageModel(model),
//                 prompt: context,
//                 temperature: temperature,
//                 system:
//                     runtime.character.system ??
//                     settings.SYSTEM_PROMPT ??
//                     undefined,
//                 tools: tools,
//                 onStepFinish: onStepFinish,
//                 maxSteps: maxSteps,
//                 maxTokens: max_response_length,
//                 frequencyPenalty: frequency_penalty,
//                 presencePenalty: presence_penalty,
//                 experimental_telemetry: experimental_telemetry,
//             });

//             response = deepseekResponse;
//             elizaLogger.debug("Received response from Deepseek model.");
//             break;
//         }

//         case ModelProviderName.LIVEPEER: {
//             elizaLogger.debug("Initializing Livepeer model.");

//             if (!endpoint) {
//                 throw new Error("Livepeer Gateway URL is not defined");
//             }

//             const requestBody = {
//                 model: model,
//                 messages: [
//                     {
//                         role: "system",
//                         content:
//                             runtime.character.system ??
//                             settings.SYSTEM_PROMPT ??
//                             "You are a helpful assistant",
//                     },
//                     {
//                         role: "user",
//                         content: context,
//                     },
//                 ],
//                 max_tokens: max_response_length,
//                 stream: false,
//             };

//             const fetchResponse = await runtime.fetch(endpoint + "/llm", {
//                 method: "POST",
//                 headers: {
//                     accept: "text/event-stream",
//                     "Content-Type": "application/json",
//                     Authorization: "Bearer eliza-app-llm",
//                 },
//                 body: JSON.stringify(requestBody),
//             });

//             if (!fetchResponse.ok) {
//                 const errorText = await fetchResponse.text();
//                 throw new Error(
//                     `Livepeer request failed (${fetchResponse.status}): ${errorText}`
//                 );
//             }

//             const json = await fetchResponse.json();

//             if (!json?.choices?.[0]?.message?.content) {
//                 throw new Error("Invalid response format from Livepeer");
//             }

//             response = json.choices[0].message.content.replace(
//                 /<\|start_header_id\|>assistant<\|end_header_id\|>\n\n/,
//                 ""
//             );
//             elizaLogger.debug(
//                 "Successfully received response from Livepeer model"
//             );
//             break;
//         }

//         default: {
//             const errorMessage = `Unsupported provider: ${provider}`;
//             elizaLogger.error(errorMessage);
//             throw new Error(errorMessage);
//         }
//     }
