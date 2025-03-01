#!/usr/bin/env node

/**
 * Script to load encrypted data from ethstorage, decrypt it using Lit Protocol,
 * and save it for agent use.
 * 
 * Usage:
 *   node scripts/load-ethstorage-data.js
 * 
 * Environment variables are loaded from the .env file in the project root,
 * which should contain:
 *   ETH_PRIVATE_KEY=your-private-key
 *   ETH_STORAGE_FILE_IDS=file1,file2,file3
 *   LIT_CONTRACT_ADDRESS=0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986 (optional)
 *   LIT_HELPER_API_URL=http://localhost:3000 (optional)
 *   LIT_CHAIN=sepolia (optional)
 *   OUTPUT_DIR=./characters/data (optional)
 */

// Load environment variables from .env file
require('dotenv').config();

const { loadAgentDataFromEthStorage } = require('../packages/lit-protocol-service/dist/agent-helper');
const path = require('path');

async function main() {
  console.log('Loading encrypted data from ethstorage...');
  
  // Validate required environment variables
  if (!process.env.ETH_PRIVATE_KEY) {
    console.error('ETH_PRIVATE_KEY environment variable is required in .env file');
    process.exit(1);
  }
  
  if (!process.env.ETH_STORAGE_FILE_IDS) {
    console.error('ETH_STORAGE_FILE_IDS environment variable is required in .env file');
    process.exit(1);
  }
  
  // Configure the agent data loader
  const config = {
    contractAddress: process.env.LIT_CONTRACT_ADDRESS || '0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986',
    helperApiUrl: process.env.LIT_HELPER_API_URL || 'http://localhost:3000',
    chain: process.env.LIT_CHAIN || 'sepolia',
    walletPrivateKey: process.env.ETH_PRIVATE_KEY,
    fileIds: process.env.ETH_STORAGE_FILE_IDS.split(',').filter(id => id.trim()),
    outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'characters', 'data'),
  };
  
  console.log(`Configuration:
  - Contract: ${config.contractAddress}
  - Helper API: ${config.helperApiUrl}
  - Chain: ${config.chain}
  - Files to fetch: ${config.fileIds.length}
  - Output directory: ${config.outputDir}
  - Wallet address: ${getWalletAddressPreview(config.walletPrivateKey)}
  `);
  
  try {
    // Load and decrypt the data
    const savedFilePaths = await loadAgentDataFromEthStorage(config);
    
    if (savedFilePaths.length === 0) {
      console.log('No files were decrypted and saved.');
      process.exit(0);
    }
    
    console.log(`Successfully decrypted and saved ${savedFilePaths.length} files:`);
    savedFilePaths.forEach(filePath => {
      console.log(`- ${filePath}`);
    });
    
    console.log('\nYou can now use this data with your agents by updating their knowledge configs.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to load and decrypt data:', error);
    process.exit(1);
  }
}

/**
 * Get a preview of the wallet address (last 4 characters) for logging
 * @param privateKey The private key to derive the address from
 * @returns A string with the last 4 characters of the address
 */
function getWalletAddressPreview(privateKey) {
  try {
    // This is a simplified preview to avoid introducing ethers as a direct dependency here
    return `0x...${privateKey.slice(-4)}`;
  } catch (error) {
    return 'Invalid key format';
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 