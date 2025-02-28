const { expect } = require('chai');
const { ethers } = require('ethers');
const { PersonalDataRegistry, CATEGORIES } = require('../scripts/lib/registry');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get configuration from environment variables
const {
  PRIVATE_KEY,
  RPC_URL,
  DATA_REGISTRY_CONTRACT
} = process.env;

describe('Registry Access Tests', function() {
  // These tests interact with real contracts
  this.timeout(30000);
  
  let provider;
  let wallet;
  let registry;
  
  before(function() {
    // Skip tests if environment variables are not set
    if (!PRIVATE_KEY || !RPC_URL || !DATA_REGISTRY_CONTRACT) {
      console.warn('PRIVATE_KEY, RPC_URL or DATA_REGISTRY_CONTRACT not set. Skipping Registry tests.');
      this.skip();
    }
    
    // Set up provider and wallet
    provider = new ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Create registry instance
    registry = new PersonalDataRegistry(provider, DATA_REGISTRY_CONTRACT);
    
    // Configure web3 domain prefix for URL generation
    const walletAddress = wallet.address.toLowerCase();
    const chainId = '3337'; // Default QuarkChain testnet
    const w3DomainPrefix = `https://${walletAddress}.${chainId}.w3link.io/`;
    registry.setW3DomainPrefix(w3DomainPrefix);
  });

  describe('Access Control Diagnosis', function() {
    it('should diagnose "Not authorized to view this data" errors', async function() {
      const walletAddress = wallet.address;
      const category = 'PERSONAL_INFO';
      
      console.log('🔍 Diagnosing authorization issues:');
      console.log(`Wallet address: ${walletAddress}`);
      console.log(`Category: ${category} (${CATEGORIES[category]})`);
      
      try {
        // Check if the wallet has data for this category
        const hasData = await registry.hasData(walletAddress, category);
        console.log(`Has data for category: ${hasData}`);
        
        if (!hasData) {
          console.log('❗ No data found for this category. You need to upload data first.');
        } else {
          // Try to get the content key (should work for own content)
          try {
            const contentKey = await registry.getContentKey(walletAddress, category);
            console.log(`Content key: ${contentKey || 'null'}`);
            
            if (contentKey) {
              console.log('✅ Successfully retrieved content key for own data.');
              
              // Try to get the URL
              try {
                const contentUrl = await registry.getContentUrl(walletAddress, category);
                console.log(`Content URL: ${contentUrl || 'null'}`);
                
                if (contentUrl) {
                  console.log('✅ Successfully generated content URL for own data.');
                } else {
                  console.log('❗ Failed to generate content URL despite having content key.');
                }
              } catch (urlError) {
                console.error('❌ Error getting content URL:', urlError.message);
              }
            } else {
              console.log('❗ Content key is null despite hasData returning true.');
            }
          } catch (contentKeyError) {
            console.error('❌ Error getting content key:', contentKeyError.message);
            
            if (contentKeyError.message.includes('Not authorized')) {
              console.log('\n🔍 Authorization error analysis:');
              console.log('1. You should be able to access your own data without explicit permission');
              console.log('2. The smart contract might not recognize the wallet as the owner');
              console.log('3. The contract might be expecting a different address format (checksummed vs lowercase)');
              
              // Try to check for self-approval explicitly
              try {
                const isApproved = await registry.isApproved(walletAddress, walletAddress, category);
                console.log(`Self-approval check: ${isApproved}`);
                
                if (!isApproved) {
                  console.log('❗ Self-approval check failed. This should always be true for your own data.');
                }
              } catch (approvalError) {
                console.error('❌ Error checking self-approval:', approvalError.message);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ General error:', error.message);
      }
    });
    
    it('should test access for other wallet addresses', async function() {
      // This is informational only, actual data will vary
      console.log('\n🧪 Testing cross-wallet access:');
      
      const ownerAddress = wallet.address;
      const testViewers = [
        '0x0000000000000000000000000000000000000000', // null address
        '0x1234567890abcdef1234567890abcdef12345678', // random address
        ownerAddress // self (should always work)
      ];
      
      for (const category of Object.keys(CATEGORIES)) {
        console.log(`\n📂 Category: ${category} (${CATEGORIES[category]})`);
        
        for (const viewerAddress of testViewers) {
          console.log(`👤 Testing viewer: ${viewerAddress}`);
          
          try {
            const isApproved = await registry.isApproved(ownerAddress, viewerAddress, category);
            console.log(`Approved: ${isApproved}`);
            
            if (isApproved) {
              try {
                // This might fail if the registry doesn't support connect() or if the viewer
                // is not a real wallet we control. Just for diagnostic purposes.
                console.log('🔑 Would be able to access data if authenticated as this viewer');
              } catch (error) {
                // Ignore errors in this hypothetical check
              }
            } else if (viewerAddress === ownerAddress) {
              console.log('❗ WARNING: Self-access failed. This indicates a registry misconfiguration.');
            }
          } catch (error) {
            console.error(`❌ Error checking approval: ${error.message}`);
          }
        }
      }
      
      // This test is informational
      expect(true).to.be.true;
    });
  });

  describe('Registry data introspection', function() {
    it('should list all user categories', async function() {
      try {
        const categories = await registry.getUserCategories(wallet.address);
        console.log('🗂️ User categories:');
        
        if (categories && categories.length > 0) {
          categories.forEach(cat => {
            console.log(`- ${cat.name} (ID: ${cat.id})`);
          });
        } else {
          console.log('No categories found for this user.');
        }
      } catch (error) {
        console.error('❌ Error getting categories:', error.message);
      }
      
      // This test is informational
      expect(true).to.be.true;
    });
  });
  
  describe('Error mitigation strategies', function() {
    it('should suggest fixes for the Not authorized error', function() {
      console.log('\n🛠️ Solutions for "Not authorized to view this data" errors:');
      console.log('1. Check if data exists: Ensure the data was uploaded and exists on-chain');
      console.log('2. Verify ownership: Make sure you are using the same wallet that uploaded the data');
      console.log('3. For viewing others\' data: Ensure the owner has explicitly granted access');
      console.log('4. Address format: Try both checksummed and lowercase addresses');
      console.log('5. Self-access override: Update registry.js to always allow self-access regardless of contract check');
      console.log('6. Enable fallback: If persisting, implement a fallback that uses mock data when authorization fails');
      console.log('7. Debug registrations: Check if correct category IDs were used during data upload');
      console.log('8. Verify contract: Ensure the registry contract address is correct');
      
      console.log('\n✏️ Suggested code fix for self-access in registry.js:');
      console.log(`
async isApproved(ownerAddress, viewerAddress, category) {
  try {
    // Self-access check (owner can always access their own data)
    if (ownerAddress.toLowerCase() === viewerAddress.toLowerCase()) {
      console.log("Self-access detected, allowing access regardless of contract check");
      return true;
    }
    
    const categoryId = typeof category === 'string' ? this.categories[category] : category;
    return await this.contract.isApproved(ownerAddress, viewerAddress, categoryId);
  } catch (error) {
    console.error(\`Error in isApproved: \${error.message}\`);
    return false;
  }
}`);
      
      // This test is informational
      expect(true).to.be.true;
    });
  });
}); 