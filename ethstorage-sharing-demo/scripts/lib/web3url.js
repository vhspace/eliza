/**
 * Helper library for working with web3 URLs (w3link.io)
 */
 
const axios = require('axios');

class Web3UrlClient {
  constructor(walletAddress = null, chainId = '3337') {
    this.walletAddress = walletAddress;
    this.chainId = chainId;
    this.baseUrl = null;
    
    if (walletAddress) {
      this.setWalletAddress(walletAddress);
    }
  }
  
  /**
   * Set the wallet address to use for the URL domain
   * @param {string} address - The wallet address (with or without 0x prefix)
   * @returns {Web3UrlClient} - This client instance for chaining
   */
  setWalletAddress(address) {
    // Ensure address has 0x prefix
    this.walletAddress = address.startsWith('0x') ? address : `0x${address}`;
    // Update baseUrl
    this.baseUrl = `https://${this.walletAddress}.${this.chainId}.w3link.io/`;
    return this;
  }
  
  /**
   * Set the chain ID for the URL domain
   * @param {string} chainId - The chain ID
   * @returns {Web3UrlClient} - This client instance for chaining
   */
  setChainId(chainId) {
    this.chainId = chainId;
    // Update baseUrl if wallet is set
    if (this.walletAddress) {
      this.baseUrl = `https://${this.walletAddress}.${this.chainId}.w3link.io/`;
    }
    return this;
  }
  
  /**
   * Get the base domain URL for the current wallet
   * @returns {string} - The base domain URL
   */
  getBaseUrl() {
    if (!this.baseUrl) {
      throw new Error('No wallet address set. Call setWalletAddress() first.');
    }
    return this.baseUrl;
  }
  
  /**
   * Generate a full URL for a content key
   * @param {string} contentKey - The content key (e.g., "Naa.modda")
   * @returns {string} - The full URL
   */
  getContentUrl(contentKey) {
    return `${this.getBaseUrl()}${contentKey}`;
  }
  
  /**
   * Generate a random content key
   * @param {string} prefix - Optional prefix for the key
   * @returns {string} - A random content key
   */
  generateContentKey(prefix = '') {
    const randomPart = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString(36);
    return `${prefix}${prefix ? '.' : ''}${randomPart}.${timestamp}`;
  }
  
  /**
   * Fetch content from a web3 URL
   * @param {string} contentKey - The content key to fetch
   * @returns {Promise<object|string>} - The fetched content
   */
  async fetchContent(contentKey) {
    try {
      const url = this.getContentUrl(contentKey);
      const response = await axios.get(url);
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch content: ${error.message}`);
    }
  }
  
  /**
   * Store content at a web3 URL
   * @param {string} contentKey - The content key to use
   * @param {object|string} content - The content to store
   * @returns {Promise<{success: boolean, contentKey: string, url: string}>} - Result object
   */
  async storeContent(contentKey, content) {
    // This is a placeholder - in a real implementation, you would need to
    // interact with a service that allows uploading to w3link.io URLs
    
    throw new Error('Direct content storage not implemented. Use an external service to upload content to w3link.io');
  }
}

module.exports = {
  Web3UrlClient
}; 