/**
 * EthStorage Connection Test
 * This script tests the connection to EthStorage using the configuration from .env-ethstorage
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from the .env-ethstorage file
const envPath = path.resolve(process.cwd(), '../../.env-ethstorage');
dotenv.config({ path: envPath });

// Get configuration from environment variables
const ETHSTORAGE_RPC_URL = process.env.ETHSTORAGE_ETH_STORAGE_RPC_URL || 'http://65.108.236.27:9540';
const BLOB_ARCHIVER_API = process.env.ETHSTORAGE_BLOB_ARCHIVER_API || 'http://65.108.236.27:9645';
const CONTRACT_ADDRESS = process.env.ETHSTORAGE_CONTRACT_ADDRESS || '0x804C520d3c084C805E37A35E90057Ac32831F96f';

async function testConnection(): Promise<void> {
  console.log('EthStorage Connection Test');
  console.log('=========================');
  console.log(`RPC URL: ${ETHSTORAGE_RPC_URL}`);
  console.log(`Blob Archiver API: ${BLOB_ARCHIVER_API}`);
  console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
  
  // Check if we have a private key
  const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: ETHSTORAGE_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }
  
  // Initialize wallet
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(formattedPrivateKey);
  console.log(`Using wallet address: ${wallet.address}`);
  
  console.log('\nTesting RPC Connection...');
  try {
    // Test basic RPC methods
    const basicMethods = [
      { name: 'eth_chainId', params: [] },
      { name: 'rpc_modules', params: [] },
      { name: 'es_version', params: [] },
      { name: 'es_networkID', params: [] }
    ];
    
    for (const method of basicMethods) {
      try {
        console.log(`\nTesting method: ${method.name}...`);
        const response = await fetch(ETHSTORAGE_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
  
  console.log('\nTesting Blob Archiver API...');
  try {
    // Check API status
    console.log('Checking API status...');
    const statusResponse = await fetch(`${BLOB_ARCHIVER_API}/status`);
    if (statusResponse.ok) {
      const statusText = await statusResponse.text();
      console.log(`Status: ${statusText}`);
      console.log('✅ Successfully connected to Blob Archiver API');
    } else {
      console.error('❌ API status check failed:', await statusResponse.text());
    }
  } catch (error) {
    console.error('❌ Error connecting to Blob Archiver API:', error);
  }
  
  console.log('\nConnection Test Summary:');
  console.log('======================');
  console.log('Wallet Address:', wallet.address);
  console.log('RPC URL:', ETHSTORAGE_RPC_URL);
  console.log('Blob Archiver API:', BLOB_ARCHIVER_API);
  console.log('Contract Address:', CONTRACT_ADDRESS);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testConnection().catch(console.error);
}

export default testConnection; 