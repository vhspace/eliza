import { NilDbNode } from "./environment";
import { elizaLogger, type UUID } from "@elizaos/core";

const Endpoints = {
    Create: "/api/v1/data/create",
    Read: "/api/v1/data/read",
} as const;

type ShareData = {
    _id: UUID;
    data: string;
};

type CreatePayload = {
    schema: UUID;
    data: [ShareData];
};

type CreateResponse = {
    created: UUID[];
    errors: { error: string; document: ShareData }[];
};

async function createShare(
    node: NilDbNode,
    schema: UUID,
    data: ShareData
): Promise<true> {
    const payload: CreatePayload = {
        schema,
        data: [data],
    };

    const url = `${node.url}${Endpoints.Create}`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${node.jwt}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error("Share upload failed", { cause: response });
    }

    const body = (await response.json()) as CreateResponse;
    if (body.errors) {
        elizaLogger.warn("nilDB: Share upload failed: %O", body.errors);
        throw new Error("Share upload failed", { cause: body.errors });
    }

    elizaLogger.debug("nilDB: Share uploaded to: %s", node.did);
    return true;
}

type ReadPayload = {
    schema: UUID;
    filter: { _id: UUID };
};

type ShareDocument = {
    _id: UUID;
    _created: Date;
    _updated: Date;
    data: string;
};

type ReadResponseBody =
    | {
          data: ShareDocument[];
      }
    | {
          ts: Date;
          errors: unknown[];
      };

async function readShare(
    node: NilDbNode,
    schema: UUID,
    _id: UUID
): Promise<string> {
    const payload: ReadPayload = {
        schema,
        filter: { _id },
    };

    const url = `${node.url}${Endpoints.Read}`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${node.jwt}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error("Share upload failed", { cause: response });
    }

    const body = (await response.json()) as ReadResponseBody;
    if ("errors" in body) {
        elizaLogger.warn("nilDB: Read share failed: %O", body);
        throw new Error("Read share failed", { cause: body });
    }

    if (body.data.length !== 1) {
        elizaLogger.warn("Unexpected data.length returned with filter");
        throw new Error("Unexpected data.length returned with filter", {
            cause: body,
        });
    }

    elizaLogger.debug("nilDB: Share uploaded to: %s", node.did);
    return body.data[0].data;
}

export const NilDbApi = {
    createShare,
    readShare,
};
