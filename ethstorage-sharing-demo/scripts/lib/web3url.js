/**
 * Helper library for working with web3 URLs (w3link.io)
 */
 
const axios = require('axios');

class Web3UrlClient {
  constructor(walletAddress = null, chainId = '3337') {
    this.walletAddress = walletAddress;
    this.chainId = chainId;
    this.baseUrl = this.generateBaseUrl();
    this.debugMode = process.env.DEBUG_WEB3URL === 'true';
    
    if (walletAddress) {
      this.setWalletAddress(walletAddress);
    }
  }
  
  generateBaseUrl() {
    return `https://w3s.link/eth:${this.chainId}:${this.walletAddress}`;
  }
  
  /**
   * Set the wallet address to use for the URL domain
   * @param {string} address - The wallet address (with or without 0x prefix)
   * @returns {Web3UrlClient} - This client instance for chaining
   */
  setWalletAddress(address) {
    if (!address) {
      throw new Error('Invalid wallet address: address cannot be empty');
    }
    
    // Ensure address has 0x prefix
    this.walletAddress = address.startsWith('0x') ? address.toLowerCase() : `0x${address.toLowerCase()}`;
    
    // Update baseUrl
    this.baseUrl = this.generateBaseUrl();
    
    this.log(`Set wallet address: ${this.walletAddress}`);
    this.log(`Set base URL: ${this.baseUrl}`);
    
    return this;
  }
  
