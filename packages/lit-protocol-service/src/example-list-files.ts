import dotenv from 'dotenv';
import { ethers } from 'ethers';
import axios from 'axios';
import { LitProtocolService } from './lit-protocol';

dotenv.config();

/**
 * Example showing how to query ethstorage for available files and decrypt them
 */
async function main() {
  try {
    // Load environment variables
    const contractAddress = process.env.ETH_STORAGE_CONTRACT_ADDRESS || '0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986';
    const helperApiUrl = process.env.HELPER_API_URL || 'http://localhost:3000';
    const chain = process.env.CHAIN || 'sepolia';
    const network = process.env.LIT_NETWORK || 'datil';
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('WALLET_PRIVATE_KEY is required in .env file');
    }

    // Initialize ethers provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://sepolia.infura.io/v3/your-infura-key');
    const wallet = new ethers.Wallet(privateKey, provider);
    const walletAddress = await wallet.getAddress();
    
    console.log(`Using wallet address: ${walletAddress}`);
    
    // 1. List available files (query the helper service)
    console.log('\n--- Step 1: Listing Available Files ---');
    
    try {
      const response = await axios.get(
        `${helperApiUrl}/list-files/${walletAddress}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data && response.data.files) {
        const availableFiles = response.data.files;
        console.log(`Found ${availableFiles.length} files available to your address:`);
        
        // Display the files
        availableFiles.forEach((file: any, index: number) => {
          console.log(`${index + 1}. File ID: ${file.fileID}`);
          console.log(`   - Type: ${file.metadata?.type || 'Unknown'}`);
          console.log(`   - Created: ${file.metadata?.createdAt || 'Unknown'}`);
          console.log('---');
        });
        
        // 2. Use the Lit Protocol service to decrypt files
        if (availableFiles.length > 0) {
          console.log('\n--- Step 2: Decrypting Files ---');
          
          // Initialize the Lit Protocol service
          const litService = new LitProtocolService({
            contractAddress,
            helperApiUrl,
            chain,
            network,
          });
          
          // Get file IDs
          const fileIds = availableFiles.map((file: any) => file.fileID);
          
          // Fetch encrypted files
          console.log('Fetching encrypted files...');
          const encryptedFiles = await litService.fetchEncryptedFiles(fileIds);
          
          if (encryptedFiles.length > 0) {
            console.log(`Successfully fetched ${encryptedFiles.length} encrypted files`);
            
            // Decrypt the files
            console.log('Decrypting files using Lit Protocol...');
            const decryptedFiles = await litService.decryptFiles(
              encryptedFiles,
              wallet,
              walletAddress
            );
            
            // Display decrypted content
            console.log('\nDecrypted Content:');
            decryptedFiles.forEach((file, index) => {
              console.log(`\nFile ${index + 1}: ${file.fileID}`);
              console.log('-------------------');
              try {
                // Try to parse as JSON
                const content = JSON.parse(file.content);
                console.log(JSON.stringify(content, null, 2));
              } catch (e) {
                // Display as raw text if not JSON
                console.log(file.content);
              }
              console.log('-------------------');
            });
          } else {
            console.log('No encrypted files found');
          }
        }
      } else {
        console.log('No files available or error in response format');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('Helper service not available or endpoint not found');
        console.log('You can create a mock implementation:');
        await createMockExample();
      } else {
        console.error('Error listing files:', error);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Creates a mock example when the helper service is not available
 */
async function createMockExample() {
  try {
    console.log('\n--- Mock Example (since helper service is not available) ---');
    
    // Mock wallet
    const privateKey = process.env.WALLET_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey;
    const wallet = new ethers.Wallet(privateKey);
    const walletAddress = await wallet.getAddress();
    
    // Initialize the Lit Protocol service with USE_MOCK_DATA
    const litService = new LitProtocolService({
      contractAddress: '0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986',
      helperApiUrl: 'http://localhost:3000', // Not used in mock mode
      chain: 'sepolia',
      network: 'datil',
    });
    
    // Create mock encrypted files
    const mockEncryptedFiles = [
      {
        fileID: 'file1',
        cipherText: 'mock-encrypted-content-1',
        hash: 'mock-hash-1',
      },
      {
        fileID: 'file2',
        cipherText: 'mock-encrypted-content-2',
        hash: 'mock-hash-2',
      },
    ];
    
    // Override the decryptFiles method for mock data
    const originalDecryptFiles = litService.decryptFiles;
    litService.decryptFiles = async () => {
      return [
        {
          fileID: 'file1',
          content: JSON.stringify({
            name: 'Mock Character 1',
            description: 'This is a mock decrypted file for demonstration',
            traits: [
              { type: 'Power', value: 75 },
              { type: 'Intelligence', value: 90 },
              { type: 'Charisma', value: 60 },
            ],
            abilities: ['Mock Ability A', 'Mock Ability B', 'Mock Ability C'],
          }),
        },
        {
          fileID: 'file2',
          content: JSON.stringify({
            name: 'Mock Character 2',
            description: 'Another mock file for demonstration',
            traits: [
              { type: 'Power', value: 40 },
              { type: 'Intelligence', value: 95 },
              { type: 'Charisma', value: 85 },
            ],
            abilities: ['Mock Ability X', 'Mock Ability Y', 'Mock Ability Z'],
          }),
        },
      ];
    };
    
    console.log('Mock available files:');
    mockEncryptedFiles.forEach((file, index) => {
      console.log(`${index + 1}. File ID: ${file.fileID}`);
    });
    
    console.log('\nDecrypting mock files...');
    const decryptedFiles = await litService.decryptFiles(mockEncryptedFiles, wallet, walletAddress);
    
    console.log('\nMock Decrypted Content:');
    decryptedFiles.forEach((file, index) => {
      console.log(`\nFile ${index + 1}: ${file.fileID}`);
      console.log('-------------------');
      try {
        const content = JSON.parse(file.content);
        console.log(JSON.stringify(content, null, 2));
      } catch (e) {
        console.log(file.content);
      }
      console.log('-------------------');
    });
    
    // Restore the original method
    litService.decryptFiles = originalDecryptFiles;
    
    console.log('\nThis is a mock example. In a real scenario:');
    console.log('1. You would call the helper service to list available files');
    console.log('2. Fetch the encrypted files from ethstorage');
    console.log('3. Use Lit Protocol to decrypt them with your wallet');
  } catch (error) {
    console.error('Error in mock example:', error);
  }
}

// Run the example
main().catch(console.error); 