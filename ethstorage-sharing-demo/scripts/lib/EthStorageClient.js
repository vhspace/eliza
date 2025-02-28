/**
 * Client for managing data storage on EthStorage
 */

const { EthStorage } = require('ethstorage-sdk');
const { ethers } = require('ethers');

class EthStorageClient {
  /**
   * Creates a new EthStorage client instance
   * 
   * @param {string} privateKey - Private key of the wallet (with or without 0x prefix)
   * @param {string} rpcUrl - RPC URL for the blockchain
   */
  constructor(privateKey, rpcUrl) {
    this.privateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    this.rpcUrl = rpcUrl;
    this.ethStorage = null;
    this.wallet = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the EthStorage client
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing EthStorage client...');
      this.ethStorage = await EthStorage.create({
        rpc: this.rpcUrl,
        ethStorageRpc: this.rpcUrl,
        privateKey: this.privateKey
      });

      // Create a wallet for other operations
      const provider = new ethers.JsonRpcProvider(this.rpcUrl);
      this.wallet = new ethers.Wallet(this.privateKey, provider);

      this.isInitialized = true;
      console.log('EthStorage client initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize EthStorage client:', error);
      throw error;
    }
  }

  /**
   * Store data on EthStorage
   * 
   * @param {string} contentKey - The key to store the content under
   * @param {object|string} content - The content to store (will be serialized if object)
   * @returns {Promise<string>} - The content key used for storage
   */
  async storeContent(contentKey, content) {
    await this.ensureInitialized();

    try {
      // Convert content to string if it's an object
      const contentData = typeof content === 'object' 
        ? Buffer.from(JSON.stringify(content)) 
        : Buffer.from(content.toString());

      console.log(`Storing data with key: ${contentKey} (${contentData.length} bytes)`);
      
      await this.ethStorage.write(contentKey, contentData);
      console.log(`Successfully stored data with key: ${contentKey}`);

      return contentKey;
    } catch (error) {
      console.error(`Error storing content with key ${contentKey}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve data from EthStorage
   * 
   * @param {string} contentKey - The key to retrieve content from
   * @returns {Promise<any>} - The retrieved content
   */
  async retrieveContent(contentKey) {
    await this.ensureInitialized();

    try {
      console.log(`Retrieving data with key: ${contentKey}`);
      const result = await this.ethStorage.read(contentKey);
      
      if (!result || !result.data) {
        throw new Error(`No data found for key: ${contentKey}`);
      }

      // Try to parse as JSON if it looks like JSON, otherwise return as string
      const strData = result.data.toString();
      console.log(`Retrieved ${strData.length} bytes of data`);
      
      try {
        if (strData.startsWith('{') || strData.startsWith('[')) {
          return JSON.parse(strData);
        }
      } catch (e) {
        // If parsing fails, just return the string
      }
      
      return strData;
    } catch (error) {
      console.error(`Error retrieving content with key ${contentKey}:`, error);
      throw error;
    }
  }

  /**
   * List all content keys stored by this wallet
   * 
   * @returns {Promise<string[]>} - Array of content keys
   */
  async listContent() {
    await this.ensureInitialized();

    try {
      const items = await this.ethStorage.list();
      return items.map(item => item.key);
    } catch (error) {
      console.error('Error listing content:', error);
      throw error;
    }
  }

  /**
   * Get wallet address
   * 
   * @returns {string} - The wallet address
   */
  getWalletAddress() {
    if (!this.wallet) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.wallet.address;
  }

  /**
   * Ensure the client is initialized
   * @private
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

module.exports = {
  EthStorageClient
}; 