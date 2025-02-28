/**
 * EthStorage client implementation
 * Provides functionality to interact with EthStorage for file storage and retrieval
 */

import { ethers } from 'ethers';
import { EthStorage } from 'ethstorage-sdk';
import { 
  EthStorageClientConfig, 
  UploadResult, 
  DownloadResult, 
  StoredFileInfo
} from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Client for interacting with EthStorage
 */
export class EthStorageClient {
  private ethStorage: EthStorage;
  private wallet: ethers.Wallet;
  private provider: ethers.providers.JsonRpcProvider;

  /**
   * Creates a new EthStorage client
   * 
   * @param config - Configuration options for the client
   */
  constructor(private readonly config: EthStorageClientConfig) {
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    
    // Initialize wallet either from the provided wallet or from the private key
    if (config.wallet) {
      this.wallet = config.wallet.connect(this.provider);
    } else if (config.privateKey) {
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    } else {
      throw new Error('Either wallet or privateKey must be provided in the configuration');
    }
    
    // Initialize the ethStorage property, but actual initialization happens in ensureInitialized
    this.ethStorage = {} as EthStorage; // This will be properly initialized in ensureInitialized
  }

  /**
   * Uploads a file to EthStorage
   * 
   * @param filePath - Path to the file to upload
   * @returns Promise resolving to the web3:// URL or the file ID
   */
  public async uploadFile(filePath: string): Promise<string> {
    try {
      await this.ensureInitialized();
      
      const fileContent = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      
      console.log(`Uploading file: ${fileName} (size: ${fileContent.length} bytes)`);
      
      if (typeof this.ethStorage.write !== 'function') {
        console.error('Error: EthStorage SDK API has changed. The write method is not available.');
        console.log('Available methods:', Object.keys(this.ethStorage));
        console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.ethStorage)));
        throw new Error('EthStorage SDK API has changed. The write method is not available.');
      }
      
      const result = await this.ethStorage.write(fileName, fileContent);
      
      console.log(`Upload result:`, result);
      
      // Generate the web3:// URL
      const contractAddress = this.ethStorage.contractAddr;
      if (contractAddress) {
        const web3Url = `web3://${contractAddress}/${fileName}`;
        console.log('File uploaded successfully.');
        console.log('Web3 URL:', web3Url);
        console.log('To view this file:');
        console.log('1. Use a web3-enabled browser like Brave or Chrome with web3 extensions');
        console.log('2. Enter the web3:// URL in the address bar');
        console.log('3. Or access it through a web3 gateway service');
        return web3Url;
      }
      
      return fileName; // Return the file ID
    } catch (error) {
      console.error('Error uploading file to EthStorage:', error);
      throw error;
    }
  }

  /**
   * Downloads a file from EthStorage
   * 
   * @param fileId - ID of the file to download
   * @returns Promise resolving to the download result
   */
  async downloadFile(fileId: string): Promise<DownloadResult> {
    try {
      await this.ensureInitialized();
      
      console.log(`Downloading file with ID: ${fileId}`);
      
      // Check if the read method exists
      if (typeof this.ethStorage.read !== 'function') {
        console.error('Error: EthStorage SDK API has changed. The read method is not available.');
        console.log('Available methods:', Object.keys(this.ethStorage));
        console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.ethStorage)));
        throw new Error('EthStorage SDK API has changed. The read method is not available.');
      }
      
      // Attempt to read the file with multiple retries
      const maxRetries = 5;
      let lastError = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Read attempt ${attempt}/${maxRetries}...`);
          const fileData = await this.ethStorage.read(fileId);
          
          if (!fileData) {
            console.log('No data returned, retrying...');
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
              continue;
            }
            throw new Error('Failed to retrieve file data after multiple attempts');
          }
          
          console.log(`File downloaded successfully. Size: ${fileData.length} bytes`);
          
          // Return the downloaded file data
          return {
            success: true,
            data: fileData,
            fileName: fileId,
          };
        } catch (error) {
          console.error(`Error in download attempt ${attempt}:`, error);
          lastError = error;
          
          if (attempt < maxRetries) {
            console.log('Retrying after delay...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
          }
        }
      }
      
      throw new Error(`Failed to download file after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    } catch (error) {
      console.error('Error downloading file from EthStorage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Lists files stored in EthStorage for the current wallet
   * 
   * @returns Promise resolving to an array of file information
   */
  async listFiles(): Promise<StoredFileInfo[]> {
    try {
      // Get all files from the current account
      let files = [];
      
      if (typeof this.ethStorage.list === 'function') {
        files = await this.ethStorage.list();
      } else if (typeof this.ethStorage.listBlobs === 'function') {
        files = await this.ethStorage.listBlobs();
      } else {
        console.log('Available EthStorage methods:', Object.keys(this.ethStorage));
        throw new Error('EthStorage SDK API has changed. No list methods are available.');
      }
      
      // Process each file to extract metadata
      const fileInfos: StoredFileInfo[] = [];
      
      for (const file of files) {
        try {
          let metadata: any = {};
          if (file.metadata) {
            try {
              metadata = JSON.parse(file.metadata);
            } catch (error) {
              console.warn(`Failed to parse metadata for file ${file.id}`, error);
            }
          }
          
          fileInfos.push({
            name: metadata.name || 'unknown',
            size: file.size || 0,
            contentType: metadata.type || 'application/octet-stream',
            timestamp: metadata.timestamp || Date.now(),
            fileId: file.id || file.blobId || file.fileId,
          });
        } catch (error) {
          console.warn(`Error processing file ${file.id || file.blobId || 'unknown'}`, error);
        }
      }
      
      return fileInfos;
    } catch (error) {
      console.error('Error listing files from EthStorage:', error);
      return [];
    }
  }

  /**
   * Deletes a file from EthStorage
   * 
   * @param fileId - ID of the file to delete
   * @returns Promise resolving to a boolean indicating success
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      if (typeof this.ethStorage.delete === 'function') {
        await this.ethStorage.delete(fileId);
      } else if (typeof this.ethStorage.deleteBlob === 'function') {
        await this.ethStorage.deleteBlob(fileId);
      } else {
        console.log('Available EthStorage methods:', Object.keys(this.ethStorage));
        throw new Error('EthStorage SDK API has changed. No delete methods are available.');
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting file from EthStorage:', error);
      return false;
    }
  }

  /**
   * Gets the wallet address used for EthStorage
   * 
   * @returns The wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  private async ensureInitialized(): Promise<void> {
    // If ethStorage doesn't exist or doesn't have required methods, reinitialize it
    if (!this.ethStorage || typeof this.ethStorage.write !== 'function') {
      console.log('Initializing EthStorage instance...');
      
      // Format private key with 0x prefix if needed
      const privateKey = this.config.privateKey;
      const formattedPrivateKey = privateKey?.startsWith('0x') ? privateKey : privateKey ? `0x${privateKey}` : undefined;
      
      // Create a new EthStorage instance using the static create method
      try {
        this.ethStorage = await EthStorage.create({
          rpc: this.config.rpcUrl,
          ethStorageRpc: this.config.rpcUrl, // Use same RPC URL if not specified otherwise
          privateKey: formattedPrivateKey,
        });
        
        console.log('EthStorage initialized successfully');
        console.log('Available methods:', Object.keys(this.ethStorage));
        console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.ethStorage)));
      } catch (error) {
        console.error('Failed to initialize EthStorage:', error);
        throw new Error(`Failed to initialize EthStorage: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
} 