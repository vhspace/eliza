import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { AgentRuntime } from './runtime';
import type { KnowledgeItem, UUID } from './types';
import knowledge from './knowledge';

/**
 * Ingests all files from a folder into the knowledge system
 * @param runtime The agent runtime
 * @param folderPath Path to the folder containing documents
 * @param options Configuration options
 * @returns Array of document IDs that were ingested
 */
export async function ingestFolder(
    runtime: AgentRuntime, 
    folderPath: string, 
    options: { 
        extensions?: string[],
        recursive?: boolean 
    } = {}
): Promise<UUID[]> {
    const { 
        extensions = ['.md', '.txt', '.mdx'], 
        recursive = true 
    } = options;
    
    const documentIds: UUID[] = [];
    
    // Read all files in the directory
    const files = await readdir(folderPath);
    
    for (const file of files) {
        const filePath = join(folderPath, file);
        const fileStat = await stat(filePath);
        
        // Handle directories recursively if requested
        if (fileStat.isDirectory() && recursive) {
            const nestedIds = await ingestFolder(runtime, filePath, options);
            documentIds.push(...nestedIds);
            continue;
        }
        
        // Skip files with extensions we don't want
        const fileExt = extname(file).toLowerCase();
        if (!extensions.includes(fileExt)) {
            continue;
        }
        
        // Read and process the file
        const content = await readFile(filePath, 'utf-8');
        
        // Create a knowledge item
        const id = uuidv4() as UUID;
        const item: KnowledgeItem = {
            id,
            content: { 
                text: content,
                source: filePath
            }
        };
        
        // Store in knowledge system
        await knowledge.set(runtime, item);
        documentIds.push(id);
    }
    
    return documentIds;
}

export default {
    ingestFolder
}; 