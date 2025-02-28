/**
 * EthStorage RPC Test
 * Tests basic EthStorage RPC functionality
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import fetch from 'node-fetch';

// Load environment variables from the .env-ethstorage file
const envPath = path.resolve(process.cwd(), '../../.env-ethstorage');
dotenv.config({ path: envPath });

// Get configuration from environment variables
const ETHSTORAGE_RPC_URL = process.env.ETHSTORAGE_ETH_STORAGE_RPC_URL || 'http://65.108.236.27:9540';
const CONTRACT_ADDRESS = process.env.ETHSTORAGE_CONTRACT_ADDRESS || '0x804C520d3c084C805E37A35E90057Ac32831F96f';

async function testRpcFunctionality(): Promise<void> {
  console.log('EthStorage RPC Functionality Test');
  console.log('===============================');
  console.log(`RPC URL: ${ETHSTORAGE_RPC_URL}`);
  console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
  
  // Get private key from env
  const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: ETHSTORAGE_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }
  
  // Initialize wallet and provider
  try {
    console.log('\nInitializing provider...');
    const provider = new ethers.JsonRpcProvider(ETHSTORAGE_RPC_URL);
    
    // Check if provider is connected
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
    
    // Get block number to check network status
    const blockNumber = await provider.getBlockNumber();
    console.log(`Current block number: ${blockNumber}`);
    
    // Initialize wallet
    const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const wallet = new ethers.Wallet(formattedPrivateKey, provider);
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Get wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
    
    // Try to call a function on the EthStorage contract
    console.log(`\nTrying to get information about the contract at: ${CONTRACT_ADDRESS}`);
    
    // Check if contract exists by getting its code
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      console.log(`❌ No contract found at address ${CONTRACT_ADDRESS}`);
    } else {
      console.log(`✅ Contract found at address ${CONTRACT_ADDRESS} (code length: ${code.length} bytes)`);
    }
    
    // Use a simple eth_call to check contract functionality
    // This will try to call a common read method without knowing the ABI
    const methods = [
      { name: 'version()', selector: '0x54fd4d50' },
      { name: 'getVersion()', selector: '0x0d8e6e2c' },
      { name: 'owner()', selector: '0x8da5cb5b' }
    ];
    
    for (const method of methods) {
      try {
        console.log(`\nTrying to call ${method.name}...`);
        const data = {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [
            {
              to: CONTRACT_ADDRESS,
              data: method.selector
            },
            'latest'
          ]
        };
        
        const response = await fetch(ETHSTORAGE_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`Result: ${JSON.stringify(result, null, 2)}`);
          
          if (result.error) {
            console.log(`❌ Error calling ${method.name}: ${result.error.message}`);
          } else if (result.result) {
            console.log(`✅ Successfully called ${method.name}`);
            if (result.result !== '0x') {
              console.log(`Result value: ${result.result}`);
            }
          }
        } else {
          console.error(`Error response: ${await response.text()}`);
        }
      } catch (error) {
        console.error(`Error calling ${method.name}:`, error);
      }
    }
    
    console.log('\nEthStorage RPC Test Summary:');
    console.log('==========================');
    console.log('RPC URL:', ETHSTORAGE_RPC_URL);
    console.log('Contract Address:', CONTRACT_ADDRESS);
    console.log('Connected to chainId:', network.chainId.toString());
    console.log('Current block:', blockNumber);
    console.log('Wallet balance:', ethers.formatEther(balance), 'ETH');
  } catch (error) {
    console.error('Error running RPC tests:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRpcFunctionality().catch(console.error);
}

export default testRpcFunctionality; 