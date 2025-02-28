import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
// Use web3.js instead of ethers.js
import Web3 from 'web3';

// Load environment variables
dotenv.config({ path: '.env-ethstorage' });

// Simplified ABI just for the read function
const MINIMAL_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "key",
        "type": "string"
      }
    ],
    "name": "read",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  // Check required environment variables
  const rpcUrl = process.env.ETHSTORAGE_RPC_URL;
  const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
  
  if (!rpcUrl || !privateKey) {
    console.error('Error: ETHSTORAGE_RPC_URL and ETHSTORAGE_PRIVATE_KEY must be set in .env-ethstorage');
    process.exit(1);
  }
  
  // Format private key with 0x prefix if needed
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  // Command line arguments
  const command = process.argv[2]?.toLowerCase();
  const fileKey = process.argv[3];
  const outputPath = process.argv[4];
  
  if (!command || !fileKey) {
    console.log('Usage: node dist/direct_web3_reader.js <read|download> <fileKey> [outputPath]');
    process.exit(1);
  }
  
  try {
    // Initialize web3
    const web3 = new Web3(rpcUrl);
    const account = web3.eth.accounts.privateKeyToAccount(formattedPrivateKey);
    web3.eth.accounts.wallet.add(account);
    
    console.log(`Using wallet address: ${account.address}`);
    
    // The EthStorage contract address
    // You may need to update this if your contract is different
    const contractAddress = '0x804C520d3c084C805E37A35E90057Ac32831F96f';
    const contract = new web3.eth.Contract(MINIMAL_ABI, contractAddress);
    
    console.log(`Attempting to ${command} file: ${fileKey}`);
    
    // Try different methods to read the data
    let data = null;
    let error = null;
    
    try {
      // Method 1: Using the contract method directly
      console.log('Attempt 1: Using contract.methods.read...');
      data = await contract.methods.read(fileKey).call({from: account.address});
      console.log('Success with method 1!');
    } catch (err) {
      console.log(`Method 1 failed: ${err.message}`);
      error = err;
      
      try {
        // Method 2: Using lower-level call
        console.log('Attempt 2: Using contract.methods.read with gas limit...');
        data = await contract.methods.read(fileKey).call({
          from: account.address,
          gas: '2000000' // Fix: gas must be a string
        });
        console.log('Success with method 2!');
      } catch (err2) {
        console.log(`Method 2 failed: ${err2.message}`);
        
        try {
          // Method 3: Using even lower-level eth_call
          console.log('Attempt 3: Using direct eth_call...');
          // Encode the function call manually
          const functionSignature = web3.utils.sha3('read(string)').slice(0, 10);
          const encodedKey = web3.eth.abi.encodeParameter('string', fileKey);
          // Remove the 0x prefix and type info from encodedKey
          const callData = functionSignature + encodedKey.slice(2);
          
          const result = await web3.eth.call({
            to: contractAddress,
            from: account.address,
            data: callData,
            gas: '5000000' // Fix: gas must be a string
          });
          
          // Decode the result
          data = web3.eth.abi.decodeParameter('bytes', result);
          console.log('Success with method 3!');
        } catch (err3) {
          console.log(`Method 3 failed: ${err3.message}`);
          console.error('All methods failed to read the data');
        }
      }
    }
    
    if (!data) {
      console.error('Failed to read file from EthStorage');
      process.exit(1);
    }
    
    // Convert the result to a buffer
    // Web3.js might return hex string with 0x prefix
    const dataBuffer = Buffer.from(data.startsWith('0x') ? data.slice(2) : data, 'hex');
    
    if (command === 'read') {
      // Try to determine if it's a text file or binary file
      let isText = true;
      for (let i = 0; i < Math.min(dataBuffer.length, 1000); i++) {
        if (dataBuffer[i] === 0 || (dataBuffer[i] > 127 && dataBuffer[i] < 160)) {
          isText = false;
          break;
        }
      }
      
      if (isText) {
        // It's likely a text file, so display its contents
        const text = dataBuffer.toString('utf8');
        console.log('\n--- File Contents ---');
        console.log(text);
        console.log('--- End of File ---');
      } else {
        // It's likely a binary file, so just show info
        console.log(`File type: Binary (${dataBuffer.length} bytes)`);
        console.log('Use download command to save this file');
      }
    } else if (command === 'download') {
      const outPath = outputPath || `./${fileKey}`;
      
      // Ensure directory exists
      const dir = path.dirname(outPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write the file
      await fs.writeFile(outPath, dataBuffer);
      console.log(`File downloaded successfully to ${outPath}`);
      console.log(`Size: ${dataBuffer.length} bytes`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 