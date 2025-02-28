/**
 * Example usage of the EthStorage integration
 */

import { EthStorageClient, EthStoragePlugin } from './index';
import { generateRandomWallet } from './utils';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env-ethstorage' });

class EthStorageTester {
  private client: EthStorageClient;
  private plugin: EthStoragePlugin;

  constructor() {
    const rpcUrl = process.env.ETHSTORAGE_RPC_URL;
    const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
    
    if (!rpcUrl) {
      throw new Error('ETHSTORAGE_RPC_URL environment variable not set');
    }
    
    if (!privateKey) {
      console.log('No private key provided, generating random wallet for testing');
      const wallet = generateRandomWallet();
      console.log(`Using generated wallet address: ${wallet.address}`);
      
      this.client = new EthStorageClient({
        rpcUrl,
        wallet,
      });
    } else {
      console.log('Using provided private key for wallet');
      this.client = new EthStorageClient({
        rpcUrl,
        privateKey: privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
      });
    }
    
    this.plugin = new EthStoragePlugin({
      rpcUrl,
      privateKey: privateKey?.startsWith('0x') ? privateKey : privateKey ? `0x${privateKey}` : undefined,
    });
  }

  async testFileStorage() {
    console.log('Testing file storage...');
    
    // Create a temporary test file
    const testFilePath = path.join(os.tmpdir(), 'test-file.txt');
    const testContent = `Test file created at ${new Date().toISOString()}`;
    await fs.writeFile(testFilePath, testContent, 'utf8');
    
    try {
      // Upload the file
      console.log(`Uploading test file: ${testFilePath}`);
      const uploadResult = await this.client.uploadFile(testFilePath);
      console.log('Upload result:', uploadResult);
      
      // If uploadResult is a string, it's either a web3:// URL or a file ID
      // Try to download the file using the file ID portion
      const fileId = uploadResult.includes('web3://') 
        ? uploadResult.split('/').pop() || uploadResult 
        : uploadResult;
      
      console.log(`Attempting to download file with ID: ${fileId}`);
      const downloadResult = await this.client.downloadFile(fileId);
      
      if (downloadResult.success) {
        const downloadedContent = new TextDecoder().decode(downloadResult.data);
        console.log('Downloaded content:', downloadedContent);
        
        // Verify the content matches
        if (downloadedContent === testContent) {
          console.log('Content verification: SUCCESS');
        } else {
          console.log('Content verification: FAILED');
          console.log('Original content:', testContent);
          console.log('Downloaded content:', downloadedContent);
        }
      } else {
        console.error(`Download failed: ${downloadResult.error}`);
      }
    } catch (error) {
      console.error('Error in file storage test:', error);
    } finally {
      // Clean up the temporary file
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        console.warn(`Failed to delete temporary file ${testFilePath}:`, error);
      }
    }
  }

  async testPluginFacts() {
    console.log('Testing plugin facts storage...');
    
    // Initialize the plugin
    await this.plugin.initialize();
    
    // Store user facts
    const facts = [
      'User likes chocolate',
      'User prefers cold weather',
      `Test fact created at ${new Date().toISOString()}`,
    ];
    
    const userId = 'testuser';
    console.log(`Storing ${facts.length} facts for user ${userId}...`);
    const fileId = await this.plugin.storeFact(userId, facts);
    
    if (fileId) {
      console.log(`Facts stored successfully with ID: ${fileId}`);
    } else {
      console.error('Failed to store facts');
    }
  }
  
  async runAllTests() {
    console.log('Running all EthStorage tests...');
    
    try {
      await this.testFileStorage();
      console.log('\n');
      await this.testPluginFacts();
    } catch (error) {
      console.error('Test failed:', error);
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  const tester = new EthStorageTester();
  tester.runAllTests().catch(console.error);
} 