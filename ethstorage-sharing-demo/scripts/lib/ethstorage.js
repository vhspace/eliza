const { EthStorage } = require('ethstorage-sdk');

class EthStorageClient {
  constructor(config) {
    this.config = config;
    this.ethStorage = null;
  }
  
  // Initialize EthStorage SDK
  async initialize() {
    if (this.ethStorage) return this.ethStorage;
    
    try {
      // Format private key if needed
      const privateKey = this.config.privateKey.startsWith('0x') 
        ? this.config.privateKey 
        : `0x${this.config.privateKey}`;
      
      // Create EthStorage instance
      this.ethStorage = await EthStorage.create({
        rpc: this.config.rpcUrl,
        ethStorageRpc: this.config.ethStorageRpc,
        address: this.config.contractAddress,
        privateKey: privateKey
      });
      
      return this.ethStorage;
    } catch (error) {
      console.error('Failed to initialize EthStorage:', error);
      throw error;
    }
  }
  
  // Store data and return transaction hash
  async storeData(fileName, data) {
    try {
      const ethStorage = await this.initialize();
      
      // Convert data to string if it's an object
      const contentToStore = typeof data === 'object' 
        ? JSON.stringify(data) 
        : data;
      
      // Create a unique filename with timestamp
      const uniqueFileName = `${fileName}_${Date.now()}.json`;
      
      // Upload data
      const result = await ethStorage.write(uniqueFileName, contentToStore);
      
      return {
        fileName: uniqueFileName,
        txHash: result.txHash,
        success: true
      };
    } catch (error) {
      console.error('Failed to store data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Retrieve data using transaction hash
  async retrieveDataFromTx(txHash) {
    try {
      const ethStorage = await this.initialize();
      
      // Get data from transaction
      const rawData = await ethStorage.readFromTransaction(txHash);
      
      // Convert data to string
      const dataString = Buffer.from(rawData).toString('utf8');
      
      // Try to parse as JSON, return as string if not valid JSON
      try {
        return {
          data: JSON.parse(dataString),
          success: true
        };
      } catch (e) {
        return {
          data: dataString,
          success: true
        };
      }
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Retrieve data using file key
  async retrieveDataFromKey(fileKey) {
    try {
      const ethStorage = await this.initialize();
      
      // Get data from file key
      const rawData = await ethStorage.read(fileKey);
      
      // Convert data to string
      const dataString = Buffer.from(rawData).toString('utf8');
      
      // Try to parse as JSON, return as string if not valid JSON
      try {
        return {
          data: JSON.parse(dataString),
          success: true
        };
      } catch (e) {
        return {
          data: dataString,
          success: true
        };
      }
    } catch (error) {
      console.error('Failed to retrieve data from key:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = {
  EthStorageClient
}; 