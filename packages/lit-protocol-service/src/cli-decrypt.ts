#!/usr/bin/env node
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { LitProtocolService } from './lit-protocol';

dotenv.config();

/**
 * Command-line tool to list and decrypt files from ethstorage
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  // Load environment variables
  const contractAddress = process.env.ETH_STORAGE_CONTRACT_ADDRESS || '0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986';
  const helperApiUrl = process.env.HELPER_API_URL || 'http://localhost:3000';
  const chain = process.env.CHAIN || 'sepolia';
  const network = process.env.LIT_NETWORK || 'datil';
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  const outputDir = process.env.OUTPUT_DIR || './decrypted-files';
  
  if (!privateKey && command !== 'help') {
    console.error('Error: WALLET_PRIVATE_KEY is required in .env file');
    process.exit(1);
  }
  
  // Initialize the Lit Protocol service
  const litService = new LitProtocolService({
    contractAddress,
    helperApiUrl,
    chain,
    network,
  });
  
  // Initialize ethers wallet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://sepolia.infura.io/v3/your-infura-key');
  const wallet = privateKey ? new ethers.Wallet(privateKey, provider) : null;
  const walletAddress = wallet ? await wallet.getAddress() : '';
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Execute the appropriate command
  switch (command) {
    case 'list':
      await listFiles(litService, walletAddress);
      break;
    case 'decrypt':
      if (args.length < 2) {
        console.error('Error: File ID is required for decrypt command');
        console.log('Usage: node cli-decrypt.js decrypt <fileId> [outputFilename]');
        process.exit(1);
      }
      const fileId = args[1];
      const outputFilename = args[2] || fileId + '.json';
      await decryptFile(litService, wallet!, walletAddress, fileId, outputFilename, outputDir);
      break;
    case 'decrypt-all':
      await decryptAllFiles(litService, wallet!, walletAddress, outputDir);
      break;
    case 'help':
    default:
      printHelp();
      break;
  }
}

/**
 * Lists all files available to the user
 */
