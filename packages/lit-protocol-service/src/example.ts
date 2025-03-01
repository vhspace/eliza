import { ethers } from 'ethers';
import { LitProtocolService, EncryptedFile } from './lit-protocol';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

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
      network: process.env.LIT_NETWORK || 'cayenne',
    };
    
    console.log('Using Lit Protocol configuration:');
    console.log(`- Contract Address: ${litConfig.contractAddress}`);
    console.log(`- Helper API URL: ${litConfig.helperApiUrl}`);
    console.log(`- Chain: ${litConfig.chain}`);
    console.log(`- Network: ${litConfig.network}`);
    
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
    
    // Example file IDs to decrypt
    const fileIds = process.env.ETH_STORAGE_FILE_IDS?.split(',').filter(id => id.trim()) || ['file1', 'file2', 'file3'];
    console.log(`File IDs to decrypt: ${fileIds.join(', ')}`);
    
    // Create mock encrypted files for demonstration purposes
    // In a real scenario, these would come from the helper service
    const mockEncryptedFiles: EncryptedFile[] = fileIds.map(fileID => ({
      fileID,
      cipherText: "mockEncryptedContent", // This would be real encrypted content in production
      hash: "mockHashValue", // This would be a real hash in production
    }));
    
    console.log(`Created ${mockEncryptedFiles.length} mock encrypted files for demonstration`);
    
    // Create an instance of the Lit Protocol service
    const litService = new LitProtocolService(litConfig);
    
    // Override the decryptFiles method to return mock decrypted files
    // This is just for demonstration since we don't have a real Lit Protocol node to connect to
    litService.decryptFiles = async () => {
      console.log('Simulating decryption with Lit Protocol...');
      return mockEncryptedFiles.map(file => ({
        fileID: file.fileID,
        content: JSON.stringify({ 
          name: `Mock Character ${file.fileID}`,
          description: "This is a mock decrypted file content for demonstration purposes.",
          attributes: [
            { trait_type: "Power", value: Math.floor(Math.random() * 100) },
            { trait_type: "Intelligence", value: Math.floor(Math.random() * 100) },
            { trait_type: "Charisma", value: Math.floor(Math.random() * 100) }
          ]
        })
      }));
    };
    
    // Decrypt the files (in this case, using our mock implementation)
    const decryptedFiles = await litService.decryptFiles(
      mockEncryptedFiles,
      wallet,
      signerAddress
    );
    
    // Process the decrypted files
    decryptedFiles.forEach((file) => {
      console.log(`\nDecrypted file ${file.fileID}:`);
      console.log(file.content);
      
      // Save the decrypted file to disk for demonstration purposes
      const outputDir = './mock-data';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filePath = `${outputDir}/${file.fileID}.json`;
      fs.writeFileSync(filePath, file.content, 'utf8');
      console.log(`Saved to ${filePath}`);
    });
    
    console.log('\nAll files decrypted successfully (mock implementation)');
    console.log('In a real scenario, these files would be decrypted using the Lit Protocol network');
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example
decryptEthStorageFiles().catch(console.error); 