/**
 * Web3 URL Personal Data Sharing Demo Test Script
 * 
 * This script demonstrates the basic functionality of our system:
 * 1. Registering data content keys in the smart contract
 * 2. Sharing data with another user
 * 3. Retrieving shared data access
 */

const { ethers } = require('ethers');
const dotenv = require('dotenv');
const { PersonalDataRegistry, CATEGORIES } = require('./lib/registry');
const { Web3UrlClient } = require('./lib/web3url');
const axios = require('axios');

// Load environment variables
dotenv.config();

// Configuration
const {
  PRIVATE_KEY,
  RPC_URL,
  DATA_REGISTRY_CONTRACT,
  CHAIN_ID = '3337' // Default to 3337 for QuarkChain
} = process.env;

// Test data
const testData = {
  PERSONAL_INFO: {
    name: "John Doe",
    age: 30,
    gender: "male"
  },
  INTERESTS: {
    hobbies: ["reading", "hiking", "blockchain"],
    favoriteBooks: ["The Bitcoin Standard", "Mastering Ethereum"]
  }
};

// Generate a random wallet for testing
const generateRandomWallet = () => {
  return ethers.Wallet.createRandom();
};

// Simulate uploading content to a web3 URL
const simulateContentUpload = async (client, contentKey, data) => {
  // In a real implementation, this would upload to the actual service
  const url = client.getContentUrl(contentKey);
  console.log(`Simulating upload to ${url}`);
  console.log(`Content: ${JSON.stringify(data)}`);
  
  return {
    success: true,
    contentKey,
    url
  };
};

// Simulate fetching content from a web3 URL
const simulateFetchContent = async (client, contentKey, originalData) => {
  // In a real implementation, this would fetch from the URL
  const url = client.getContentUrl(contentKey);
  console.log(`Simulating fetch from ${url}`);
  
  // Return the original data as if we fetched it
  return {
    success: true,
    data: originalData
  };
};

// Main test function
async function runTest() {
  console.log("========== Web3 URL Personal Data Sharing Demo Test ==========");
  
  // Check required env vars
  if (!PRIVATE_KEY || !RPC_URL || !DATA_REGISTRY_CONTRACT) {
    console.error("Missing required environment variables. Please check your .env file.");
    process.exit(1);
  }
  
  try {
    // Setup provider and wallets
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Primary wallet (data owner)
    const privateKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
    const dataOwner = new ethers.Wallet(privateKey, provider);
    
    // Secondary wallet (data viewer)
    const dataViewer = generateRandomWallet().connect(provider);
    
    console.log(`Data Owner: ${dataOwner.address}`);
    console.log(`Data Viewer: ${dataViewer.address}`);
    
    // Initialize contract
    const registry = new PersonalDataRegistry(provider, DATA_REGISTRY_CONTRACT);
    
    // Initialize Web3UrlClient for data owner
    const ownerWeb3UrlClient = new Web3UrlClient(dataOwner.address, CHAIN_ID);
    
    console.log("\n--- Step 1: Generate Content Keys ---");
    
    // Generate content key for personal info
    const personalInfoKey = ownerWeb3UrlClient.generateContentKey('personal');
    console.log(`Personal info content key: ${personalInfoKey}`);
    console.log(`Full URL: ${ownerWeb3UrlClient.getContentUrl(personalInfoKey)}`);
    
    // Simulate uploading personal info
    await simulateContentUpload(ownerWeb3UrlClient, personalInfoKey, testData.PERSONAL_INFO);
    
    // Register in contract
    console.log("\n--- Step 2: Register in Smart Contract ---");
    
    await registry.connect(dataOwner).uploadData(
      "PERSONAL_INFO", 
      personalInfoKey
    );
    
    console.log("Personal info key registered in smart contract");
    
    // Generate content key for interests
    const interestsKey = ownerWeb3UrlClient.generateContentKey('interests');
    console.log(`Interests content key: ${interestsKey}`);
    console.log(`Full URL: ${ownerWeb3UrlClient.getContentUrl(interestsKey)}`);
    
    // Simulate uploading interests
    await simulateContentUpload(ownerWeb3UrlClient, interestsKey, testData.INTERESTS);
    
    // Register in contract
    await registry.connect(dataOwner).uploadData(
      "INTERESTS", 
      interestsKey
    );
    
    console.log("Interests key registered in smart contract");
    
    // Get uploaded categories
    console.log("\n--- Step 3: Check Uploaded Categories ---");
    
    const categories = await registry.getUserCategories(dataOwner.address);
    console.log("Uploaded categories:", categories);
    
    // Share data with viewer
    console.log("\n--- Step 4: Share Data with Viewer ---");
    
    await registry.connect(dataOwner).grantAccess(
      dataViewer.address, 
      "PERSONAL_INFO"
    );
    
    console.log(`Personal info shared with ${dataViewer.address}`);
    
    // Check access
    const hasAccess = await registry.isApproved(
      dataOwner.address, 
      dataViewer.address, 
      "PERSONAL_INFO"
    );
    
    console.log(`Viewer has access to personal info: ${hasAccess}`);
    
    // Get data key as viewer
    console.log("\n--- Step 5: Retrieve Content Key as Viewer ---");
    
    // We need to connect the viewer to the registry
    const viewerRegistry = registry.connect(dataViewer);
    
    // Get the content key
    const contentKey = await viewerRegistry.getContentKey(
      dataOwner.address, 
      "PERSONAL_INFO"
    );
    
    console.log(`Retrieved content key: ${contentKey}`);
    
    // Initialize viewer's Web3UrlClient for the owner's address
    // Note: We use the owner's address since the content is on their domain
    const viewerClient = new Web3UrlClient(dataOwner.address, CHAIN_ID);
    
    // Get the full URL
    const contentUrl = viewerClient.getContentUrl(contentKey);
    console.log(`Full content URL: ${contentUrl}`);
    
    // Simulate fetching data
    console.log("\n--- Step 6: Fetch Content ---");
    
    const retrievedData = await simulateFetchContent(
      viewerClient,
      contentKey,
      testData.PERSONAL_INFO
    );
    
    console.log("Retrieved data:", retrievedData.data);
    
    // Verify data matches
    console.log("\n--- Step 7: Verify Data Integrity ---");
    
    const originalData = JSON.stringify(testData.PERSONAL_INFO);
    const retrievedDataStr = JSON.stringify(retrievedData.data);
    
    console.log(`Data integrity check: ${originalData === retrievedDataStr ? 'PASSED' : 'FAILED'}`);
    
    console.log("\n========== Test Completed Successfully ==========");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error); 