  /**
   * Set the chain ID for the URL domain
   * @param {string} chainId - The chain ID
   * @returns {Web3UrlClient} - This client instance for chaining
   */
  setChainId(chainId) {
    if (!chainId) {
      throw new Error('Invalid chain ID: chainId cannot be empty');
    }
    
    this.chainId = chainId;
    
    // Update baseUrl if wallet is set
    if (this.walletAddress) {
      this.baseUrl = this.generateBaseUrl();
      this.log(`Updated base URL with new chain ID: ${this.baseUrl}`);
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
    const formattedKey = typeof contentKey === 'string' 
      ? this.formatContentKey(contentKey) 
      : contentKey;
    return `${this.getBaseUrl()}/${formattedKey}`;
  }

  /**
   * Format a content key to be URL-safe
   * @param {string} contentKey - The raw content key
   * @returns {string} - URL-safe content key
   */
  formatContentKeyForUrl(contentKey) {
    return this.formatContentKey(contentKey);
  }
  
  /**
   * Format a content key consistently
   * @param {string} contentKey - The raw content key
   * @returns {string} - Formatted content key
   */
  formatContentKey(contentKey) {
    if (!contentKey) return '';
    
    // Remove any leading/trailing whitespace
    let formatted = contentKey.trim();
    
    // URL-encode the key to handle special characters
    // But preserve the period characters which are part of the key format
    formatted = formatted.split('.').map(part => encodeURIComponent(part)).join('.');
    
    this.log(`Formatted content key: ${contentKey} → ${formatted}`);
    
    return formatted;
  }
  
  /**
   * Generate a unique content key for a category
   * 
   * @param {string} category - The category for the content
   * @returns {string} - A unique content key
   */
  generateContentKey(category) {
    // Clean up the category
    const cleanCategory = (category || 'general')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    
    // Generate a random suffix - longer for better uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    
    // Create the content key with a format of category.random
    const contentKey = `${cleanCategory}.${randomSuffix}`;
    
    this.log(`Generated content key for category "${category}": ${contentKey}`);
    
    return contentKey;
  }
  
  /**
   * Fetch content from a web3 URL
   * @param {string|object} contentUrlOrKey - The content URL or key to fetch
   * @returns {Promise<object|string>} - The fetched content
   */
  async fetchContent(contentUrlOrKey) {
    const errors = [];
    
    // Determine if this is a URL or a content key
    let urls = [];
    
    if (typeof contentUrlOrKey === 'string' && contentUrlOrKey.startsWith('http')) {
      // This is already a URL
      urls = [contentUrlOrKey];
      this.log(`Using provided URL directly: ${contentUrlOrKey}`);
    } else {
      // This is a content key, generate multiple URL formats
      urls = Object.values(this.getDebugUrl(contentUrlOrKey));
      this.log(`Generated ${urls.length} URLs for content key: ${contentUrlOrKey}`);
    }
    
    for (const url of urls) {
      try {
        this.log(`Attempting to fetch content from URL: ${url}`);
        
        // Set a longer timeout and proper headers
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Cache-Control': 'no-cache',
            'User-Agent': 'Mozilla/5.0 Web3URLDemo'
          },
          validateStatus: status => status < 500 // Accept all responses that aren't server errors
        });
        
        // If we got a success response, return the data
        if (response.status >= 200 && response.status < 300) {
          this.log(`Successfully fetched content from ${url} (${response.status})`);
          return response.data;
        }
        
        // Otherwise add this error to our list
        errors.push({
          url,
          status: response.status,
          statusText: response.statusText,
          message: `HTTP error: ${response.status} ${response.statusText}`
        });
        
        console.warn(`Failed to fetch from ${url}: HTTP ${response.status} ${response.statusText}`);
      } catch (error) {
        console.error(`Error fetching from ${url}:`, error.message);
        errors.push({
          url,
          message: error.message,
          code: error.code
        });
      }
    }
    
    // If we get here, all attempts failed
    const errorMessage = `Failed to fetch content. Tried ${urls.length} URLs: ${errors.map(e => `${e.url}: ${e.message || 'Unknown error'}`).join('; ')}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
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
  
  /**
   * Get various URL formats for debugging purposes
   * @param {string} contentKey - The content key
   * @returns {object} - Various URL formats
   */
  getDebugUrl(contentKey) {
    if (!contentKey) {
      throw new Error('No content key provided for getDebugUrl');
    }
    
    const isDebugEnabled = process.env.DEBUG_WEB3URL === 'true';
    if (!isDebugEnabled) {
      return { standard: this.getContentUrl(contentKey) };
    }

    const formattedKey = typeof contentKey === 'string' 
      ? this.formatContentKey(contentKey) 
      : contentKey;
    
    const originalKey = typeof contentKey === 'string' 
      ? contentKey 
      : formattedKey;

    // Generate various URL formats to test
    return {
      standard: `${this.getBaseUrl()}/${formattedKey}`,
      raw: `${this.getBaseUrl()}/${originalKey}`,
      alternate1: `https://w3s.link/eth:${this.chainId}:${this.walletAddress}/${formattedKey}`,
      alternate2: `https://w3link.io/eth:${this.chainId}:${this.walletAddress}/${formattedKey}`,
      directEncode: `https://w3s.link/eth:${this.chainId}:${this.walletAddress}/${encodeURIComponent(originalKey)}`,
      ipfsGateway: `https://w3s.link/ipfs/f01701220${Buffer.from(originalKey).toString('hex')}`,
      urlParams: `https://w3s.link/?chain=eth&address=${this.walletAddress}&key=${encodeURIComponent(originalKey)}`
    };
  }
  
  /**
   * Internal logging method
   * @param {string} message - The message to log
   */
  log(message) {
    if (this.debugMode) {
      console.log(`[Web3UrlClient] ${message}`);
    }
  }

  // Add a method to test URL access
  async testUrlAccess(contentKey) {
    if (typeof window === 'undefined' || !window.fetch) {
      console.warn('testUrlAccess requires fetch API, which is not available in this environment');
      return null;
    }

    const urls = this.getDebugUrl(contentKey);
    const results = {};

    for (const [format, url] of Object.entries(urls)) {
      try {
        const response = await fetch(url, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          mode: 'cors'
        });
        
        results[format] = {
          url,
          status: response.status,
          success: response.ok,
          contentType: response.headers.get('content-type')
        };
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            results[format].data = await response.json();
          } else {
            results[format].data = await response.text();
          }
        }
      } catch (error) {
        results[format] = {
          url,
          success: false,
          error: error.message
        };
      }
    }

    return results;
  }
}

module.exports = {
  Web3UrlClient
}; 