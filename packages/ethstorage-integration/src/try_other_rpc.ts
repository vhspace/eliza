import { EthStorage } from 'ethstorage-sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import { ethers } from 'ethers';

// Load environment variables
dotenv.config({ path: '.env-ethstorage' });

// RPC providers to try - only use the official EthStorage RPC endpoint
const RPC_PROVIDERS = [
  // Official EthStorage ES-Geth RPC endpoint from documentation
  "http://65.108.236.27:9540"
];

// Official EthStorage Blob Archiver API from documentation
const BLOB_ARCHIVER_API = "http://65.108.236.27:9645";

// Official EthStorage contract address from documentation
const STORAGE_CONTRACT_ADDRESS = "0x804C520d3c084C805E37A35E90057Ac32831F96f";

async function testProviders() {
  const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: ETHSTORAGE_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }
  
  // Format private key with 0x prefix if needed
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(formattedPrivateKey);
  console.log(`Using wallet address: ${wallet.address}`);
  
  // File key to test reading
  const testFileKey = "test-file.txt";
  
  // Try each provider
  for (const provider of RPC_PROVIDERS) {
    if (provider.includes("REPLACE_WITH_YOUR_API_KEY")) {
      console.log(`\nSkipping provider that requires API key: ${provider}`);
      continue;
    }
    
    console.log(`\n\nTesting provider: ${provider}`);
    
    try {
      console.log('Initializing EthStorage...');
      const ethStorage = await EthStorage.create({
        rpc: provider,
        ethStorageRpc: provider,
        privateKey: formattedPrivateKey
      });
      
      console.log('EthStorage initialized successfully');
      console.log('Contract address:', ethStorage.contractAddr);
      
      // Try to read a file
      console.log(`Attempting to read file: ${testFileKey}`);
      
      try {
        const data = await ethStorage.read(testFileKey);
        if (data) {
          console.log(`✅ SUCCESS! File read successful. Size: ${data.length} bytes`);
          console.log(`First 100 bytes: ${data.slice(0, 100).toString()}`);
          
          // This provider works! Save it for future use
          const rpcInfo = `
# Working RPC Provider (tested on ${new Date().toISOString()})
WORKING_RPC_URL=${provider}
`;
          await fs.appendFile('working_rpc.txt', rpcInfo);
          console.log(`✅ Saved working provider to working_rpc.txt`);
          
          // Exit early if we found a working provider
          return;
        } else {
          console.log('❌ No data returned');
        }
      } catch (error) {
        console.error(`❌ Error reading file: ${error.message}`);
        
        // Check if we have a different error than the "missing revert data"
        if (!error.message.includes("missing revert data")) {
          console.log(`📝 DIFFERENT ERROR TYPE! This provider might be returning more information.`);
          console.log(`Error details: ${JSON.stringify(error)}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error initializing with provider: ${error.message}`);
    }
  }
  
  console.log('\n\n⚠️ None of the tested providers worked successfully');
  console.log('Try adding your own RPC provider endpoints to the RPC_PROVIDERS array');
}

// Fix the decodeTransaction function to better understand the read function

async function decodeTransaction() {
  // Example transaction data from the error message
  const txData = "0xbea94b8bfb8ede34cf731008fa1ae40f3912a27e1b3607fa265310b7fd76fabdfe7b36c10000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002d";
  
  console.log('\n\nDecoding transaction data:');
  console.log('Transaction data:', txData);
  
  try {
    // The first 4 bytes (8 hex characters after 0x) is the function selector
    const functionSelector = txData.slice(0, 10);
    console.log('Function selector:', functionSelector);
    
    // Try to find what function this might be
    const knownSelectors = {
      '0xbea94b8b': 'read(string)'
    };
    
    const functionName = knownSelectors[functionSelector] || 'Unknown function';
    console.log('Function name:', functionName);
    
    // More detailed decoding
    if (functionSelector === '0xbea94b8b') {
      // This is how Solidity encodes a dynamic string in a function call:
      // 1. First 32 bytes after selector: offset to string data (usually 32 in hex)
      // 2. At that offset: 32 bytes for string length
      // 3. Then the actual string data, padded to 32-byte boundary
      
      // Extract the 32 bytes after the selector (position of string data)
      const offsetHex = txData.slice(10, 74);
      const offset = parseInt(offsetHex, 16);
      console.log('Offset to string data:', offset, '(hex:', offsetHex, ')');
      
      // Extract the 32 bytes at the offset position (string length)
      const startPos = 10 + offset * 2; // *2 because each byte is 2 hex chars
      const lengthHex = txData.slice(startPos, startPos + 64);
      const length = parseInt(lengthHex, 16);
      console.log('String length:', length, '(hex:', lengthHex, ')');
      
      // Extract the actual string data
      if (length > 0) {
        const stringDataHex = txData.slice(startPos + 64, startPos + 64 + length * 2);
        // Convert hex to ASCII
        let stringData = '';
        for (let i = 0; i < stringDataHex.length; i += 2) {
          stringData += String.fromCharCode(parseInt(stringDataHex.substr(i, 2), 16));
        }
        console.log('String data (file key):', stringData);
        
        // Examine the "rest of data" after the string
        if (startPos + 64 + length * 2 < txData.length) {
          const restData = txData.slice(startPos + 64 + length * 2);
          console.log('Additional data after string:', restData);
        }
      } else {
        console.log('String appears to be empty.');
        
        // Let's examine the whole transaction data more carefully
        for (let i = 0; i < txData.length; i += 64) {
          const chunk = txData.slice(i, Math.min(i + 64, txData.length));
          console.log(`Chunk at position ${i}:`, chunk);
        }
      }
    }
    
    // Try another approach: Analyze the last part of the transaction data
    // It might contain the actual filename "test-file.txt"
    const possibleFilename = "test-file.txt";
    let hexFilename = '';
    for (let i = 0; i < possibleFilename.length; i++) {
      hexFilename += possibleFilename.charCodeAt(i).toString(16).padStart(2, '0');
    }
    console.log('Hex representation of "test-file.txt":', hexFilename);
    
    // Check if this hex string is in the transaction data
    const fileNamePos = txData.indexOf(hexFilename);
    if (fileNamePos !== -1) {
      console.log('Found filename at position:', fileNamePos);
    } else {
      console.log('Filename not found in transaction data');
    }
  } catch (error) {
    console.error('Error decoding transaction:', error);
  }
}

// Run tests
async function main() {
  console.log('Testing different RPC providers with EthStorage');
  console.log('==============================================');
  
  // First decode the example transaction
  await decodeTransaction();
  
  // Then test different providers
  await testProviders();
}

// Run the main function
main().catch(console.error); 