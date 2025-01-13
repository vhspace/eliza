import {
    Action,
    ActionExample,
    composeContext,
    Content,
    elizaLogger,
    generateObject,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    UUID,
} from "@elizaos/core";
import { nilql } from "@nillion/nilql";
import { retrieveTemplate } from "../templates/retrieve";
import { loadConfig } from "./environment";
import { validateNilDbConfig } from "./common.ts";
import { NilDbApi } from "./api.ts";
import { z } from "zod";

export interface RetrieveContent extends Content {
    id: string;
}

function isRetrieveContent(
    _runtime: IAgentRuntime,
    content: any
): content is RetrieveContent {
    console.log("Content to retrieve", content);
    return typeof content.id === "string";
}

export const readFromNilDb: Action = {
    name: "NILLION_RETRIEVE",
    similes: [
        "RETRIEVE_SECRET_FROM_NILLION",
        "RETRIEVE_SECRET_FROM_NILDB",
        "GET_SECRET_FROM_NILLION",
        "GET_SECRET_FROM_NILDB",
        "LOAD_SECRET_FROM_NILLION",
        "LOAD_SECRET_FROM_NILDB",
        "RETRIEVE_FROM_NILLION",
        "RETRIEVE_FROM_NILDB",
        "LOAD_FROM_NILLION",
        "LOAD_FROM_NILDB",
    ],
    description: "Retrieve secrets using MPC and nilDB",
    validate: validateNilDbConfig,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.debug("nilDB: Read secret handler invoked");
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose retrieve context
        const context = composeContext({
            state,
            template: retrieveTemplate,
        });

        const schema = z.object({
            id: z.string().uuid(),
        });

        // Parse user message and attempt to extract secret id
        const response = await generateObject({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            schema,
        });

        const parseResult = schema.safeParse(response);
        if (!parseResult.success) {
            elizaLogger.info(
                "nilDB: Failed to parse secret id from user message."
            );
            await callback({
                text: "In order to retrieve your secret I need your secret's identifier that you got during upload",
            });
            return;
        }

        const settings = loadConfig(runtime);
        const cluster = { nodes: settings.nodes };
        const secretKey = await nilql.secretKey(cluster, { store: true });
        const _id = parseResult.data.id as UUID;

        const promises = settings.nodes.map(async (node) => {
            return await NilDbApi.readShare(node, settings.schema, _id);
        });

        try {
            const shares = await Promise.all(promises);
            const secret = await nilql.decrypt(secretKey, shares);

            elizaLogger.debug(
                "nilDB: secret retrieved with id: %s and value: %s",
                _id,
                secret
            );
            await callback({
                text: `Secret retrieved: ${secret}`,
            });
        } catch (error: unknown) {
            elizaLogger.warn("nilDB: Retrieve secret failed: %O", error);
            await callback({
                text: "Failed to retrieve secret from nilDB.",
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Retrieve my secret from Nillion with id 4c74cf1f-aefb-4593-92d7-142517e6d464",
                    action: "NILLION_RETRIEVE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you help me retrieve my password with ID 4c74cf1f-aefb-4593-92d7-142517e6d464?",
                    action: "NILLION_RETRIEVE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I need to retrieve the password from 4c74cf1f-aefb-4593-92d7-142517e6d464",
                    action: "NILLION_RETRIEVE",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
