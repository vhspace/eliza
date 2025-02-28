const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// Category enum mapping
const CATEGORIES = {
  PERSONAL_INFO: 0,
  CONTACT_INFO: 1,
  INTERESTS: 2,
  TRAVEL_HISTORY: 3,
  EDUCATION: 4,
  WORK_HISTORY: 5
};

// Human-readable category labels
const CATEGORY_LABELS = {
  0: "Personal Information",
  1: "Contact Information",
  2: "Interests & Hobbies",
  3: "Travel History",
  4: "Education",
  5: "Work Experience"
};

class PersonalDataRegistry {
  constructor(provider, address, w3DomainPrefix = null) {
    // Get ABI from compiled contract
    const artifactPath = path.join(__dirname, "../../artifacts/contracts/PersonalDataRegistry.sol/PersonalDataRegistry.json");
    const contractArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    
    this.contract = new ethers.Contract(address, contractArtifact.abi, provider);
    this.categories = CATEGORIES;
    this.categoryLabels = CATEGORY_LABELS;
    this.provider = provider;
    this.signer = null;
    
    // Web3 URL configuration
    this.w3DomainPrefix = w3DomainPrefix;
  }

  // Set the web3 domain prefix (e.g., "https://0x47cac6daabc52f3dd068b6bfc9e5d6116267bece.3337.w3link.io/")
  setW3DomainPrefix(prefix) {
    this.w3DomainPrefix = prefix;
    return this;
  }

  // Connect with a signer for write operations
  connect(signer) {
    this.signer = signer;
    this.contract = this.contract.connect(signer);
    return this;
  }

  /**
   * Ensure a signer is available for transactions
   * @throws {Error} If no signer is connected
   * @returns {void}
   */
  ensureSigner() {
    if (!this.signer) {
      throw new Error('No signer connected. Call connect(signer) before performing write operations.');
    }
  }

