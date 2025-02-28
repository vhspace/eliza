/**
 * Tests available RPC methods on the EthStorage endpoint
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env-ethstorage' });

// Official EthStorage RPC endpoint from documentation
const ETHSTORAGE_RPC_URL = "http://65.108.236.27:9540";

async function main() {
  console.log('Testing EthStorage RPC methods');
  console.log('============================');
  console.log(`RPC URL: ${ETHSTORAGE_RPC_URL}`);
  
  // Create a provider
  const provider = new ethers.JsonRpcProvider(ETHSTORAGE_RPC_URL);
  
  try {
    // Try to get basic network information
    console.log('\nGetting basic network information:');
    
    try {
      const network = await provider.getNetwork();
      console.log(`Network: ${network.name}, Chain ID: ${network.chainId} (0x${network.chainId.toString(16)})`);
    } catch (error) {
      console.error('Failed to get network:', error.message);
    }
    
    try {
      const blockNumber = await provider.getBlockNumber();
      console.log(`Block number: ${blockNumber}`);
    } catch (error) {
      console.error('Failed to get block number:', error.message);
    }
    
    try {
      const feeData = await provider.getFeeData();
      console.log('Fee data:', {
        gasPrice: feeData.gasPrice ? feeData.gasPrice.toString() : null,
        maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas.toString() : null,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas.toString() : null
      });
    } catch (error) {
      console.error('Failed to get fee data:', error.message);
    }
    
    // Try some low-level RPC calls
    console.log('\nTrying low-level RPC calls:');
    
    const methods = [
      { name: 'rpc_modules', params: [] },
      { name: 'eth_chainId', params: [] },
      { name: 'eth_getBalance', params: ['0xEE45A0D3466A6a961D286cc61666B7067D7a7619', 'latest'] },
      { name: 'es_getInfo', params: [] },
      { name: 'es_getBlobs', params: [] },
    ];
    
    for (const method of methods) {
      try {
        console.log(`Testing method: ${method.name}...`);
        const result = await provider.send(method.name, method.params);
        console.log(`✅ ${method.name} Result:`, result);
      } catch (error) {
        console.error(`❌ ${method.name} Error:`, error.message);
      }
    }
    
    // Try some custom EthStorage methods based on SDK
    console.log('\nTrying custom EthStorage methods:');
    
    const customMethods = [
      { name: 'es_getBlob', params: ['test_file'] },
      { name: 'es_getStorageNodes', params: [] },
      { name: 'es_uploadBlob', params: [{
        data: '0x1234', 
        signer: '0xEE45A0D3466A6a961D286cc61666B7067D7a7619'
      }] },
    ];
    
    for (const method of customMethods) {
      try {
        console.log(`Testing method: ${method.name}...`);
        const result = await provider.send(method.name, method.params);
        console.log(`✅ ${method.name} Result:`, result);
      } catch (error) {
        console.error(`❌ ${method.name} Error:`, error.message);
      }
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