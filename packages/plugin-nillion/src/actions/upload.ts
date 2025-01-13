import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    ModelClass,
    ActionExample,
    generateObject,
    elizaLogger,
    type UUID,
} from "@elizaos/core";
import { nilql } from "@nillion/nilql";
import { composeContext } from "@elizaos/core";
import { uploadTemplate } from "../templates/upload";
import { v4 as uuid4 } from "uuid";
import { loadConfig } from "./environment";
import { NilDbApi } from "./api";
import { validateNilDbConfig } from "./common";
import { z } from "zod";

export const uploadToNilDb: Action = {
    name: "NILLION_UPLOAD",
    similes: [
        "UPLOAD_SECRET_TO_NILLION",
        "UPLOAD_SECRET_TO_NILDB",
        "STORE_SECRET_ON_NILLION",
        "STORE_SECRET_ON_NILDB",
        "SAVE_SECRET_TO_NILLION",
        "SAVE_SECRET_TO_NILDB",
        "UPLOAD_TO_NILLION",
        "UPLOAD_TO_NILDB",
        "STORE_ON_NILLION",
        "STORE_ON_NILDB",
        "SHARE_SECRET_ON_NILLION",
        "SHARE_SECRET_ON_NILDB",
        "PUBLISH_SECRET_TO_NILLION",
        "PUBLISH_SECRET_TO_NILDB",
    ],
    description: "Securely store secrets using MPC and nilDB",
    validate: validateNilDbConfig,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ): Promise<unknown> => {
        elizaLogger.info("nilDB: Upload secret handler invoked");
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose upload context
        const context = composeContext({
            state,
            template: uploadTemplate,
        });

        const schema = z.object({
            secret: z.string(),
        });

        // Parse user message and attempt to extract secret
        const response = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema,
        });

        const parseResult = schema.safeParse(response);
        if (!parseResult.success) {
            elizaLogger.info(
                "nilDB: Failed to parse secret from user message."
            );
            await callback({
                text: "In order to save your secret please clearly identify it in your message.",
            });
            return;
        }

        const secret = parseResult.data.secret;
        const settings = loadConfig(runtime);
        const cluster = { nodes: settings.nodes };
        const secretKey = await nilql.secretKey(cluster, {
            store: true,
        });
        const sharesOfSecret = await nilql.encrypt(secretKey, secret);
        const _id = uuid4() as UUID;

        const promises = settings.nodes.map(async (node, i) => {
            await NilDbApi.createShare(node, settings.schema, {
                _id,
                data: sharesOfSecret[i].toString(),
            });
        });

        try {
            await Promise.all(promises); // throws if any share upload fails
            elizaLogger.info("nilDB: secret uploaded with id: ", _id);
            await callback({
                text: `Secret uploaded to nilDB with id ${_id}`,
            });
        } catch (error: unknown) {
            elizaLogger.warn("nilDB: secret upload failed", error);
            await callback({
                text: "Failed to upload secret to nilDB.",
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "upload my secret 'PRIVACY' to Nillion",
                    action: "NILLION_UPLOAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "can you help me upload my password 'passw0rd'?",
                    action: "NILLION_UPLOAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I need to upload the password `password`",
                    action: "NILLION_UPLOAD",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
