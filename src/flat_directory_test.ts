/**
 * EthStorage SDK FlatDirectory Test
 * Tests creating a FlatDirectory contract, uploading a file, and reading it back
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { FlatDirectory, EthStorage } from 'ethstorage-sdk';
import { NodeFile } from 'ethstorage-sdk/file';
import * as fs from 'fs';

// Load environment variables from the .env-ethstorage file
const envPath = path.resolve(process.cwd(), '../../.env-ethstorage');
dotenv.config({ path: envPath });

// Get configuration from environment variables
const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
if (!privateKey) {
  console.error('ERROR: ETHSTORAGE_PRIVATE_KEY not set in environment');
  process.exit(1);
}

// For Sepolia testnet
const RPC_URL = "https://rpc.sepolia.org";
// The EthStorage RPC (we're using the one from .env or default)
const ETHSTORAGE_RPC = process.env.ETHSTORAGE_ETH_STORAGE_RPC_URL || 'http://65.108.236.27:9540'; 

/**
 * Create a temporary test file
 */
function createTestFile(content: string): string {
  const tempFilePath = path.join(process.cwd(), 'test-file.txt');
  fs.writeFileSync(tempFilePath, content);
  return tempFilePath;
}

/**
 * Test creating a FlatDirectory, uploading a file, and reading it back
 */
async function testFlatDirectory(): Promise<void> {
  console.log('EthStorage SDK FlatDirectory Test');
  console.log('================================');
  console.log(`Ethereum RPC URL: ${RPC_URL}`);
  console.log(`EthStorage RPC URL: ${ETHSTORAGE_RPC}`);
  
  // Format private key with 0x prefix if needed
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  try {
    // Part 1: Create or connect to FlatDirectory
    console.log("\n1. Creating/Connecting to FlatDirectory contract...");
    
    // You can either deploy a new contract or use an existing one
    // For testing, we'll ask if there's an existing address to use
    let flatDirAddress = process.env.FLAT_DIRECTORY_ADDRESS;
    let flatDirectory;
    
    if (flatDirAddress) {
      console.log(`Using existing FlatDirectory at: ${flatDirAddress}`);
      flatDirectory = await FlatDirectory.create({
        rpc: RPC_URL,
        ethStorageRpc: ETHSTORAGE_RPC,
        privateKey: formattedPrivateKey,
        address: flatDirAddress
      });
    } else {
      console.log("Deploying new FlatDirectory contract...");
      flatDirectory = await FlatDirectory.create({
        rpc: RPC_URL,
        ethStorageRpc: ETHSTORAGE_RPC,
        privateKey: formattedPrivateKey
      });
      
      flatDirAddress = await flatDirectory.deploy();
      console.log(`Deployed new FlatDirectory at: ${flatDirAddress}`);
      
      // Save this for future runs
      console.log("To use this contract in future tests, set FLAT_DIRECTORY_ADDRESS in .env-ethstorage");
    }
    
    // Part 2: Upload a file
    console.log("\n2. Uploading test file...");
    
    // Create a simple test file
    const testContent = `This is a test file created at ${new Date().toISOString()}\n`;
    const testFilePath = createTestFile(testContent);
    console.log(`Test file created at: ${testFilePath}`);
    
    // Create a Node file object
    const file = new NodeFile(testFilePath);
    const fileKey = "test-file.txt";
    
    // Callback for tracking progress
    const callback = {
      onProgress: (progress: number, count: number, isChange: boolean) => {
        console.log(`Upload progress: ${progress}%, Chunks: ${count}`);
      },
      onFail: (err: Error) => {
        console.error("Upload failed:", err);
      },
      onFinish: (totalUploadChunks: number, totalUploadSize: number, totalStorageCost: string) => {
        console.log(`Upload complete! Chunks: ${totalUploadChunks}, Size: ${totalUploadSize} bytes, Cost: ${totalStorageCost}`);
      }
    };
    
    // Upload the file (using blob type = 2)
    const uploadRequest = {
      key: fileKey,
      content: file,
      type: 2, // 1 for calldata and 2 for blob
      callback: callback
    };
    
    await flatDirectory.upload(uploadRequest);
    
    // Part 3: Download and verify the file
    console.log("\n3. Downloading the file...");
    
    let downloadedContent = "";
    
    await flatDirectory.download(fileKey, {
      onProgress: (progress: number, count: number, chunk: Uint8Array) => {
        console.log(`Download progress: ${progress}%, Chunks: ${count}`);
      },
      onFail: (error: Error) => {
        console.error("Download failed:", error);
      },
      onFinish: (content: Uint8Array) => {
        downloadedContent = new TextDecoder().decode(content);
        console.log("Download complete!");
      }
    });
    
    // Verify content
    console.log("\n4. Verifying file content...");
    console.log(`Original content: ${testContent}`);
    console.log(`Downloaded content: ${downloadedContent}`);
    
    if (downloadedContent === testContent) {
      console.log("✅ Content verified successfully! The data matches.");
    } else {
      console.log("❌ Content verification failed! The data doesn't match.");
    }
    
    // Part 4: Try using EthStorage directly
    console.log("\n5. Testing direct EthStorage access...");
    
    // Create EthStorage instance
    const ethStorage = await EthStorage.create({
      rpc: RPC_URL,
      ethStorageRpc: ETHSTORAGE_RPC,
      privateKey: formattedPrivateKey
    });
    
    // Write blob directly
    const directKey = "direct-test.txt";
    const directData = Buffer.from(`Direct access test at ${new Date().toISOString()}`);
    console.log(`Writing direct blob with key: ${directKey}`);
    await ethStorage.write(directKey, directData);
    
    // Read the blob back
    console.log(`Reading direct blob with key: ${directKey}`);
    const readData = await ethStorage.read(directKey);
    const readContent = new TextDecoder().decode(readData);
    console.log(`Read content: ${readContent}`);
    
    console.log("\nTest Summary:");
    console.log("=============");
    console.log(`FlatDirectory Address: ${flatDirAddress}`);
    console.log(`Test File Key: ${fileKey}`);
    console.log(`Direct Blob Key: ${directKey}`);
    
    // Clean up the test file
    fs.unlinkSync(testFilePath);
    console.log(`Cleaned up temporary test file: ${testFilePath}`);
  } catch (error) {
    console.error("Error in FlatDirectory test:", error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testFlatDirectory().catch(console.error);
}

export default testFlatDirectory; 