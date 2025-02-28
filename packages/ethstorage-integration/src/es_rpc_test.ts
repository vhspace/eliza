/**
 * EthStorage Direct RPC Test
 * Tests EthStorage-specific RPC methods directly
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import fetch from 'node-fetch';

// Load environment variables from the .env-ethstorage file
const envPath = path.resolve(process.cwd(), '../../.env-ethstorage');
dotenv.config({ path: envPath });

// Get configuration from environment variables
const ETHSTORAGE_RPC_URL = process.env.ETHSTORAGE_ETH_STORAGE_RPC_URL || 'http://65.108.236.27:9540';

// Helper function to make JSON-RPC calls
async function callRpc(method: string, params: any[] = []): Promise<any> {
  const response = await fetch(ETHSTORAGE_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    })
  });
  
  return await response.json();
}

async function testEsRpc(): Promise<void> {
  console.log('EthStorage Direct RPC Test');
  console.log('=========================');
  console.log(`RPC URL: ${ETHSTORAGE_RPC_URL}`);
  
  // List of standard and ES-specific methods to test
  const methods = [
    { name: 'web3_clientVersion', params: [] },
    { name: 'net_version', params: [] },
    { name: 'eth_chainId', params: [] },
    { name: 'es_getBlobsByHash', params: ['0x0000000000000000000000000000000000000000000000000000000000000001'] },
    { name: 'es_getRawBlobsByHash', params: ['0x0000000000000000000000000000000000000000000000000000000000000001'] },
    { name: 'es_getStorageFee', params: [] },
    { name: 'es_getRangeToEncodeChunk', params: ['0', '1'] },
    { name: 'es_getStorageNodes', params: [] },
    { name: 'es_getBlobPublicKeys', params: [] }
  ];
  
  console.log('\nTesting RPC methods...');
  
  for (const method of methods) {
    try {
      console.log(`\nTesting method: ${method.name}...`);
      const result = await callRpc(method.name, method.params);
      
      if (result.error) {
        console.log(`❌ Error: ${result.error.message}`);
      } else {
        console.log('✅ Success!');
        console.log('Result:', JSON.stringify(result.result, null, 2).substring(0, 500));
        
        // Print length of data if it's a large response
        if (typeof result.result === 'string' && result.result.length > 500) {
          console.log(`(Result truncated, total length: ${result.result.length} characters)`);
        }
      }
    } catch (error) {
      console.error(`❌ Exception testing ${method.name}:`, error);
    }
  }
  
  console.log('\nRPC Test Summary:');
  console.log('================');
  console.log('RPC URL:', ETHSTORAGE_RPC_URL);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEsRpc().catch(console.error);
}

export default testEsRpc; 