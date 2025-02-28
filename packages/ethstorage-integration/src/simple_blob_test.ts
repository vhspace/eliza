/**
 * A simple test to upload and retrieve a blob using the ES-Geth RPC
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: '../../.env-ethstorage' });

// Official EthStorage RPC endpoint from documentation
const ETHSTORAGE_RPC_URL = "http://65.108.236.27:9540";
const BLOB_ARCHIVER_API = "http://65.108.236.27:9645";

async function main() {
  console.log('Simple EthStorage Blob Test');
  console.log('=========================');
  console.log(`RPC URL: ${ETHSTORAGE_RPC_URL}`);
  console.log(`Blob Archiver API: ${BLOB_ARCHIVER_API}`);
  
  // Check for private key
  const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: ETHSTORAGE_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }
  
  // Format private key with 0x prefix if needed
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(formattedPrivateKey);
  console.log(`Using wallet address: ${wallet.address}`);
  
  // Create a simple test message
  const testMessage = `Test message created at ${new Date().toISOString()}`;
  console.log(`Test message: ${testMessage}`);
  
  // Convert to bytes
  const messageBytes = ethers.toUtf8Bytes(testMessage);
  console.log(`Message bytes length: ${messageBytes.length}`);
  const messageHex = ethers.hexlify(messageBytes);
  console.log(`Message hex: ${messageHex}`);
  
  // First try the Blob Archiver API
  console.log('\nTesting Blob Archiver API...');
  
  try {
    // Check API status
    console.log('Checking API status...');
    const statusResponse = await fetch(`${BLOB_ARCHIVER_API}/status`);
    if (statusResponse.ok) {
      const statusText = await statusResponse.text();
      console.log(`Status: ${statusText}`);
      
      // Try to upload
      console.log('\nUploading blob...');
      const fileId = `test_${Date.now()}`;
      
      // Sign the message
      const signMessage = ethers.keccak256(messageBytes);
      const signature = await wallet.signMessage(ethers.getBytes(signMessage));
      
      const uploadResponse = await fetch(`${BLOB_ARCHIVER_API}/archive/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId,
          content: messageHex,
          address: wallet.address,
          signature
        })
      });
      
      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        console.log(`Upload result: ${JSON.stringify(uploadResult, null, 2)}`);
        
        // Try to download
        console.log('\nDownloading blob...');
        const downloadResponse = await fetch(`${BLOB_ARCHIVER_API}/archive/download?fileId=${fileId}`);
        
        if (downloadResponse.ok) {
          const downloadResult = await downloadResponse.json();
          console.log(`Download result: ${JSON.stringify(downloadResult, null, 2)}`);
          
          if (downloadResult && downloadResult.content) {
            const downloadedContent = ethers.toUtf8String(downloadResult.content);
            console.log(`Downloaded content: ${downloadedContent}`);
            console.log(`Content verification: ${downloadedContent === testMessage ? 'SUCCESS' : 'FAILED'}`);
          }
        } else {
          console.error('Download failed:', await downloadResponse.text());
        }
      } else {
        console.error('Upload failed:', await uploadResponse.text());
      }
    } else {
      console.error('API status check failed:', await statusResponse.text());
    }
  } catch (error) {
    console.error('Error using Blob Archiver API:', error);
  }
  
  // Now try direct RPC calls
  console.log('\nTesting direct RPC calls...');
  
  try {
    // Try known methods
    const methods = [
      { name: 'eth_chainId', params: [] },
      { name: 'rpc_modules', params: [] },
      { name: 'es_version', params: [] },
      { name: 'es_networkID', params: [] },
      { name: 'es_getBlobsByHash', params: ['0x0000000000000000000000000000000000000000000000000000000000000000'] }
    ];
    
    for (const method of methods) {
      try {
        console.log(`\nTesting method: ${method.name}...`);
        const response = await fetch(ETHSTORAGE_RPC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: method.name,
            params: method.params
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`Result: ${JSON.stringify(result, null, 2)}`);
        } else {
          console.error(`Error response: ${await response.text()}`);
        }
      } catch (error) {
        console.error(`Error testing ${method.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error testing RPC methods:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default main; 