/**
 * EthStorage Public Data Access Demo
 * 
 * This script demonstrates how to read data stored on EthStorage
 * using the wallet that originally created the data.
 * 
 * Note: EthStorage ties data to specific wallet addresses.
 */

const { EthStorage } = require('ethstorage-sdk');
const dotenv = require('dotenv');

// Load environment variables from .env-ethstorage
dotenv.config({ path: '.env-ethstorage' });

async function readData() {
  console.log('EthStorage Data Access Demo');
  console.log('===========================');
  
  try {
    // Get the original private key used in our tests
    const privateKey = process.env.ETHSTORAGE_PRIVATE_KEY;
    const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    
    console.log('Using the wallet that originally created the data');
    
    // Initialize EthStorage SDK with the original wallet
    console.log('\nInitializing EthStorage SDK...');
    
    const ethStorage = await EthStorage.create({
      // QuarkChain L2 TestNet settings
      rpc: "https://rpc.beta.testnet.l2.quarkchain.io:8545/",
      ethStorageRpc: "https://rpc.beta.testnet.l2.ethstorage.io:9596/",
      // Contract address
      address: "0x64003adbdf3014f7E38FC6BE752EB047b95da89A",
      // Original private key
      privateKey: formattedPrivateKey
    });
    
    console.log('✅ EthStorage SDK initialized');
    
    // The key we used in our earlier test
    const keyToRead = "direct-test-1740690424950.txt";
    
    console.log(`\nAttempting to read data with key: ${keyToRead}`);
    
    // Read the data
    const data = await ethStorage.read(keyToRead);
    
    // Convert the data to a proper string
    const dataString = Buffer.from(data).toString('utf8');
    
    // Display the data
    console.log('\n--- Retrieved Content (as text) ---');
    console.log(dataString);
    console.log('----------------------------------');
    
    // Also display raw bytes for comparison
    console.log('\n--- Raw Bytes ---');
    console.log(data);
    console.log('-----------------');
    
    console.log('\n✅ Successfully read data!');
    console.log('Important Security Note: EthStorage appears to tie data to specific wallet addresses.');
    console.log('This means only the wallet that wrote the data can read it by key.');
    console.log('However, the actual data is still stored on the blockchain and could potentially');
    console.log('be accessed through lower-level means if someone has transaction details.');
    
  } catch (error) {
    console.error('Error reading data:', error.message);
  }
}

// Run the demo
readData().catch(console.error); 