  /**
   * Check if the connected wallet has enough funds for a transaction
   * @param {number} estimatedCost - The estimated cost in wei (optional)
   * @returns {Promise<boolean>} True if enough funds, false otherwise
   */
  async checkFunds(estimatedCost = ethers.parseEther("0.01")) {
    try {
      if (!this.signer) {
        console.warn('No signer connected, cannot check funds');
        return false;
      }

      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      
      console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
      
      if (balance < estimatedCost) {
        console.error(`Insufficient funds: have ${ethers.formatEther(balance)} ETH, need at least ${ethers.formatEther(estimatedCost)} ETH`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Error checking funds: ${error.message}`);
      return false;
    }
  }

  // Upload data for a category
  async uploadData(category, contentKey) {
    try {
      this.ensureSigner();
      
      // Check if wallet has enough funds before proceeding
      const hasFunds = await this.checkFunds();
      if (!hasFunds) {
        throw new Error(`Insufficient funds for transaction`);
      }

      // Convert category string to enum value if needed
      const categoryId = this.getCategoryId(category);
      if (categoryId === undefined) {
        throw new Error(`Invalid category: ${category}`);
      }

      console.log(`Uploading data for category ${category} (ID: ${categoryId}) with content key: ${contentKey}`);
      
      // Upload data to the contract
      const tx = await this.contract.uploadData(categoryId, contentKey);
      
      // Wait for transaction to be mined
      console.log(`Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      return receipt;
    } catch (error) {
      console.error(`Error in uploadData: ${error.message}`);
      throw error;
    }
  }

  // Grant access to another user
  async grantAccess(viewerAddress, category) {
    try {
      this.ensureSigner();
      
      // Check if wallet has enough funds before proceeding
      const hasFunds = await this.checkFunds();
      if (!hasFunds) {
        throw new Error(`Insufficient funds for transaction`);
      }
      
      const categoryId = typeof category === 'string' ? this.categories[category] : category;
      console.log(`Granting access to ${viewerAddress} for category ${category} (ID: ${categoryId})`);
      
      const tx = await this.contract.grantAccess(viewerAddress, categoryId);
      const receipt = await tx.wait();
      console.log(`Access granted in block ${receipt.blockNumber}`);
      
      return receipt;
    } catch (error) {
      console.error(`Error in grantAccess: ${error.message}`);
      throw error;
    }
  }

  // Revoke access from a user
  async revokeAccess(viewerAddress, category) {
    try {
      this.ensureSigner();
      
      // Check if wallet has enough funds before proceeding
      const hasFunds = await this.checkFunds();
      if (!hasFunds) {
        throw new Error(`Insufficient funds for transaction`);
      }
      
      const categoryId = typeof category === 'string' ? this.categories[category] : category;
      console.log(`Revoking access from ${viewerAddress} for category ${category} (ID: ${categoryId})`);
      
      const tx = await this.contract.revokeAccess(viewerAddress, categoryId);
      const receipt = await tx.wait();
      console.log(`Access revoked in block ${receipt.blockNumber}`);
      
      return receipt;
    } catch (error) {
      console.error(`Error in revokeAccess: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a user has data for a specific category
   * @param {string} userAddress - The address of the user
   * @param {string|number} category - The data category
   * @returns {Promise<boolean>} True if data exists, false otherwise
   */
  async hasData(userAddress, category) {
    try {
      // Convert category string to enum value if needed
      const categoryId = this.getCategoryId(category);
      if (categoryId === undefined) {
        console.error(`Invalid category: ${category}`);
        return false;
      }

      console.log(`Checking if user ${userAddress} has data for category ${category} (ID: ${categoryId})`);
      
      // Check if data exists
      const hasData = await this.contract.hasData(userAddress, categoryId);
      return hasData;
    } catch (error) {
      console.error(`Error checking if user has data: ${error.message}`, { userAddress, category });
      return false;
    }
  }

  /**
   * Get all data categories uploaded by a user
   * @param {string} userAddress - The address of the user
   * @returns {Promise<object[]>} Array of category objects with name and id
   */
  async getUserCategories(userAddress) {
    try {
      console.log(`Getting data categories for user: ${userAddress}`);
      
      // Get raw category IDs from contract
      const categoryIds = await this.contract.getUserCategories(userAddress);
      console.log(`Found ${categoryIds.length} categories for user ${userAddress}`);
      
      // Map IDs to category objects with names
      const categoryNames = Object.entries(this.categories);
      const categories = categoryIds.map(id => {
        const category = categoryNames.find(([_, value]) => value.toString() === id.toString());
        const name = category ? category[0] : `Unknown (${id})`;
        
        return {
          id: Number(id),
          name,
          displayName: this.formatCategoryName(name)
        };
      });
      
      return categories;
    } catch (error) {
      console.error(`Error getting user categories: ${error.message}`, { userAddress });
      return [];
    }
  }
  
  /**
   * Format a category name for display
   * @param {string} name - The category name
   * @returns {string} Formatted category name
   */
  formatCategoryName(name) {
    if (!name) return 'Unknown';
    
    // Convert from UPPER_SNAKE_CASE to Title Case
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Check if a viewer is approved to access a specific data category from an owner
   * @param {string} owner - The address of the data owner
   * @param {string} viewer - The address of the data viewer
   * @param {string|number} category - The data category to check approval for
   * @returns {Promise<boolean>} True if approved, false otherwise
   */
  async isApproved(owner, viewer, category) {
    try {
      // Self-access check: owner should always be able to view their own data
      if (owner && viewer && this.normalizeAddress(owner) === this.normalizeAddress(viewer)) {
        console.log(`Self-access detected for ${owner}, automatically approving`);
        return true;
      }

      // Verify inputs are valid
      if (!owner || !viewer || category === undefined || category === null) {
        console.error('Invalid inputs for isApproved:', { owner, viewer, category });
        return false;
      }

      // Convert category string to enum value if needed
      const categoryId = this.getCategoryId(category);
      if (categoryId === undefined) {
        console.error(`Invalid category: ${category}`);
        return false;
      }

      // Call the contract method
      const result = await this.contract.isApproved(owner, viewer, categoryId);
      return result;
    } catch (error) {
      console.error(`Error checking approval status: ${error.message}`, { owner, viewer, category });
      return false;
    }
  }

  /**
   * Helper method to normalize addresses for comparison
   * @param {string} address - The address to normalize
   * @returns {string} Normalized address in lowercase without 0x prefix
   */
  normalizeAddress(address) {
    if (!address) return '';
    const trimmed = address.trim().toLowerCase();
    return trimmed.startsWith('0x') ? trimmed.substring(2) : trimmed;
  }

  /**
   * Helper method to get category ID from name or ID
   * @param {string|number} category - Category name or ID
   * @returns {number|undefined} Category ID or undefined if invalid
   */
  getCategoryId(category) {
    if (typeof category === 'number') {
      // Check if the number is valid
      const validIds = Object.values(this.categories);
      return validIds.includes(category) ? category : undefined;
    }
    
    if (typeof category === 'string') {
      // Check if it's a valid category name
      return this.categories[category];
    }
    
    return undefined;
  }

  /**
   * Get the content key for a data category of a specific user
   * @param {string} userAddress - The address of the user
   * @param {string|number} category - The data category
   * @returns {Promise<string|null>} The content key, or null if not found or not authorized
   */
  async getContentKey(userAddress, category) {
    try {
      // Convert category string to enum value if needed
      const categoryId = this.getCategoryId(category);
      if (categoryId === undefined) {
        console.error(`Invalid category: ${category}`);
        return null;
      }

      // Check if caller has access
      const viewerAddress = this.signer ? await this.signer.getAddress() : null;
      
      console.log(`Checking access for viewer ${viewerAddress} to ${userAddress}'s ${category} (ID: ${categoryId})`);
      
      // Self-access check - if viewer is the owner, bypass contract approval check
      const isSelfAccess = viewerAddress && 
                          this.normalizeAddress(userAddress) === this.normalizeAddress(viewerAddress);
      
      // Only perform approval check if not self-access
      if (!isSelfAccess) {
        const hasApproval = await this.isApproved(userAddress, viewerAddress, categoryId);
        if (!hasApproval) {
          console.error(`Access denied: ${viewerAddress} is not authorized to view ${category} data of ${userAddress}`);
          throw new Error(`Not authorized to view this data`);
        }
      } else {
        console.log('Self-access detected, proceeding with content key retrieval');
      }

      // Get the content key from the contract
      const contentKey = await this.contract.getContentKey(userAddress, categoryId);
      
      if (!contentKey) {
        console.warn(`No content key found for ${userAddress}'s ${category}`);
        return null;
      }
      
      console.log(`Retrieved content key for ${category}: ${contentKey}`);
      return contentKey;
    } catch (error) {
      console.error(`Error getting content key: ${error.message}`, { userAddress, category });
      
      // Rethrow specific authorization errors
      if (error.message.includes('Not authorized')) {
        throw error;
      }
      
      return null;
    }
  }
  
  /**
   * Get the content URL for a data category of a specific user
   * @param {string} userAddress - The address of the user
   * @param {string|number} category - The data category
   * @returns {Promise<{url: string, key: string}|null>} Object with the URL and key, or null if not found or not authorized
   */
  async getContentUrl(userAddress, category) {
    try {
      // Get the content key first
      const contentKey = await this.getContentKey(userAddress, category);
      
      if (!contentKey) {
        console.warn(`No content key found for ${userAddress}'s ${category}`);
        return null;
      }
      
      // Check if the domain prefix is set
      if (!this.w3DomainPrefix) {
        console.warn('Web3 domain prefix not set. Using default format.');
        return {
          url: `web3://${userAddress}/${contentKey}`,
          key: contentKey,
          formatUsed: 'default'
        };
      }
      
      // Generate the URL with the domain prefix
      const url = `${this.w3DomainPrefix}/${contentKey}`;
      console.log(`Generated content URL: ${url}`);
      
      return {
        url,
        key: contentKey,
        formatUsed: 'standard'
      };
    } catch (error) {
      console.error(`Error getting content URL: ${error.message}`, { userAddress, category });
      
      // Rethrow specific authorization errors
      if (error.message.includes('Not authorized')) {
        throw error;
      }
      
      return null;
    }
  }
  
  /**
   * Get all available URL formats for a content key
   * @param {string} contentKey - The content key
   * @returns {object} Object with different URL formats
   */
  getDebugUrls(contentKey) {
    if (!contentKey || !this.w3DomainPrefix) {
      return {};
    }
    
    const baseUrl = this.w3DomainPrefix;
    const parts = baseUrl.split('/');
    
    // Extract parts of the domain for different formats
    const domainParts = parts[2].split(':');
    const chainId = domainParts.length > 1 ? domainParts[1] : '3337';
    const walletAddress = domainParts.length > 2 ? domainParts[2] : '';
    
    return {
      standard: `${baseUrl}/${contentKey}`,
      alternate1: `https://w3s.link/eth:${chainId}:${walletAddress}/${contentKey}`,
      alternate2: `https://w3link.io/eth:${chainId}:${walletAddress}/${contentKey}`,
      ipfs: `https://w3s.link/ipfs/${contentKey}`
    };
  }
}

module.exports = {
  PersonalDataRegistry,
  CATEGORIES,
  CATEGORY_LABELS
}; 