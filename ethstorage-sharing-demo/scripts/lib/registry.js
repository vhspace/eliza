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
    this.contract = this.contract.connect(signer);
    return this;
  }

  // Upload data for a category
  async uploadData(category, contentKey) {
    const categoryId = typeof category === 'string' ? this.categories[category] : category;
    const tx = await this.contract.uploadData(categoryId, contentKey);
    return tx.wait();
  }

  // Grant access to another user
  async grantAccess(viewerAddress, category) {
    const categoryId = typeof category === 'string' ? this.categories[category] : category;
    const tx = await this.contract.grantAccess(viewerAddress, categoryId);
    return tx.wait();
  }

  // Revoke access from a user
  async revokeAccess(viewerAddress, category) {
    const categoryId = typeof category === 'string' ? this.categories[category] : category;
    const tx = await this.contract.revokeAccess(viewerAddress, categoryId);
    return tx.wait();
  }

  // Check if a user has data for a category
  async hasData(userAddress, category) {
    const categoryId = typeof category === 'string' ? this.categories[category] : category;
    return this.contract.hasData(userAddress, categoryId);
  }

  // Get all categories a user has uploaded
  async getUserCategories(userAddress) {
    const categories = await this.contract.getUserCategories(userAddress);
    return categories.map(cat => ({
      id: Number(cat),
      name: this.categoryLabels[cat]
    }));
  }

  // Get content key for a specific category (requires authorization)
  async getContentKey(ownerAddress, category) {
    const categoryId = typeof category === 'string' ? this.categories[category] : category;
    return this.contract.getContentKey(ownerAddress, categoryId);
  }
  
  // Get full web3 URL for a specific category (requires authorization)
  async getContentUrl(ownerAddress, category) {
    if (!this.w3DomainPrefix) {
      throw new Error("Web3 domain prefix not set. Use setW3DomainPrefix() first.");
    }
    
    const contentKey = await this.getContentKey(ownerAddress, category);
    return `${this.w3DomainPrefix}${contentKey}`;
  }

  // Check if a viewer is approved for a category
  async isApproved(ownerAddress, viewerAddress, category) {
    const categoryId = typeof category === 'string' ? this.categories[category] : category;
    return this.contract.isApproved(ownerAddress, viewerAddress, categoryId);
  }
}

module.exports = {
  PersonalDataRegistry,
  CATEGORIES,
  CATEGORY_LABELS
}; 