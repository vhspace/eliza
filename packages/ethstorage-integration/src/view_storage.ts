import { EthStorageClient } from './ethstorage_client';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';

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
  
  // Initialize the client
  const client = new EthStorageClient({
    rpcUrl,
    privateKey: privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`,
  });
  
  console.log(`Connected with wallet: ${client.getWalletAddress()}`);
  
  // Command line arguments
  const command = process.argv[2]?.toLowerCase();
  const fileId = process.argv[3];
  
  if (!command) {
    // Default: list files
    await listFiles(client);
    return;
  }
  
  switch (command) {
    case 'list':
      await listFiles(client);
      break;
    
    case 'view':
      if (!fileId) {
        console.error('Error: File ID required for view command');
        console.log('Usage: node dist/view_storage.js view <fileId>');
        process.exit(1);
      }
      await viewFile(client, fileId);
      break;
    
    case 'download':
      if (!fileId) {
        console.error('Error: File ID required for download command');
        console.log('Usage: node dist/view_storage.js download <fileId> [outputPath]');
        process.exit(1);
      }
      const outputPath = process.argv[4] || `./${fileId}`;
      await downloadFile(client, fileId, outputPath);
      break;
    
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Available commands: list, view, download');
      process.exit(1);
  }
}

async function listFiles(client: EthStorageClient) {
  console.log('Listing all files in EthStorage...');
  const files = await client.listFiles();
  
  if (files.length === 0) {
    console.log('No files found.');
    return;
  }
  
  console.log(`Found ${files.length} files:`);
  console.log('--------------------------------------------');
  console.log('| ID                      | Size    | Date               |');
  console.log('--------------------------------------------');
  
  for (const file of files) {
    const date = new Date(file.timestamp).toLocaleString();
    const sizeInKB = (file.size / 1024).toFixed(2) + ' KB';
    console.log(`| ${file.fileId.padEnd(23)} | ${sizeInKB.padEnd(8)} | ${date} |`);
  }
  
  console.log('--------------------------------------------');
  console.log('To view a file: node dist/view_storage.js view <fileId>');
  console.log('To download: node dist/view_storage.js download <fileId> [outputPath]');
}

async function viewFile(client: EthStorageClient, fileId: string) {
  console.log(`Viewing file: ${fileId}`);
  const result = await client.downloadFile(fileId);
  
  if (!result.success || !result.data) {
    console.error(`Error: Failed to download file: ${result.error}`);
    return;
  }
  
  // Try to determine if it's a text file or binary file
  const data = result.data;
  let isText = true;
  
  // Simple heuristic: Check if the first 1000 bytes are all valid ASCII or UTF-8
  for (let i = 0; i < Math.min(data.length, 1000); i++) {
    if (data[i] === 0 || (data[i] > 127 && data[i] < 160)) {
      isText = false;
      break;
    }
  }
  
  if (isText) {
    // It's likely a text file, so display its contents
    const text = new TextDecoder().decode(data);
    console.log('\n--- File Contents ---');
    console.log(text);
    console.log('--- End of File ---');
  } else {
    // It's likely a binary file, so just show info
    console.log(`File type: Binary (${result.data.length} bytes)`);
    console.log('Use download command to save this file');
  }
}

async function downloadFile(client: EthStorageClient, fileId: string, outputPath: string) {
  console.log(`Downloading file: ${fileId} to ${outputPath}`);
  const result = await client.downloadFile(fileId);
  
  if (!result.success || !result.data) {
    console.error(`Error: Failed to download file: ${result.error}`);
    return;
  }
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  
  // Write the file
  await fs.writeFile(outputPath, result.data);
  console.log(`File downloaded successfully to ${outputPath}`);
  console.log(`Size: ${result.data.length} bytes`);
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 