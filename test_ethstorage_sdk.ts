/**
 * EthStorage SDK Test
 * Tests the ethstorage-sdk package
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { FlatDirectory, EthStorage } from 'ethstorage-sdk';
import * as fs from 'fs';

// Load environment variables from the .env-ethstorage file
const envPath = path.resolve(process.cwd(), '../../.env-ethstorage');
dotenv.config({ path: envPath });

// Get configuration from environment variables
const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
if (!privateKey) {
  console.error('ERROR: ETHSTORAGE_PRIVATE_KEY not set in environment');
  process.exit(1);
}

// Use Sepolia testnet
const RPC_URL = "https://rpc.sepolia.org";
// The EthStorage RPC URL
const ETHSTORAGE_RPC = process.env.ETHSTORAGE_ETH_STORAGE_RPC_URL || 'http://65.108.236.27:9540';

async function testEthStorageSdk(): Promise<void> {
  console.log('EthStorage SDK Test');
  console.log('=================');
  console.log(`Ethereum RPC URL: ${RPC_URL}`);
  console.log(`EthStorage RPC URL: ${ETHSTORAGE_RPC}`);
  
  // Format private key with 0x prefix if needed
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  try {
    // Create EthStorage instance
    console.log("\nCreating EthStorage instance...");
    const ethStorage = await EthStorage.create({
      rpc: RPC_URL,
      ethStorageRpc: ETHSTORAGE_RPC,
      privateKey: formattedPrivateKey
    });
    
    // Test direct upload and download
    const key = "test.txt";
    const data = Buffer.from(`Test data created at ${new Date().toISOString()}`);
    
    console.log(`\nUploading test data with key: ${key}`);
    console.log(`Data: ${data.toString()}`);
    
    await ethStorage.write(key, data);
    console.log("Upload complete!");
    
    console.log(`\nDownloading data with key: ${key}`);
    const readData = await ethStorage.read(key);
    const readContent = readData ? new TextDecoder().decode(readData) : "No data";
    console.log(`Downloaded data: ${readContent}`);
    
    // Check if contents match
    if (readContent === data.toString()) {
      console.log("✅ Content verified successfully! The data matches.");
    } else {
      console.log("❌ Content verification failed! The data doesn't match.");
    }
  } catch (error) {
    console.error("Error in EthStorage SDK test:", error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEthStorageSdk().catch(console.error);
}

export default testEthStorageSdk; 