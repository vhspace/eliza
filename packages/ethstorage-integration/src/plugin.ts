/**
 * ElizaOS Plugin implementation for EthStorage
 */

import { EthStorageClient } from './ethstorage_client';
import { createWalletFromPrivateKey, generateRandomWallet } from './utils';
import { loadEthStorageConfig, isConfigValid, EthStorageEnvConfig } from './config';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

/**
 * Configuration for the EthStorage plugin
 */
export interface EthStoragePluginConfig {
  /**
   * RPC URL for the Ethereum network
   */
  rpcUrl?: string;
  
  /**
   * Private key for the wallet
   * If not provided, a random wallet will be generated
   */
  privateKey?: string;
  
  /**
   * Contract address for the EthStorage contract
   */
  contractAddress?: string;
  
  /**
   * Whether to use the .env-ethstorage file for configuration
   * Default: true
   */
  useEnvFile?: boolean;
}

/**
 * EthStorage plugin for ElizaOS
 * This plugin allows for storing and retrieving data using EthStorage
 */
export class EthStoragePlugin {
  private client: EthStorageClient;
  
  /**
   * Creates a new EthStorage plugin
   * 
   * @param config - Configuration for the plugin
   */
  constructor(config: EthStoragePluginConfig = {}) {
    // Default to using the .env-ethstorage file
    const useEnvFile = config.useEnvFile !== false;
    
    // Load configuration from the .env-ethstorage file if needed
    let effectiveConfig: EthStorageEnvConfig = {
      rpcUrl: config.rpcUrl || '',
      privateKey: config.privateKey,
      contractAddress: config.contractAddress,
    };
    
    if (useEnvFile) {
      const envConfig = loadEthStorageConfig();
      
      // Merge with provided config, prioritizing explicit parameters
      effectiveConfig = {
        rpcUrl: config.rpcUrl || envConfig.rpcUrl,
        privateKey: config.privateKey || envConfig.privateKey,
        contractAddress: config.contractAddress || envConfig.contractAddress,
      };
    }
    
    // Validate the configuration
    if (!isConfigValid(effectiveConfig)) {
      throw new Error('Invalid EthStorage configuration. Please check your .env-ethstorage file or provided configuration.');
    }
    
    // If no private key is provided, generate a random wallet
    if (!effectiveConfig.privateKey) {
      const wallet = generateRandomWallet();
      console.log(`Generated random wallet with address: ${wallet.address}`);
      
      this.client = new EthStorageClient({
        rpcUrl: effectiveConfig.rpcUrl,
        wallet,
        contractAddress: effectiveConfig.contractAddress,
      });
    } else {
      this.client = new EthStorageClient({
        rpcUrl: effectiveConfig.rpcUrl,
        privateKey: effectiveConfig.privateKey,
        contractAddress: effectiveConfig.contractAddress,
      });
    }
  }
  
  /**
   * Initializes the plugin
   */
  async initialize(): Promise<void> {
    // Perform any initialization tasks here
    console.log(`EthStorage plugin initialized with wallet: ${this.client.getWalletAddress()}`);
  }
  
  /**
   * Store facts for a user
   * 
   * @param userId - User ID
   * @param facts - Array of facts to store
   * @returns Promise resolving to the file ID or null if the operation failed
   */
  async storeFact(userId: string, facts: string[]): Promise<string | null> {
    try {
      console.log(`Storing ${facts.length} facts for user ${userId}...`);
      
      // Create a temporary file with the facts
      const factsFilePath = path.join(os.tmpdir(), `user_${userId}_facts.json`);
      const factsData = JSON.stringify(facts, null, 2);
      await fs.writeFile(factsFilePath, factsData, 'utf8');
      
      // Upload the file to EthStorage
      const result = await this.client.uploadFile(factsFilePath);
      console.log(`Upload result for user ${userId}:`, result);
      
      // Clean up the temporary file
      try {
        await fs.unlink(factsFilePath);
      } catch (error) {
        console.warn(`Failed to delete temporary file ${factsFilePath}:`, error);
      }
      
      return result; // Return the web3:// URL or file ID
    } catch (error) {
      console.error(`Failed to store facts for user ${userId}:`, error);
      return null;
    }
  }
  
  /**
   * Retrieves user facts from EthStorage
   * 
   * @param fileId - ID of the file containing the facts
   * @returns Promise resolving to the user facts
   */
  async retrieveUserFacts(fileId: string): Promise<{ userId: string; facts: any[] } | null> {
    try {
      const result = await this.client.downloadFile(fileId);
      
      if (!result.success || !result.data) {
        console.error(`Failed to retrieve facts from file ${fileId}: ${result.error}`);
        return null;
      }
      
      // Parse the JSON data
      const text = new TextDecoder().decode(result.data);
      return JSON.parse(text);
    } catch (error) {
      console.error(`Error retrieving user facts: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  
  /**
   * Lists all files stored by this plugin
   * 
   * @returns Promise resolving to an array of file information
   */
  async listFiles() {
    return this.client.listFiles();
  }
  
  /**
   * Deletes a file
   * 
   * @param fileId - ID of the file to delete
   * @returns Promise resolving to a boolean indicating success
   */
  async deleteFile(fileId: string): Promise<boolean> {
    return this.client.deleteFile(fileId);
  }
  
  /**
   * Gets the EthStorage client used by this plugin
   * 
   * @returns The EthStorage client
   */
  getClient(): EthStorageClient {
    return this.client;
  }
  
  /**
   * Gets the wallet address used by this plugin
   * 
   * @returns The wallet address
   */
  getWalletAddress(): string {
    return this.client.getWalletAddress();
  }
} 