/**
 * Direct test for EthStorage read and write operations
 * Uses ethers.js v6 and the official EthStorage endpoints
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import fetch from 'node-fetch';

// Load environment variables from root .env-ethstorage (just for the private key)
dotenv.config({ path: '../../.env-ethstorage' });

// Official EthStorage endpoints from documentation
const OFFICIAL_ETH_STORAGE_RPC = "http://65.108.236.27:9540";
const OFFICIAL_BLOB_ARCHIVER_API = "http://65.108.236.27:9645";
const OFFICIAL_CONTRACT_ADDRESS = "0x804C520d3c084C805E37A35E90057Ac32831F96f";

async function main() {
  // Check required environment variable
  const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('Error: Missing private key. Please check .env-ethstorage file');
    console.error('Required variable: ETHSTORAGE_PRIVATE_KEY');
    process.exit(1);
  }
  
  console.log('EthStorage Test - Using official EthStorage endpoints');
  console.log('====================================================');
  console.log(`EthStorage RPC URL: ${OFFICIAL_ETH_STORAGE_RPC}`);
  console.log(`Blob Archiver API: ${OFFICIAL_BLOB_ARCHIVER_API}`);
  console.log(`Contract Address: ${OFFICIAL_CONTRACT_ADDRESS}`);
  
  // Format private key with 0x prefix if needed
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  try {
    // Initialize wallet
    const wallet = new ethers.Wallet(formattedPrivateKey);
    console.log(`Wallet address: ${wallet.address}`);
    
    // Create a test file
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const testFilePath = path.join(os.tmpdir(), 'ethstorage-test.txt');
    await fs.writeFile(testFilePath, testContent, 'utf8');
    console.log(`Created test file at ${testFilePath} with content: ${testContent}`);
    
    // Read the file content
    const fileContent = await fs.readFile(testFilePath, 'utf8');
    console.log(`File content: ${fileContent}`);
    
    // Try using the blob archiver API first
    console.log('\nTesting EthStorage via Blob Archiver API...');
    
    try {
      // Convert content to bytes
      const contentBytes = new TextEncoder().encode(fileContent);
      console.log(`Content bytes length: ${contentBytes.length}`);
      
      // Generate a random file ID
      const fileId = `test_${Date.now()}`;
      console.log(`Generated file ID: ${fileId}`);
      
      // First check the API status
      console.log('Checking Blob Archiver API status...');
      const statusResponse = await fetch(`${OFFICIAL_BLOB_ARCHIVER_API}/status`);
      if (statusResponse.ok) {
        console.log('Blob Archiver API is online');
        console.log('Status:', await statusResponse.text());
      } else {
        console.warn('Blob Archiver API status check failed:', await statusResponse.text());
      }
      
      // Use the EthStorage /upload endpoint
      console.log('\nUploading file to EthStorage via Blob Archiver API...');
      
      const signMessage = ethers.keccak256(ethers.toUtf8Bytes(fileContent));
      const signature = await wallet.signMessage(ethers.getBytes(signMessage));
      
      const uploadResponse = await fetch(`${OFFICIAL_BLOB_ARCHIVER_API}/archive/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          content: ethers.hexlify(contentBytes),
          address: wallet.address,
          signature,
        }),
      });
      
      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        console.log('Upload result:', uploadResult);
        
        // Try to download the file
        console.log('\nDownloading file from EthStorage via Blob Archiver API...');
        const downloadResponse = await fetch(`${OFFICIAL_BLOB_ARCHIVER_API}/archive/download?fileId=${fileId}`);
        
        if (downloadResponse.ok) {
          const downloadResult = await downloadResponse.json();
          console.log('Download result:', downloadResult);
          
          if (downloadResult && downloadResult.content) {
            const downloadedContent = new TextDecoder().decode(ethers.getBytes(downloadResult.content));
            console.log(`Downloaded content: ${downloadedContent}`);
            console.log(`Content verification: ${downloadedContent === fileContent ? 'SUCCESS' : 'FAILED'}`);
          }
        } else {
          console.error('Error downloading from Blob Archiver API:', await downloadResponse.text());
        }
      } else {
        console.error('Error uploading to Blob Archiver API:', await uploadResponse.text());
      }
    } catch (error) {
      console.error('Error using Blob Archiver API:', error);
    }
    
    // Try using direct JSON-RPC to EthStorage
    console.log('\nTesting EthStorage via direct JSON-RPC...');
    
    try {
      // Simple custom RPC call to check if the RPC endpoint is responding
      const response = await fetch(OFFICIAL_ETH_STORAGE_RPC, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'ethstorage_getBlobs',
          params: [],
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('EthStorage RPC test response:', result);
        
        // If successful, try to write a file
        console.log('\nUploading file via direct JSON-RPC...');
        const contentBytes = new TextEncoder().encode(fileContent);
        const fileId = `test_direct_${Date.now()}`;
        
        const writeResponse = await fetch(OFFICIAL_ETH_STORAGE_RPC, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'ethstorage_write',
            params: [{
              fileId,
              data: ethers.hexlify(contentBytes),
              signer: wallet.address,
              contract: OFFICIAL_CONTRACT_ADDRESS,
            }],
          }),
        });
        
        if (writeResponse.ok) {
          const writeResult = await writeResponse.json();
          console.log('Write result:', writeResult);
          
          // Try to read the file back
          console.log('\nDownloading file via direct JSON-RPC...');
          const readResponse = await fetch(OFFICIAL_ETH_STORAGE_RPC, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 3,
              method: 'ethstorage_read',
              params: [fileId],
            }),
          });
          
          if (readResponse.ok) {
            const readResult = await readResponse.json();
            console.log('Read result:', readResult);
            
            if (readResult.result && readResult.result.data) {
              const downloadedContent = new TextDecoder().decode(ethers.getBytes(readResult.result.data));
              console.log(`Downloaded content: ${downloadedContent}`);
              console.log(`Content verification: ${downloadedContent === fileContent ? 'SUCCESS' : 'FAILED'}`);
            }
          } else {
            console.error('Error reading from EthStorage RPC:', await readResponse.text());
          }
        } else {
          console.error('Error writing to EthStorage RPC:', await writeResponse.text());
        }
      } else {
        console.error('Error testing EthStorage RPC:', await response.text());
      }
    } catch (rpcError) {
      console.error('Error communicating with EthStorage RPC:', rpcError);
    }
    
    // Clean up
    try {
      await fs.unlink(testFilePath);
      console.log(`\nCleaned up test file: ${testFilePath}`);
    } catch (cleanupError) {
      console.warn(`Failed to clean up test file: ${cleanupError}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default main; 