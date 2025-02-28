/**
 * Direct test for EthStorage SDK
 * This test uses the SDK directly with the official EthStorage endpoints
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
// Import the SDK directly
import { EthStorage } from 'ethstorage-sdk';

// Load environment variables from root .env-ethstorage (just for the private key)
dotenv.config({ path: '../../.env-ethstorage' });

// Official EthStorage endpoints from documentation
const OFFICIAL_ETH_STORAGE_RPC = "http://65.108.236.27:9540";
const OFFICIAL_BLOB_ARCHIVER_API = "http://65.108.236.27:9645";
const OFFICIAL_CONTRACT_ADDRESS = "0x804C520d3c084C805E37A35E90057Ac32831F96f";

async function main() {
  // Check required environment variables
  const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('Error: Missing private key environment variable. Please check .env-ethstorage file');
    console.error('Required variable: ETHSTORAGE_PRIVATE_KEY');
    process.exit(1);
  }
  
  console.log('EthStorage SDK Test - Using official EthStorage endpoints');
  console.log('=================================================================');
  console.log(`EthStorage RPC URL: ${OFFICIAL_ETH_STORAGE_RPC}`);
  console.log(`Blob Archiver API: ${OFFICIAL_BLOB_ARCHIVER_API}`);
  console.log(`Contract Address: ${OFFICIAL_CONTRACT_ADDRESS}`);
  
  // Format private key with 0x prefix if needed
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  try {
    // Create a test file
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const testFilePath = path.join(os.tmpdir(), 'ethstorage-test.txt');
    await fs.writeFile(testFilePath, testContent, 'utf8');
    console.log(`Created test file at ${testFilePath} with content: ${testContent}`);
    
    // Read the file content
    const fileContent = await fs.readFile(testFilePath, 'utf8');
    console.log(`File content: ${fileContent}`);
    
    // Initialize the EthStorage SDK as per documentation
    console.log('\nInitializing EthStorage SDK...');
    
    try {
      const ethStorage = await EthStorage.create({
        rpc: OFFICIAL_ETH_STORAGE_RPC, 
        ethStorageRpc: OFFICIAL_ETH_STORAGE_RPC,
        privateKey: formattedPrivateKey,
        contractAddr: OFFICIAL_CONTRACT_ADDRESS
      });
      
      console.log('EthStorage SDK initialized successfully');
      console.log(`Using contract address: ${ethStorage.contractAddr}`);
      
      // Try to write data
      console.log('\nTrying to write data to EthStorage...');
      const key = `test_${Date.now()}.txt`;
      const data = Buffer.from(fileContent);
      
      try {
        // Estimate cost first
        console.log('Estimating cost...');
        const cost = await ethStorage.estimateCost(key, data);
        console.log(`Estimated cost - Gas: ${cost.gasCost}, Storage: ${cost.storageCost}`);
        
        // Write the data
        console.log(`Writing data with key: ${key}`);
        await ethStorage.write(key, data);
        console.log('Write successful!');
        
        // Try to read the data back
        console.log('\nTrying to read data from EthStorage...');
        const readData = await ethStorage.read(key);
        
        if (readData) {
          const readContent = readData.toString();
          console.log(`Read content: ${readContent}`);
          console.log(`Content verification: ${readContent === fileContent ? 'SUCCESS' : 'FAILED'}`);
        } else {
          console.error('Failed to read data from EthStorage');
        }
      } catch (opError) {
        console.error('Error during EthStorage operation:', opError);
      }
      
    } catch (sdkError) {
      console.error('Error initializing EthStorage SDK:', sdkError);
    }
    
    // Clean up
    try {
      await fs.unlink(testFilePath);
      console.log(`\nCleaned up test file: ${testFilePath}`);
    } catch (cleanupError) {
      console.warn(`Failed to clean up test file: ${cleanupError}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default main; 