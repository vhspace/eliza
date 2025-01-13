import { elizaLogger, IAgentRuntime, Memory } from "@elizaos/core";
import { loadConfig } from "./environment";

export async function validateNilDbConfig(
    runtime: IAgentRuntime,
    _message: Memory
): Promise<boolean> {
    try {
        loadConfig(runtime);
        elizaLogger.debug("nilDB: Valid plugin configuration");
        return true;
    } catch (e: unknown) {
        elizaLogger.warn("nilDB: Invalid plugin configuration");
        return false;
    }
}
