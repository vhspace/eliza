import logger from "./logger";

/**
 * Attempts to import a module with retry logic.
 * @param modulePath - The module path to import.
 * @param retries - Number of retry attempts (default: 3).
 * @param delay - Delay between retries in milliseconds (default: 1000).
 * @returns The imported module.
 * @throws An error if all attempts fail.
 */
export async function importWithRetry<T = any>(
  modulePath: string,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await import(modulePath);
    } catch (error) {
      if (attempt === retries) {
        throw new Error(
          `Failed to import ${modulePath} after ${retries} attempts: ${error}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unexpected error in importWithRetry");
}

const registrations = new Map<string, any>();

export const dynamicImport = async (specifier: string) => {
  const module = registrations.get(specifier);
  if (module !== undefined) {
    return module;
  } else {
    return await importWithRetry(specifier);
  }
};

export const registerDynamicImport = (specifier: string, module: any) => {
  registrations.set(specifier, module);
};

export async function handlePluginImporting(plugins: string[]) {
  if (plugins.length > 0) {
      logger.info("Plugins are: ", plugins);
      const importedPlugins = await Promise.all(
          plugins.map(async (plugin) => {
              try {
                  const importedPlugin = await importWithRetry(plugin);
                  const functionName =
                      `${plugin
                          .replace("@elizaos/plugin-", "")
                          .replace("@elizaos-plugins/", "")
                          .replace(/-./g, (x) => x[1].toUpperCase())}Plugin`; // Assumes plugin function is camelCased with Plugin suffix
                  return (
                      importedPlugin.default || importedPlugin[functionName]
                  );
              } catch (importError) {
                  logger.error(
                      `Failed to import plugin: ${plugin}`,
                      importError
                  );
                  return []; // Return null for failed imports
              }
          })
      );
      return importedPlugins;
  }
      return [];
}