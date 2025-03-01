import { ethers } from 'ethers';
import { LitProtocolService, DecryptedFile } from './lit-protocol';
import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenvConfig({ path: resolve(process.cwd(), '.env') });

interface AgentDataConfig {
  contractAddress: string;
  helperApiUrl: string;
  chain: string;
  walletPrivateKey: string;
  fileIds: string[];
  outputDir: string;
  useMockData?: boolean; // New option to use mock data
  network?: string; // Add network parameter
}

/**
 * Decrypts files from ethstorage and saves them for agent use
 * @param config Configuration for the agent data helper
 */
export async function loadAgentDataFromEthStorage(config: AgentDataConfig): Promise<string[]> {
  try {
    console.log('Starting to load data from ethstorage...');
    
    // Create an instance of the Lit Protocol service
    const litService = new LitProtocolService({
      contractAddress: config.contractAddress,
      helperApiUrl: config.helperApiUrl,
      chain: config.chain,
      network: config.network, // Pass the network to the service
    });
    
    // Create a signer with the private key
    const provider = new ethers.JsonRpcProvider(`https://${config.chain}.publicnode.com`);
    const wallet = new ethers.Wallet(config.walletPrivateKey, provider);
    const signerAddress = await wallet.getAddress();
    
    console.log(`Using wallet address: ${signerAddress}`);
    
    let decryptedFiles: DecryptedFile[] = [];
    
    // Check if we should use mock data
    if (config.useMockData || process.env.USE_MOCK_DATA === 'true') {
      console.log('Using mock data since helper service is not available');
      decryptedFiles = createMockDecryptedFiles(config.fileIds);
    } else {
      try {
        // Try to fetch encrypted files from the helper service
        console.log(`Fetching ${config.fileIds.length} files from ethstorage...`);
        const encryptedFiles = await litService.fetchEncryptedFiles(config.fileIds);
        
        if (encryptedFiles.length === 0) {
          console.log('No encrypted files found. Falling back to mock data...');
          decryptedFiles = createMockDecryptedFiles(config.fileIds);
        } else {
          console.log(`Found ${encryptedFiles.length} encrypted files. Decrypting...`);
          
          // Decrypt the files
          decryptedFiles = await litService.decryptFiles(
            encryptedFiles,
            wallet,
            signerAddress
          );
          
          console.log(`Successfully decrypted ${decryptedFiles.length} files.`);
        }
      } catch (error) {
        console.error('Error fetching or decrypting files, falling back to mock data:', error);
        decryptedFiles = createMockDecryptedFiles(config.fileIds);
      }
    }
    
    // Ensure the output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Save the decrypted files
    const savedFilePaths = saveDecryptedFiles(decryptedFiles, config.outputDir);
    
    console.log(`Files saved to ${config.outputDir}`);
    return savedFilePaths;
  } catch (error) {
    console.error('Error loading agent data from ethstorage:', error);
    throw error;
  }
}

/**
 * Creates mock decrypted files for demonstration purposes
 * @param fileIds Array of file IDs
 * @returns Array of mock decrypted files
 */
function createMockDecryptedFiles(fileIds: string[]): DecryptedFile[] {
  console.log(`Creating ${fileIds.length} mock decrypted files...`);
  return fileIds.map(fileID => ({
    fileID,
    content: JSON.stringify({
      name: `Mock Character ${fileID}`,
      description: "This is a mock decrypted file for demonstration purposes",
      traits: [
        { type: "Power", value: Math.floor(Math.random() * 100) },
        { type: "Intelligence", value: Math.floor(Math.random() * 100) },
        { type: "Charisma", value: Math.floor(Math.random() * 100) }
      ],
      abilities: [
        "Mock Ability 1",
        "Mock Ability 2",
        "Mock Ability 3"
      ],
      mockData: true
    }, null, 2)
  }));
}

/**
 * Saves decrypted files to the specified directory
 * @param decryptedFiles Array of decrypted files
 * @param outputDir Directory to save files to
 * @returns Array of saved file paths
 */
function saveDecryptedFiles(decryptedFiles: DecryptedFile[], outputDir: string): string[] {
  const savedFilePaths: string[] = [];
  
  for (const file of decryptedFiles) {
    // Sanitize fileID to create a valid filename
    const sanitizedFileId = file.fileID.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filePath = path.join(outputDir, `${sanitizedFileId}.json`);
    
    // Write the file content
    fs.writeFileSync(filePath, file.content, 'utf8');
    savedFilePaths.push(filePath);
  }
  
  return savedFilePaths;
}

/**
 * Command-line interface for the agent data helper
 */
async function main() {
  // Read configuration from environment variables
  const config: AgentDataConfig = {
    contractAddress: process.env.LIT_CONTRACT_ADDRESS || '0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986',
    helperApiUrl: process.env.LIT_HELPER_API_URL || 'http://localhost:3000',
    chain: process.env.LIT_CHAIN || 'sepolia',
    walletPrivateKey: process.env.ETH_PRIVATE_KEY || '',
    fileIds: (process.env.ETH_STORAGE_FILE_IDS || '').split(',').filter(id => id.trim()),
    outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'agent-data'),
    useMockData: process.env.USE_MOCK_DATA === 'true',
    network: process.env.LIT_NETWORK
  };
  
  if (!config.walletPrivateKey) {
    console.error('ETH_PRIVATE_KEY environment variable is required');
    process.exit(1);
  }
  
  if (config.fileIds.length === 0) {
    console.error('ETH_STORAGE_FILE_IDS environment variable is required');
    process.exit(1);
  }
  
  try {
    const savedFilePaths = await loadAgentDataFromEthStorage(config);
    console.log('Files saved:');
    savedFilePaths.forEach(path => console.log(`- ${path}`));
    process.exit(0);
  } catch (error) {
    console.error('Failed to load agent data:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
} 