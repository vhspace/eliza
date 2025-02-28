import { EthStorage } from 'ethstorage-sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ethers } from 'ethers';

// Load environment variables
dotenv.config({ path: '.env-ethstorage' });

async function main() {
  // Check required environment variables
  const rpcUrl = process.env.ETHSTORAGE_RPC_URL;
  const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
  
  if (!rpcUrl || !privateKey) {
    console.error('Error: ETHSTORAGE_RPC_URL and ETHSTORAGE_PRIVATE_KEY must be set in .env-ethstorage');
    process.exit(1);
  }
  
  // Format private key with 0x prefix if needed
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  try {
    // Create a wallet from the private key
    const wallet = new ethers.Wallet(formattedPrivateKey);
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Initialize EthStorage using the static create method
    console.log('Initializing EthStorage...');
    const ethStorage = await EthStorage.create({
      rpc: rpcUrl,
      ethStorageRpc: process.env.ETHSTORAGE_ETH_STORAGE_RPC_URL || rpcUrl,
      privateKey: formattedPrivateKey
    });
    
    console.log('EthStorage instance created successfully');
    console.log('Contract address:', ethStorage.contractAddr);
    
    // Log available methods for debugging
    console.log('Available methods:', Object.keys(ethStorage));
    console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ethStorage)));
    
    // Command line arguments
    const command = process.argv[2]?.toLowerCase();
    const fileKey = process.argv[3];
    
    if (!command) {
      printHelp();
      return;
    }
    
    switch (command) {
      case 'help':
        printHelp();
        break;
        
      case 'read':
        if (!fileKey) {
          console.error('Error: File key required for read command');
          console.log('Usage: node dist/direct_access.js read <fileKey>');
          process.exit(1);
        }
        await readFile(ethStorage, fileKey);
        break;
        
      case 'download':
        if (!fileKey) {
          console.error('Error: File key required for download command');
          console.log('Usage: node dist/direct_access.js download <fileKey> [outputPath]');
          process.exit(1);
        }
        const outputPath = process.argv[4] || `./${fileKey}`;
        await downloadFile(ethStorage, fileKey, outputPath);
        break;
        
      case 'write':
        if (!fileKey) {
          console.error('Error: File key required for write command');
          console.log('Usage: node dist/direct_access.js write <fileKey> <inputFilePath>');
          process.exit(1);
        }
        const inputPath = process.argv[4];
        if (!inputPath) {
          console.error('Error: Input file path required for write command');
          console.log('Usage: node dist/direct_access.js write <fileKey> <inputFilePath>');
          process.exit(1);
        }
        await writeFile(ethStorage, fileKey, inputPath);
        break;
        
      case 'url':
        if (!fileKey) {
          console.error('Error: File key required for url command');
          console.log('Usage: node dist/direct_access.js url <fileKey>');
          process.exit(1);
        }
        getFileUrl(ethStorage, fileKey);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

function printHelp() {
  console.log('EthStorage Direct Access Tool');
  console.log('-----------------------------');
  console.log('Commands:');
  console.log('  help                        - Show this help message');
  console.log('  read <fileKey>              - Read and display file content');
  console.log('  download <fileKey> [path]   - Download file to local filesystem');
  console.log('  write <fileKey> <filePath>  - Upload a file to EthStorage');
  console.log('  url <fileKey>               - Display web3:// URL for a file');
}

async function readFile(ethStorage: EthStorage, fileKey: string) {
  console.log(`Reading file with key: ${fileKey}`);
  
  try {
    // Attempt read with retries
    const maxRetries = 3;
    let lastError = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Read attempt ${i + 1}/${maxRetries}...`);
        const data = await ethStorage.read(fileKey);
        
        if (!data) {
          console.log('No data returned, retrying...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        
        console.log(`File found! Size: ${data.length} bytes`);
        
        // Detect if it's a text file
        let isText = true;
        for (let j = 0; j < Math.min(data.length, 1000); j++) {
          if (data[j] === 0 || (data[j] > 127 && data[j] < 160)) {
            isText = false;
            break;
          }
        }
        
        if (isText) {
          const text = new TextDecoder().decode(data);
          console.log('\n--- File Contents ---');
          console.log(text);
          console.log('--- End of File ---');
        } else {
          console.log('File appears to be binary. Use download command to save it.');
        }
        
        return;
      } catch (error) {
        lastError = error;
        console.error(`Error in read attempt ${i + 1}:`, error.message);
        
        if (i < maxRetries - 1) {
          console.log('Retrying after delay...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    console.error(`Failed to read file after ${maxRetries} attempts: ${lastError?.message}`);
  } catch (error) {
    console.error('Error reading file:', error.message);
  }
}

async function downloadFile(ethStorage: EthStorage, fileKey: string, outputPath: string) {
  console.log(`Downloading file with key: ${fileKey} to ${outputPath}`);
  
  try {
    // Attempt read with retries
    const maxRetries = 3;
    let lastError = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`Download attempt ${i + 1}/${maxRetries}...`);
        const data = await ethStorage.read(fileKey);
        
        if (!data) {
          console.log('No data returned, retrying...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        await fs.mkdir(dir, { recursive: true });
        
        // Write the file
        await fs.writeFile(outputPath, data);
        console.log(`File downloaded successfully to ${outputPath}`);
        console.log(`Size: ${data.length} bytes`);
        return;
      } catch (error) {
        lastError = error;
        console.error(`Error in download attempt ${i + 1}:`, error.message);
        
        if (i < maxRetries - 1) {
          console.log('Retrying after delay...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    console.error(`Failed to download file after ${maxRetries} attempts: ${lastError?.message}`);
  } catch (error) {
    console.error('Error downloading file:', error.message);
  }
}

async function writeFile(ethStorage: EthStorage, fileKey: string, inputPath: string) {
  console.log(`Uploading file ${inputPath} to EthStorage with key: ${fileKey}`);
  
  try {
    // Read file from disk
    const data = await fs.readFile(inputPath);
    console.log(`File size: ${data.length} bytes`);
    
    // Upload to EthStorage
    console.log('Uploading to EthStorage...');
    const result = await ethStorage.write(fileKey, data);
    console.log('Upload successful!');
    console.log('Transaction result:', result);
    
    // Display the web3:// URL
    const contractAddress = ethStorage.contractAddr;
    if (contractAddress) {
      const web3Url = `web3://${contractAddress}/${fileKey}`;
      console.log('Web3 URL:', web3Url);
    }
  } catch (error) {
    console.error('Error uploading file:', error.message);
  }
}

function getFileUrl(ethStorage: EthStorage, fileKey: string) {
  const contractAddress = ethStorage.contractAddr;
  if (!contractAddress) {
    console.error('Cannot generate URL: contract address not available');
    return;
  }
  
  const web3Url = `web3://${contractAddress}/${fileKey}`;
  console.log('Web3 URL:', web3Url);
  
  // Generate alternative access methods
  console.log('\nAlternative access methods:');
  console.log(`1. Command to read: node dist/direct_access.js read ${fileKey}`);
  console.log(`2. Command to download: node dist/direct_access.js download ${fileKey} <path>`);
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 