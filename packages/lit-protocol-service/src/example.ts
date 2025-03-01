import { ethers } from 'ethers';
import { LitProtocolService, EncryptedFile } from './lit-protocol';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenvConfig({ path: resolve(process.cwd(), '.env') });

/**
 * Example of how to use the LitProtocolService to decrypt files from ethstorage
 */
async function decryptEthStorageFiles() {
  try {
    // Configuration for the Lit Protocol service
    const litConfig = {
      contractAddress: process.env.LIT_CONTRACT_ADDRESS || '0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986',
      helperApiUrl: process.env.LIT_HELPER_API_URL || 'http://localhost:3000',
      chain: process.env.LIT_CHAIN || 'sepolia',
    };
    
    // Create an instance of the Lit Protocol service
    const litService = new LitProtocolService(litConfig);
    
    // Private key for the wallet that has access to the encrypted files
    // Load from environment variables instead of hardcoding
    const privateKey = process.env.ETH_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('ETH_PRIVATE_KEY environment variable is required in .env file');
    }
    
    // Create a signer with the private key
    const provider = new ethers.JsonRpcProvider(`https://${litConfig.chain}.publicnode.com`);
    const wallet = new ethers.Wallet(privateKey, provider);
    const signerAddress = await wallet.getAddress();
    
    console.log(`Using wallet address: ${signerAddress}`);
    
    // Example file IDs to decrypt (replace with your actual file IDs from env)
    const fileIds = process.env.ETH_STORAGE_FILE_IDS?.split(',').filter(id => id.trim()) || ['file1', 'file2', 'file3'];
    
    console.log(`File IDs to decrypt: ${fileIds.join(', ')}`);
    
    // Option 1: If you already have the encrypted files' data
    const encryptedFiles: EncryptedFile[] = [
      {
        fileID: 'file1',
        cipherText: 'encryptedContent1...',
        hash: 'hashValue1...',
      },
      // Add more encrypted files as needed
    ];
    
    // Option 2: Fetch encrypted files from the helper service
    // Uncomment the next line to use this option
    // const encryptedFiles = await litService.fetchEncryptedFiles(fileIds);
    
    // Decrypt the files
    const decryptedFiles = await litService.decryptFiles(
      encryptedFiles,
      wallet,
      signerAddress
    );
    
    // Process the decrypted files
    decryptedFiles.forEach((file) => {
      console.log(`Decrypted file ${file.fileID}:`);
      console.log(file.content);
      console.log('---');
      
      // Here you can process the file contents as needed for your agents
      // For example, parsing JSON data, storing in a database, etc.
    });
    
    console.log('All files decrypted successfully');
  } catch (error) {
    console.error('Error decrypting files:', error);
  }
}

// Run the example
decryptEthStorageFiles().catch(console.error); 