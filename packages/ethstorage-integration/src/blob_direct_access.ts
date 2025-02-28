import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import fetch from 'node-fetch';
import { ethers } from 'ethers';

// Load environment variables
dotenv.config({ path: '.env-ethstorage' });

async function main() {
  // Check required environment variables
  const rpcUrl = process.env.ETHSTORAGE_RPC_URL;
  const ethStorageRpcUrl = process.env.ETHSTORAGE_ETH_STORAGE_RPC_URL;
  // Hardcode the blob archiver URL for testing
  const blobArchiverUrl = "http://65.108.236.27:9645";
  const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
  const contractAddress = process.env.ETHSTORAGE_CONTRACT_ADDRESS || '0x804C520d3c084C805E37A35E90057Ac32831F96f';
  
  if (!rpcUrl || !privateKey) {
    console.error('Error: ETHSTORAGE_RPC_URL and ETHSTORAGE_PRIVATE_KEY must be set in .env-ethstorage');
    process.exit(1);
  }
  
  // Format private key with 0x prefix if needed
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  // Command line arguments
  const command = process.argv[2]?.toLowerCase();
  const fileKey = process.argv[3];
  
  if (!command) {
    printHelp();
    return;
  }
  
  try {
    // Initialize ethers.js provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(formattedPrivateKey, provider);
    console.log(`Using wallet address: ${wallet.address}`);

    // Log the available URLs
    console.log(`Using RPC URL: ${rpcUrl}`);
    console.log(`Using EthStorage RPC URL: ${ethStorageRpcUrl || 'same as RPC URL'}`);
    console.log(`Using Blob Archiver API: ${blobArchiverUrl || 'not specified'}`);
    console.log(`Using contract address: ${contractAddress}`);
    
    switch (command) {
      case 'help':
        printHelp();
        break;
        
      case 'read':
      case 'download':
        if (!fileKey) {
          console.error(`Error: File key required for ${command} command`);
          console.log(`Usage: node dist/blob_direct_access.js ${command} <fileKey> [outputPath]`);
          process.exit(1);
        }
        
        // For download command, get output path
        const outputPath = command === 'download' ? (process.argv[4] || `./${fileKey}`) : null;
        
        // Try multiple methods to read the file
        await readFileWithMultipleMethods(wallet, contractAddress, fileKey, outputPath, blobArchiverUrl);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function printHelp() {
  console.log('EthStorage Blob Direct Access Tool');
  console.log('----------------------------------');
  console.log('Commands:');
  console.log('  help                        - Show this help message');
  console.log('  read <fileKey>              - Read and display file content');
  console.log('  download <fileKey> [path]   - Download file to local filesystem');
}

async function readFileWithMultipleMethods(wallet, contractAddress, fileKey, outputPath, blobArchiverUrl) {
  console.log(`Reading file with key: ${fileKey}`);
  
  // Method 1: Try the blob archiver API if available
  if (blobArchiverUrl) {
    try {
      console.log(`Method 1: Trying Blob Archiver API at ${blobArchiverUrl}...`);
      
      // Construct the URL for the blob archiver API
      // Format is typically /blob/{contractAddress}/{ownerAddress}/{key}
      const url = `${blobArchiverUrl}/blob/${contractAddress}/${wallet.address}/${fileKey}`;
      console.log(`Requesting: ${url}`);
      
      const response = await fetch(url);
      
      if (response.ok) {
        console.log(`Success! Status: ${response.status}`);
        const data = await response.arrayBuffer();
        const buffer = Buffer.from(data);
        
        console.log(`File found! Size: ${buffer.length} bytes`);
        
        if (outputPath) {
          // If download command, save the file
          await saveFile(buffer, outputPath);
        } else {
          // If read command, display the content
          displayFileContent(buffer);
        }
        
        return;
      } else {
        console.error(`Blob Archiver API returned status ${response.status}: ${response.statusText}`);
        console.log('Response body:', await response.text());
      }
    } catch (error) {
      console.error(`Error using Blob Archiver API: ${error.message}`);
    }
  } else {
    console.log('Method 1: Skipping Blob Archiver API (URL not specified)');
  }
  
  console.log('All methods failed to read the file.');
}

async function saveFile(data, outputPath) {
  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write the file
    await fs.writeFile(outputPath, data);
    console.log(`File downloaded successfully to ${outputPath}`);
    console.log(`Size: ${data.length} bytes`);
  } catch (error) {
    console.error(`Error saving file: ${error.message}`);
  }
}

function displayFileContent(data) {
  // Detect if it's a text file
  let isText = true;
  for (let i = 0; i < Math.min(data.length, 1000); i++) {
    if (data[i] === 0 || (data[i] > 127 && data[i] < 160)) {
      isText = false;
      break;
    }
  }
  
  if (isText) {
    const text = data.toString('utf8');
    console.log('\n--- File Contents ---');
    console.log(text);
    console.log('--- End of File ---');
  } else {
    console.log(`File appears to be binary. Size: ${data.length} bytes`);
    console.log('Use download command to save it.');
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 