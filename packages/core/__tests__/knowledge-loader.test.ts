import { describe, expect, it, mock, beforeEach, type Mock } from "bun:test";
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ingestFolder } from "../src/knowledge-loader";
import type { AgentRuntime } from "../src/runtime";
import type { UUID } from "../src/types";
import knowledge from "../src/knowledge";

// Create a temporary test directory
const TEST_DIR = join(process.cwd(), 'test-docs-' + Date.now());
const TEST_UUID = "123e4567-e89b-12d3-a456-426614174000" as UUID;

describe("Knowledge Loader", () => {
    let mockRuntime: AgentRuntime;
    let mockKnowledgeSet: Mock<typeof knowledge.set>;
    
    beforeEach(async () => {
        // Create test directory structure
        await mkdir(TEST_DIR, { recursive: true });
        await mkdir(join(TEST_DIR, 'subdir'), { recursive: true });
        
        // Create test files
        await writeFile(join(TEST_DIR, 'test1.md'), '# Test Document 1\nThis is a test');
        await writeFile(join(TEST_DIR, 'test2.txt'), 'Test Document 2');
        await writeFile(join(TEST_DIR, 'subdir', 'test3.md'), '## Nested Document\nThis is nested');
        await writeFile(join(TEST_DIR, 'ignored.json'), '{"test": "This should be ignored"}');
        
        // Mock knowledge.set
        mockKnowledgeSet = mock(() => Promise.resolve());
        knowledge.set = mockKnowledgeSet;
        
        // Mock runtime
        mockRuntime = {
            agentId: TEST_UUID,
        } as unknown as AgentRuntime;
    });
    
    it("should ingest markdown and text files", async () => {
        const documentIds = await ingestFolder(mockRuntime, TEST_DIR);
        
        // Should find 3 documents (2 in root, 1 in subdir)
        expect(documentIds.length).toBe(3);
        expect(mockKnowledgeSet).toHaveBeenCalledTimes(3);
        
        // Check that each call had the right content
        const calls = mockKnowledgeSet.mock.calls;
        
        // Find the call for test1.md
        const test1Call = calls.find(call => 
            call[1].content.source?.includes('test1.md')
        );
        expect(test1Call).toBeDefined();
        expect(test1Call![1].content.text).toContain('# Test Document 1');
        
        // Find the call for the nested document
        const nestedCall = calls.find(call => 
            call[1].content.source?.includes('subdir/test3.md') || 
            call[1].content.source?.includes('subdir\\test3.md')
        );
        expect(nestedCall).toBeDefined();
        expect(nestedCall![1].content.text).toContain('## Nested Document');
    });
    
    it("should respect file extension filtering", async () => {
        const documentIds = await ingestFolder(mockRuntime, TEST_DIR, {
            extensions: ['.md'] // Only include markdown
        });
        
        // Should find 2 markdown documents only
        expect(documentIds.length).toBe(2);
        
        // Verify no txt files were processed
        const calls = mockKnowledgeSet.mock.calls;
        const txtCall = calls.find(call => 
            call[1].content.source?.includes('.txt')
        );
        expect(txtCall).toBeUndefined();
    });
    
    it("should respect recursive option", async () => {
        const documentIds = await ingestFolder(mockRuntime, TEST_DIR, {
            recursive: false // Don't process subdirectories
        });
        
        // Should find 2 documents in root only
        expect(documentIds.length).toBe(2);
        
        // Verify no nested files were processed
        const calls = mockKnowledgeSet.mock.calls;
        const nestedCall = calls.find(call => 
            call[1].content.source?.includes('subdir')
        );
        expect(nestedCall).toBeUndefined();
    });
}); 