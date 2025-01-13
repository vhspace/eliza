import { IAgentRuntime, UUID } from "@elizaos/core";

export type NilDbConfig = {
    org: NilDid;
    schema: UUID;
    nodes: NilDbNode[];
};

export type NilDbNode = {
    url: string;
    jwt: string;
    did: NilDid;
};

export type NilDid = `did:nil:${string}`;

const EnvVarName = {
    OrgId: "NILLION_NILDB_ORG_DID",
    SchemaId: "NILLION_NILDB_SCHEMA_ID",
    NodeUrls: "NILLION_NILDB_NODE_URLS",
    NodeIds: "NILLION_NILDB_NODE_IDS",
    NodeJwts: "NILLION_NILDB_NODE_JWTS",
} as const;

export function loadConfig(runtime: IAgentRuntime): NilDbConfig {
    try {
        const org = runtime.getSetting(EnvVarName.OrgId) as NilDid;
        const schema = runtime.getSetting(EnvVarName.SchemaId) as UUID;
        const nodeUrls = runtime.getSetting(EnvVarName.NodeUrls).split(",");
        const nodeIds = runtime
            .getSetting(EnvVarName.NodeIds)
            .split(",") as NilDid[];
        const nodeJwts = runtime.getSetting(EnvVarName.NodeJwts).split(",");

        const nodes = nodeIds.map(
            (did: NilDid, i: number): NilDbNode => ({
                did,
                url: nodeUrls[i],
                jwt: nodeJwts[i],
            })
        );

        return {
            org,
            schema,
            nodes,
        };
    } catch (error) {
        throw new TypeError("Failed to load plugin-nillion config");
    }
}
