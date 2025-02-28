/**
 * Test script for EthStorage integration on testnet
 * 
 * This script demonstrates how to use the EthStorage integration with a testnet.
 * It reads configuration from the .env-ethstorage file in the project root.
 * 
 * To run this script:
 * 1. Make sure you have configured .env-ethstorage with your testnet settings
 * 2. Run with: npx ts-node src/testnet.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { ethers } from 'ethers';
import { EthStoragePlugin } from './plugin';
import { loadEthStorageConfig } from './config';

// Main test function
async function runTest() {
  console.log('Initializing EthStorage plugin using .env-ethstorage configuration...');
  
  // Load configuration from .env-ethstorage file
  const config = loadEthStorageConfig();
  
  // Initialize the plugin with the loaded configuration
  const plugin = new EthStoragePlugin(config);
  console.log(`Plugin initialized with wallet address: ${plugin.getClient().getWalletAddress()}`);
  
  // Log the EthStorage SDK
  console.log('Checking EthStorage SDK methods:');
  const client = plugin.getClient();
  
  // Directly access the internal ethStorage instance for debugging
  // @ts-ignore - Access private property for debugging
  const ethStorageInstance = client['ethStorage'];
  console.log('Available EthStorage methods:', Object.keys(ethStorageInstance));
  
  // Check for specific methods
  const methods = ['store', 'storeBlob', 'retrieve', 'retrieveBlob', 'list', 'listBlobs'];
  methods.forEach(method => {
    console.log(`Method ${method} exists:`, typeof ethStorageInstance[method] === 'function');
  });
  
  // Test storing a small text file
  try {
    console.log('Testing file storage on testnet...');
    const testUsername = 'testuser';
    const testData = {
      facts: [
        { id: 1, text: 'Hello from ElizaOS EthStorage integration test!', confidence: 0.95 },
        { id: 2, text: 'This is a test fact', confidence: 0.87 },
      ],
      timestamp: new Date().toISOString()
    };
    
    console.log('Storing user facts...');
    const facts = testData.facts.map(fact => fact.text);
    const fileId = await plugin.storeFact(testUsername, facts);
    
    if (fileId) {
      console.log(`Successfully stored facts for user ${testUsername}`);
      console.log(`File ID: ${fileId}`);
      
      // Test retrieving the file
      console.log('Testing file retrieval...');
      const retrievedData = await plugin.retrieveUserFacts(fileId);
      
      if (retrievedData) {
        console.log('Successfully retrieved file:');
        console.log('User:', retrievedData.userId);
        console.log('Facts:', JSON.stringify(retrievedData.facts, null, 2));
      } else {
        console.error('Failed to retrieve file.');
      }
      
      // List all files
      console.log('\nListing all files stored by this wallet:');
      const files = await plugin.listFiles();
      console.log(`Found ${files.length} files:`);
      for (const file of files) {
        console.log(`- ${file.name} (${file.contentType}, ${file.size} bytes)`);
      }
    } else {
      console.error('Failed to store facts');
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Unexpected error during test execution:', error);
  process.exit(1);
}); 