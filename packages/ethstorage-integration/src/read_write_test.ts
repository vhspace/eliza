import { promises as fs } from 'fs';
import * as path from 'path';
import { EthStorage, FlatDirectory } from 'ethstorage-sdk';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env-ethstorage' });

// Utility function to pause execution
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Starting EthStorage read/write test...');
  
  // Check required environment variables
  const rpcUrl = process.env.ETHSTORAGE_RPC_URL;
  const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
  
  if (!rpcUrl) {
    console.error('Error: ETHSTORAGE_RPC_URL environment variable not set');
    process.exit(1);
  }
  
  if (!privateKey) {
    console.error('Error: ETHSTORAGE_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }
  
  // Ensure private key has 0x prefix
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  console.log(`Initializing EthStorage with RPC URL: ${rpcUrl}`);
  
  try {
    // Initialize EthStorage properly using the static create method
    const ethStorage = await EthStorage.create({
      rpc: rpcUrl,
      ethStorageRpc: process.env.ETHSTORAGE_ETH_STORAGE_RPC_URL || rpcUrl,
      privateKey: formattedPrivateKey
    });
    
    console.log('EthStorage initialized successfully');
    console.log('Available methods:', Object.keys(ethStorage));
    console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ethStorage)));
    
    // Generate test data with unique identifier to make sure we're reading the correct data
    const uniqueId = crypto.randomBytes(4).toString('hex');
    const testData = Buffer.from(`Test data with unique ID: ${uniqueId} at ${new Date().toISOString()}`);
    const key = `test-${uniqueId}`;  // Remove the file extension
    
    console.log(`Generated test data with unique ID: ${uniqueId}`);
    console.log(`Test data size: ${testData.length} bytes`);
    console.log(`Test data content: ${testData.toString()}`);
    console.log(`Using key: ${key}`);
    
    // Test write operation
    console.log('Writing data to EthStorage...');
    if (typeof ethStorage.write !== 'function') {
      console.error('Error: ethStorage.write is not a function');
      console.log('Available methods:', Object.keys(ethStorage));
      console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ethStorage)));
      process.exit(1);
    }
    
    try {
      const writeResult = await ethStorage.write(key, testData);
      console.log('Write operation successful:', writeResult);
      
      // Generate and display the web3:// URL
      const contractAddress = ethStorage.contractAddr;
      if (contractAddress) {
        const web3Url = `web3://${contractAddress}/${key}`;
        console.log('Web3 URL:', web3Url);
        console.log('This URL can be used to access the content from any web3-enabled browser or application.');
      } else {
        console.log('Could not generate web3:// URL: contract address not available');
      }
      
      // Wait for the transaction to be confirmed on the blockchain - increase wait time
      console.log('Waiting for blockchain confirmation (60 seconds)...');
      console.log('This delay is necessary to ensure the data is confirmed on the blockchain.');
      console.log('You can view the transaction status on Etherscan or a similar blockchain explorer.');
      console.log('During this time, you can try to access the content using the web3:// URL in a compatible browser.');
      await sleep(60000); // 60 second delay
      
      // Try to read the data back
      console.log(`Attempting to read data with key: ${key}`);
      if (typeof ethStorage.read !== 'function') {
        console.error('Error: ethStorage.read is not a function');
        console.log('Available methods:', Object.keys(ethStorage));
        console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ethStorage)));
        process.exit(1);
      }
      
      // Retry logic for read operation
      let readData = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        attempts++;
        try {
          console.log(`Read attempt ${attempts}/${maxAttempts}...`);
          console.log(`Using key: ${key}`);
          readData = await ethStorage.read(key);
          if (readData) {
            console.log('Read returned data!');
            break;
          }
          console.log('No data returned, retrying after delay...');
          await sleep(20000); // Increase to 20 second delay between attempts
        } catch (readError) {
          console.error(`Error in read attempt ${attempts}:`, readError.message);
          console.log('Retrying after delay...');
          await sleep(20000); // Increase to 20 second delay between attempts
        }
      }
      
      if (readData) {
        console.log('Successfully read data from EthStorage');
        console.log('Read data size:', readData.length, 'bytes');
        console.log('Read data content:', readData.toString());
        
        // Verify data integrity
        const originalContent = testData.toString();
        const readContent = readData.toString();
        
        if (originalContent === readContent) {
          console.log('SUCCESS: Read data matches original data');
        } else {
          console.error('ERROR: Read data does not match original data');
          console.log('Original data:', originalContent);
          console.log('Read data:', readContent);
        }
      } else {
        console.error('Failed to read data after', maxAttempts, 'attempts');
      }
      
    } catch (writeError) {
      console.error('Error writing data to EthStorage:', writeError.message);
      if (writeError.stack) {
        console.error('Stack trace:', writeError.stack);
      }
    }
    
  } catch (error) {
    console.error('Error initializing EthStorage:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
}); 