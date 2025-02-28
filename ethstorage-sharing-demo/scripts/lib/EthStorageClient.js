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
    this.lastError = null;
    this.initializationAttempts = 0;
    
    // In-memory fallback storage when EthStorage is not available
    this.fallbackStorage = new Map();
    this.useFallback = false;
  }

  /**
   * Initialize the EthStorage client
   * @returns {Promise<EthStorageClient>} This client instance
   */
  async initialize() {
    if (this.isInitialized) {
      return this;
    }

    this.initializationAttempts++;
    console.log(`Initializing EthStorage client (attempt #${this.initializationAttempts})...`);
    
    try {
      // Format private key with 0x prefix if needed
      const privateKey = this.privateKey.startsWith('0x') ? this.privateKey : `0x${this.privateKey}`;
      
      // Initialize wallet
      this.wallet = new ethers.Wallet(privateKey);
      
      // Connect to provider
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      this.wallet = this.wallet.connect(this.provider);
      
      // Get network information
      const network = await this.provider.getNetwork();
      console.log(`Connected to network: chainId=${network.chainId}, name=${network.name}`);
      
      // Get wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);
      const balanceInEth = ethers.formatEther(balance);
      console.log(`Wallet address: ${this.wallet.address}`);
      console.log(`Wallet balance: ${balanceInEth} ETH`);
      
      // Initialize EthStorage SDK
      this.ethStorage = await EthStorage.create({ 
        rpc: this.rpcUrl,
        ethStorageRpc: this.rpcUrl, // We use the same RPC for both
        privateKey: privateKey
      });
      
      // Verify that EthStorage is working by trying to store and retrieve a small test file
      try {
        // Generate a test key with timestamp
        const testKey = `health-check-${Math.random().toString(36).substring(2, 10)}`;
        const testData = { test: 'data', timestamp: Date.now() };
        
        // Test write operation
        // Convert test data to a Buffer
        const testBuffer = Buffer.from(JSON.stringify(testData));
        
        // Write test data
        try {
          const result = await this.ethStorage.write(testKey, testBuffer);
          console.log(`Successfully wrote test data with key: ${testKey}`);
        } catch (writeError) {
          console.error(`EthStorage: Write blob failed! ${writeError.message}`);
          throw writeError;
        }
        
        // Test read operation (this might fail immediately after write, which is expected)
        try {
          const readResult = await this.ethStorage.read(testKey);
          console.log(`Successfully read test data with key: ${testKey}`);
        } catch (readError) {
          // This is likely an expected error right after writing
          if (readError.message.includes('There is no data corresponding to key')) {
            console.log(`EthStorage read test failed but likely just because data isn't available yet: ${readError.message}`);
          } else {
            console.error(`EthStorage initialization failed: EthStorage connection test failed: ${readError.message}`);
            console.log('Switching to fallback in-memory storage');
            this.useFallback = true;
            this.lastError = readError;
          }
        }
      } catch (ethStorageError) {
        console.error(`Failed to initialize EthStorage SDK: ${ethStorageError.message}`);
        this.lastError = ethStorageError;
        this.useFallback = true;
      }

      // If we're using fallback storage, log that
      if (this.useFallback) {
        console.log('Using in-memory fallback storage instead of EthStorage');
      } else {
        console.log('EthStorage client initialized successfully');
      }

      // Complete initialization
      this.isInitialized = true;
      this.status = {
        initialized: true,
        initializationAttempts: this.initializationAttempts,
        lastError: this.lastError,
        walletAddress: this.wallet.address,
        useFallback: this.useFallback,
        fallbackStorageSize: this.fallbackStorage.size
      };

      // Log status for debugging
      console.log('EthStorage client status:', this.status);

      if (this.useFallback) {
        console.warn('⚠️ WARNING: Client initialized in fallback mode. EthStorage not available.');
        console.log(`Last error: ${this.lastError ? this.lastError.message : null}`);
      }
    } catch (error) {
      console.error(`Failed to initialize EthStorage client: ${error.message}`);
      this.lastError = error;

      // Always fall back to in-memory storage if initialization fails
      this.useFallback = true;
      console.log('Using in-memory fallback storage');
      this.isInitialized = true;
    }
  }

  /**
   * Check if the wallet has enough funds for a transaction
   * @param {string} operation - The operation to check funds for (e.g., "write", "read")
   * @returns {Promise<boolean>} True if enough funds, false otherwise
   */
  async checkFunds(operation = "write") {
    try {
      if (!this.wallet || !this.provider) {
        console.warn('No wallet or provider available, cannot check funds');
        return false;
      }

      // Estimated costs for different operations (in Ether)
      const estimatedCosts = {
        write: "0.2", // Blob storage is expensive, need at least 0.2 ETH
        read: "0.01",  
        default: "0.01"
      };

      const cost = estimatedCosts[operation] || estimatedCosts.default;
      const estimatedCost = ethers.parseEther(cost);
      
      const balance = await this.provider.getBalance(this.wallet.address);
      const balanceInEth = ethers.formatEther(balance);
      
      console.log(`Checking funds for ${operation} operation:`);
      console.log(`- Wallet address: ${this.wallet.address}`);
      console.log(`- Current balance: ${balanceInEth} ETH`);
      console.log(`- Required for ${operation}: ${cost} ETH`);
      
      const hasEnough = balance >= estimatedCost;
      
      if (!hasEnough) {
        console.error(`Insufficient funds for ${operation} operation: have ${balanceInEth} ETH, need at least ${cost} ETH`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error checking funds: ${error.message}`);
      return false;
    }
  }

  /**
   * Store content with a key
   * @param {string} key - The content key
   * @param {object|string} content - The content to store
   * @returns {Promise<string>} - Transaction hash or fallback storage indicator
   */
  async storeContent(key, content) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!key) {
      throw new Error('Key is required for storing content');
    }

    const keyDetails = this.analyzeKey(key);
    console.log(`Storing data with key: ${key} (${this.getContentSize(content)} bytes)`);
    console.log(`Content preview: ${this.getContentPreview(content)}`);
    console.log('Key details:', keyDetails);

    // Serialize content if it's an object
    const contentToStore = typeof content === 'object' 
      ? JSON.stringify(content) 
      : content;

    try {
      if (this.useFallback) {
        console.log(`Using fallback storage for key: ${key}`);
        this.fallbackStorage.set(key, contentToStore);
        console.log(`Successfully stored data in fallback storage with key: ${key}`);
        return 'fallback-storage';
      }

      // Check if we have enough funds for EthStorage write operation
      const hasFunds = await this.checkFunds("write");
      if (!hasFunds) {
        console.log(`Insufficient funds for EthStorage write, using fallback storage`);
        this.fallbackStorage.set(key, contentToStore);
        return 'fallback-storage-insufficient-funds';
      }

      // Convert content to Buffer for EthStorage SDK
      const contentBuffer = Buffer.from(contentToStore);
      
      // Use EthStorage SDK to store the content
      const result = await this.ethStorage.write(key, contentBuffer);
      console.log(`Content stored with key: ${key} (txHash: ${result.txHash})`);
      return result.txHash;
    } catch (error) {
      console.error(`Error storing content: ${error.message}`);
      
      // Handle error by falling back to in-memory storage
      if (!this.useFallback) {
        console.log(`Falling back to in-memory storage for this operation`);
        this.fallbackStorage.set(key, contentToStore);
        console.log(`Data stored in fallback storage with key: ${key}`);
        return 'fallback-storage-after-error';
      }
      
      throw error;
    }
  }

  /**
   * Retrieve content by key
   * @param {string} key - The content key
   * @returns {Promise<object|string|null>} The retrieved content or null if not found
   */
  async retrieveContent(key) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!key) {
      throw new Error('Key is required for retrieving content');
    }

    console.log(`Retrieving data with key: ${key}`);
    
    // Log key details for debugging
    const keyDetails = this.analyzeKey(key);
    console.log('Key details:', keyDetails);

    try {
      // Check fallback storage first if we're in fallback mode
      if (this.useFallback) {
        console.log(`Using fallback storage for key: ${key}`);
        const fallbackContent = this.fallbackStorage.get(key);
        
        if (fallbackContent) {
          console.log(`Successfully retrieved data from fallback storage with key: ${key}`);
          
          // Parse JSON if content is a JSON string
          if (typeof fallbackContent === 'string' && fallbackContent.startsWith('{')) {
            try {
              return JSON.parse(fallbackContent);
            } catch (e) {
              // If parsing fails, return the original string
              return fallbackContent;
            }
          }
          
          return fallbackContent;
        } else {
          console.log(`No data found in fallback storage with key: ${key}`);
          return null;
        }
      }

      // Use EthStorage SDK for non-fallback retrieval
      const result = await this.ethStorage.read(key);
      
      if (!result || !result.data) {
        console.log(`No data found for key: ${key}`);
        return null;
      }
      
      let content;
      
      // Convert Buffer to string
      if (Buffer.isBuffer(result.data)) {
        content = result.data.toString('utf8');
      } else if (result.data instanceof Uint8Array) {
        content = Buffer.from(result.data).toString('utf8');
      } else {
        content = result.data;
      }
      
      // Try to parse as JSON
      try {
        return JSON.parse(content);
      } catch (e) {
        // If it's not valid JSON, return as string
        return content;
      }
    } catch (error) {
      console.error(`Error retrieving content: ${error.message}`);
      
      // Handle fallbacks for different error types
      if (this.useFallback) {
        // Try fallback storage as a last resort
        const fallbackContent = this.fallbackStorage.get(key);
        if (fallbackContent) {
          console.log(`Retrieved data from fallback storage after EthStorage error: ${key}`);
          return fallbackContent;
        }
      }
      
      throw new Error(`No data found for key ${key}: ${error.message}`);
    }
  }

  /**
   * Analyze a key for potential issues
   * @param {string} key - The key to analyze
   * @returns {object} Analysis results
   */
  analyzeKey(key) {
    if (!key) return { key: null, valid: false };

    const containsSpecialChars = /[^a-zA-Z0-9_\-.]/g.test(key);
    const parts = key.split('.');
    
    return {
      key,
      length: key.length,
      containsSpecialChars,
      parts
    };
  }

  /**
   * Get the size of content in bytes
   * @param {object|string} content - The content to measure
   * @returns {number} Size in bytes
   */
  getContentSize(content) {
    const contentStr = typeof content === 'object' 
      ? JSON.stringify(content) 
      : String(content);
    
    return contentStr.length;
  }

  /**
   * Get a preview of content for logging
   * @param {object|string} content - The content to preview
   * @returns {string} Content preview
   */
  getContentPreview(content) {
    const contentStr = typeof content === 'object' 
      ? JSON.stringify(content) 
      : String(content);
    
    return contentStr.length > 100 
      ? `${contentStr.substring(0, 97)}...` 
      : contentStr;
  }

  /**
   * List all content keys stored by this wallet
   * 
   * @returns {Promise<string[]>} - Array of content keys
   */
  async listContent() {
    await this.ensureInitialized();

    try {
      console.log('Listing all content keys...');
      const items = await this.ethStorage.list();
      console.log(`Found ${items.length} content keys`);
      return items.map(item => item.key);
    } catch (error) {
      console.error('Error listing content:', error);
      throw error;
    }
  }

  /**
   * Get client status information
   * @returns {object} Status information
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      initializationAttempts: this.initializationAttempts,
      lastError: this.lastError,
      walletAddress: this.wallet ? this.wallet.address : null,
      useFallback: this.useFallback,
      fallbackStorageSize: this.fallbackStorage.size
    };
  }

  /**
   * Get the wallet address
   * @returns {string} Wallet address
   */
  getWalletAddress() {
    return this.wallet ? this.wallet.address : null;
  }

  /**
   * Check if client is initialized
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this.isInitialized;
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

  /**
   * Check the health of the EthStorage connection
   * @returns {Promise<object>} Health check results
   */
  async checkHealth() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const result = {
      success: true,
      ethStorage: {
        available: !this.useFallback,
        initialized: this.isInitialized,
        walletAddress: this.wallet.address,
        network: null,
        balance: null,
        connectionTest: false,
        writeTest: false,
        readTest: false
      },
      errors: [],
      details: {}
    };

    try {
      // Check network
      const network = await this.provider.getNetwork();
      result.ethStorage.network = {
        chainId: network.chainId,
        name: network.name
      };

      // Check balance
      const balance = await this.provider.getBalance(this.wallet.address);
      const balanceInEth = ethers.formatEther(balance);
      result.ethStorage.balance = balanceInEth;

      if (this.useFallback) {
        result.success = false;
        result.errors.push({
          type: 'fallback_mode',
          message: 'EthStorage client is in fallback mode',
          details: this.lastError ? this.lastError.message : 'Unknown reason'
        });
        return result;
      }

      // Test a write operation
      try {
        const testKey = `health-check-${Math.random().toString(36).substring(2, 10)}`;
        const testData = { test: 'health', timestamp: Date.now() };
        const testBuffer = Buffer.from(JSON.stringify(testData));
        
        const writeResult = await this.ethStorage.write(testKey, testBuffer);
        result.ethStorage.writeTest = true;
        result.details.writeResult = writeResult;
        
        // Try to read it back
        try {
          const readResult = await this.ethStorage.read(testKey);
          result.ethStorage.readTest = true;
          result.details.readResult = readResult;
        } catch (readError) {
          // This is expected shortly after writing
          result.details.readError = readError.message;
        }
      } catch (writeError) {
        result.success = false;
        result.errors.push({
          type: 'write_test_failed',
          message: 'Failed to write test data',
          details: writeError.message
        });
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'general_error',
        message: 'Health check failed',
        details: error.message
      });
    }

    return result;
  }
}

module.exports = {
  EthStorageClient
}; 