async function listFiles(litService: LitProtocolService, walletAddress: string) {
  try {
    console.log(`Listing files available to address: ${walletAddress}`);
    console.log('Fetching from helper service...');
    
    const mockMode = process.env.USE_MOCK_DATA === 'true';
    
    if (mockMode) {
      console.log('\nRunning in MOCK MODE - displaying mock files:');
      console.log('1. File ID: file1');
      console.log('   - Type: Character Data');
      console.log('   - Created: 2023-01-01');
      console.log('---');
      console.log('2. File ID: file2');
      console.log('   - Type: Character Data');
      console.log('   - Created: 2023-01-02');
      console.log('---');
      console.log('3. File ID: file3');
      console.log('   - Type: Character Data');
      console.log('   - Created: 2023-01-03');
      return;
    }
    
    try {
      const response = await fetch(`${litService.config.helperApiUrl}/list-files/${walletAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.files && data.files.length > 0) {
        console.log(`Found ${data.files.length} files available to your address:`);
        
        data.files.forEach((file: any, index: number) => {
          console.log(`${index + 1}. File ID: ${file.fileID}`);
          console.log(`   - Type: ${file.metadata?.type || 'Unknown'}`);
          console.log(`   - Created: ${file.metadata?.createdAt || 'Unknown'}`);
          console.log('---');
        });
        
        console.log('\nTo decrypt a specific file:');
        console.log('  node cli-decrypt.js decrypt <fileId> [outputFilename]');
        console.log('\nTo decrypt all files:');
        console.log('  node cli-decrypt.js decrypt-all');
      } else {
        console.log('No files available for your address');
      }
    } catch (error) {
      console.error('Error connecting to helper service:', error);
      console.log('\nIf the helper service is not available, you can use mock data by setting:');
      console.log('USE_MOCK_DATA=true in your .env file');
    }
  } catch (error) {
    console.error('Error listing files:', error);
  }
}

/**
 * Decrypts a specific file by ID
 */
async function decryptFile(
  litService: LitProtocolService, 
  wallet: ethers.Wallet,
  walletAddress: string,
  fileId: string,
  outputFilename: string,
  outputDir: string
) {
  try {
    console.log(`Decrypting file with ID: ${fileId}`);
    
    // Fetch the encrypted file
    console.log('Fetching encrypted file...');
    const encryptedFiles = await litService.fetchEncryptedFiles([fileId]);
    
    if (encryptedFiles.length === 0) {
      console.log('File not found or you do not have access to it');
      return;
    }
    
    // Decrypt the file
    console.log('Decrypting with Lit Protocol...');
    const decryptedFiles = await litService.decryptFiles(encryptedFiles, wallet, walletAddress);
    
    if (decryptedFiles.length === 0) {
      console.log('Failed to decrypt the file');
      return;
    }
    
    // Save the decrypted file
    const decryptedFile = decryptedFiles[0];
    const filePath = path.join(outputDir, outputFilename);
    
    try {
      // Try to parse as JSON for pretty formatting
      const content = JSON.parse(decryptedFile.content);
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    } catch (e) {
      // Save as plain text if not JSON
      fs.writeFileSync(filePath, decryptedFile.content);
    }
    
    console.log(`Successfully decrypted file and saved to: ${filePath}`);
    
    // Display the content
    console.log('\nDecrypted Content:');
    console.log('-------------------');
    try {
      const content = JSON.parse(decryptedFile.content);
      console.log(JSON.stringify(content, null, 2));
    } catch (e) {
      console.log(decryptedFile.content);
    }
    console.log('-------------------');
  } catch (error) {
    console.error('Error decrypting file:', error);
  }
}

/**
 * Decrypts all files available to the user
 */
async function decryptAllFiles(
  litService: LitProtocolService,
  wallet: ethers.Wallet,
  walletAddress: string,
  outputDir: string
) {
  try {
    console.log(`Decrypting all files available to address: ${walletAddress}`);
    
    const mockMode = process.env.USE_MOCK_DATA === 'true';
    let fileIds: string[] = [];
    
    if (mockMode) {
      console.log('Running in MOCK MODE - using mock file IDs');
      fileIds = ['file1', 'file2', 'file3'];
    } else {
      // Fetch available files from the helper service
      try {
        const response = await fetch(`${litService.config.helperApiUrl}/list-files/${walletAddress}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch files: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.files && data.files.length > 0) {
          fileIds = data.files.map((file: any) => file.fileID);
        } else {
          console.log('No files available for your address');
          return;
        }
      } catch (error) {
        console.error('Error connecting to helper service:', error);
        console.log('If the helper service is not available, you can use mock data by setting:');
        console.log('USE_MOCK_DATA=true in your .env file');
        return;
      }
    }
    
    if (fileIds.length === 0) {
      console.log('No files to decrypt');
      return;
    }
    
    console.log(`Found ${fileIds.length} files to decrypt`);
    
    // Fetch and decrypt all files
    console.log('Fetching encrypted files...');
    const encryptedFiles = await litService.fetchEncryptedFiles(fileIds);
    
    if (encryptedFiles.length === 0) {
      console.log('Failed to fetch any encrypted files');
      return;
    }
    
    console.log(`Successfully fetched ${encryptedFiles.length} encrypted files`);
    console.log('Decrypting files using Lit Protocol...');
    
    const decryptedFiles = await litService.decryptFiles(encryptedFiles, wallet, walletAddress);
    
    if (decryptedFiles.length === 0) {
      console.log('Failed to decrypt any files');
      return;
    }
    
    console.log(`Successfully decrypted ${decryptedFiles.length} files`);
    
    // Save all decrypted files
    for (const file of decryptedFiles) {
      const filePath = path.join(outputDir, `${file.fileID}.json`);
      
      try {
        // Try to parse as JSON for pretty formatting
        const content = JSON.parse(file.content);
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
      } catch (e) {
        // Save as plain text if not JSON
        fs.writeFileSync(filePath, file.content);
      }
      
      console.log(`Saved: ${filePath}`);
    }
    
    console.log(`\nAll files have been decrypted and saved to: ${outputDir}`);
  } catch (error) {
    console.error('Error decrypting all files:', error);
  }
}

/**
 * Prints help information
 */
function printHelp() {
  console.log('Ethstorage Decryption Tool');
  console.log('=========================');
  console.log('\nUsage:');
  console.log('  node cli-decrypt.js <command> [options]');
  console.log('\nCommands:');
  console.log('  list                List all files available to your wallet address');
  console.log('  decrypt <fileId>    Decrypt a specific file by ID');
  console.log('  decrypt-all         Decrypt all files available to your wallet address');
  console.log('  help                Show this help information');
  console.log('\nOptions:');
  console.log('  For decrypt: [outputFilename]  Specify output filename (default: fileId.json)');
  console.log('\nEnvironment Variables:');
  console.log('  WALLET_PRIVATE_KEY         Your wallet private key (required)');
  console.log('  ETH_STORAGE_CONTRACT_ADDRESS  Ethstorage contract address');
  console.log('  HELPER_API_URL             URL of the helper API service');
  console.log('  CHAIN                      Chain to use (default: sepolia)');
  console.log('  LIT_NETWORK                Lit Protocol network (default: datil)');
  console.log('  OUTPUT_DIR                 Directory to save decrypted files (default: ./decrypted-files)');
  console.log('  USE_MOCK_DATA              Set to "true" to use mock data when helper service is unavailable');
  console.log('  RPC_URL                    RPC URL for the Ethereum provider');
}

// Run the main function
main().catch(console.error); 