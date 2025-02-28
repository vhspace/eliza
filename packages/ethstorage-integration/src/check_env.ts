import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env-ethstorage' });

console.log('Checking EthStorage Environment Variables');
console.log('========================================');

// Check and mask the RPC URL
const rpcUrl = process.env.ETHSTORAGE_RPC_URL;
if (rpcUrl) {
  // Mask the API key if present in the URL
  let maskedUrl = rpcUrl;
  // Generic masking for any API keys in URLs
  maskedUrl = rpcUrl.replace(/([a-zA-Z0-9_-]{30,})/g, '***API_KEY_MASKED***');
  console.log('RPC URL:', maskedUrl);
} else {
  console.log('RPC URL: Not set');
}

// Check if private key is present (but don't print it)
const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
if (privateKey) {
  console.log('Private Key: Present (masked for security)');
} else {
  console.log('Private Key: Not set');
}

// Check contract address
const contractAddress = process.env.ETHSTORAGE_CONTRACT_ADDRESS;
if (contractAddress) {
  console.log('Contract Address:', contractAddress);
} else {
  console.log('Contract Address: Not set (will use default)');
}

// Print any other relevant environment variables
console.log('\nOther Configuration:');
for (const key of Object.keys(process.env)) {
  if (key.startsWith('ETHSTORAGE_') && 
      key !== 'ETHSTORAGE_RPC_URL' && 
      key !== 'ETHSTORAGE_PRIVATE_KEY' &&
      key !== 'ETHSTORAGE_CONTRACT_ADDRESS') {
    console.log(`${key}: ${process.env[key]}`);
  }
}

console.log('\nChecking for known test files:');
const testFiles = [
  'test-file.txt',
  'user_testuser_facts.json'
];

for (const file of testFiles) {
  console.log(`- ${file}: Known test file that should be readable if previously uploaded`);
} 