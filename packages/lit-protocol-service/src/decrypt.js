#!/usr/bin/env node
require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const axios = require('axios');
const { LitNodeClientNodeJs } = require('@lit-protocol/lit-node-client-nodejs');
const { decryptToString } = require('@lit-protocol/encryption');

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const fileUrl = args[0] || '';
    const outputFilename = args[1] || 'decrypted-file.json';
    
    if (!fileUrl) {
      console.error('Error: File URL is required');
      console.log('Usage: node decrypt.js <fileUrl> [outputFilename]');
      process.exit(1);
    }
    
    // Extract info from URL
    const urlParts = new URL(fileUrl);
    const hostParts = urlParts.hostname.split('.');
    const contractAddress = hostParts[0];
    const fileId = urlParts.pathname.substring(1); // Remove leading slash
    
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`File ID: ${fileId}`);
    
    // Load environment variables
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    const network = process.env.LIT_NETWORK || 'datil-test';
    const chain = process.env.CHAIN || 'sepolia';
    const validationMethod = process.env.VALIDATION_METHOD || 'hasAccess';
    
    // Set appropriate RPC URL based on the chain
    let rpcUrl = process.env.RPC_URL;
    if (chain === 'quarkchain' && !rpcUrl) {
      rpcUrl = 'https://testnet-l2-ethapi.quarkchain.io';
      console.log(`Using QuarkChain L2 Testnet RPC: ${rpcUrl}`);
    }
    
    // Define chain details
    const quarkchainDetails = {
      name: 'QuarkChain L2 Testnet',
      chainId: 110011,
      symbol: 'QKC'
    };
    
    // Common Ethereum chain IDs to try
    const chainIds = {
      ethereum: 1,         // Mainnet
      sepolia: 11155111,   // Sepolia testnet
      goerli: 5,           // Goerli testnet
      polygon: 137,        // Polygon mainnet
      quarkchain: 110011,  // QuarkChain L2 Testnet
    };
    
    // For Lit Protocol operations, map the chain
    let litChain = chain;
    // If using quarkchain, use ethereum for Lit operations as fallback
    if (chain === 'quarkchain') {
      litChain = 'ethereum';
      console.log(`Mapping QuarkChain to ${litChain} for Lit Protocol compatibility`);
    }
    
    // Use the correct chain ID for authentication
    const litChainId = chainIds[chain] || chainIds.ethereum; // Use mapped chain ID or default to Ethereum
    
    console.log(`Using blockchain chain: ${chain} (Chain ID: ${litChainId}) for contract interactions`);
    console.log(`Using Lit Protocol chain: ${litChain} for Lit operations`);
    
    if (!privateKey) {
      console.error('Error: WALLET_PRIVATE_KEY is required in .env file');
      process.exit(1);
    }
    
    console.log(`Using validation method: ${validationMethod}`);
    
    // Initialize ethers wallet for the chain where the contract is deployed
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const walletAddress = await wallet.getAddress();
    
    console.log(`Using wallet address: ${walletAddress}`);
    console.log(`Using Lit Network: ${network}`);
    
    // Fetch the encrypted file
    console.log(`Fetching encrypted file from: ${fileUrl}`);
    const response = await axios.get(fileUrl);
    const fileData = response.data;
    
    if (!fileData || !fileData.ciphertext || !fileData.dataToEncryptHash) {
      console.error('Invalid file format or file not found');
      console.log(fileData);
      process.exit(1);
    }
    
    const ciphertext = fileData.ciphertext;
    const dataToEncryptHash = fileData.dataToEncryptHash;
    
    console.log('File fetched successfully. Initializing Lit client...');
    
    // Initialize Lit client
    const litClient = new LitNodeClientNodeJs({
      litNetwork: network,
      debug: true
    });
    
    await litClient.connect();
    console.log('Connected to Lit Protocol');
    
    // Get auth signature
    const domain = 'localhost';
    const origin = 'https://localhost/login';
    const statement = 'This is a test statement. You can put anything you want here.';
    
    const timestamp = new Date().toISOString();
    const nonce = await litClient.getLatestBlockhash();
    const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Use proper SIWE message format with correct chain ID
    const messageToSign = `${domain} wants you to sign in with your Ethereum account:
${walletAddress}

${statement}

URI: ${origin}
Version: 1
Chain ID: ${litChainId}
Nonce: ${nonce}
Issued At: ${timestamp}
Expiration Time: ${expirationTime}`;

    // Sign with the wallet
    const signedMessage = await wallet.signMessage(messageToSign);
    
    const authSig = {
      sig: signedMessage,
      derivedVia: 'web3.eth.personal.sign',
      signedMessage: messageToSign,
      address: walletAddress,
    };
    
    console.log('Auth signature created');
    console.log(`Using address: ${walletAddress} for authentication`);

    // Try different decryption approaches in sequence
    // Custom QuarkChain approach
    try {
      console.log('Trying to decrypt with custom QuarkChain configuration...');
      
      // Try a custom configuration that explicitly sets QuarkChain
      const customChainAccessControlConditions = [
        {
          contractAddress: '',
          standardContractType: '',
          chain: 'ethereum', // Use 'ethereum' as the base chain for Lit
          method: '',
          parameters: [':userAddress'],
          returnValueTest: {
            comparator: '=',
            value: walletAddress.toLowerCase(),
          },
          // Add custom chain information
          customChain: {
            name: 'QuarkChain L2 Testnet',
            chainId: 110011,
            rpcUrl: rpcUrl
          }
        },
      ];
      
      console.log('Decrypt params:', JSON.stringify({
        accessControlConditions: customChainAccessControlConditions,
        chain: 'ethereum',
        ciphertext,
        dataToEncryptHash,
        authSig
      }, null, 2));

      let decryptedString = await decryptToString(
        {
          accessControlConditions: customChainAccessControlConditions,
          chain: 'ethereum',
          ciphertext,
          dataToEncryptHash,
          authSig
        },
        litClient
      );
      
      console.log('Decryption successful with custom QuarkChain configuration');
      
      try {
        const content = JSON.parse(decryptedString);
        fs.writeFileSync(outputFilename, JSON.stringify(content, null, 2));
      } catch (e) {
        fs.writeFileSync(outputFilename, decryptedString);
      }
      
      console.log(`Decrypted file saved to: ${outputFilename}`);
      return; // Exit if successful
    } catch (customChainError) {
      console.log('Custom QuarkChain approach failed:', customChainError.message);
    }

    // Sepolia testnet approach
    try {
      console.log('Trying to decrypt using Sepolia testnet (chain ID: 11155111)...');
      
      // Try a simplified condition that just checks wallet ownership
      const accessControlConditions = [
        {
          contractAddress: '',
          standardContractType: '',
          chain: 'sepolia',
          chainId: chainIds.sepolia, // Sepolia testnet
          method: '',
          parameters: [':userAddress'],
          returnValueTest: {
            comparator: '=',
            value: walletAddress.toLowerCase(),
          },
        },
      ];
      
      console.log('Decrypt params:', JSON.stringify({
        accessControlConditions,
        chain: 'sepolia',
        ciphertext,
        dataToEncryptHash,
        authSig
      }, null, 2));

      let decryptedString = await decryptToString(
        {
          accessControlConditions,
          chain: 'sepolia',
          ciphertext,
          dataToEncryptHash,
          authSig
        },
        litClient
      );
      
      console.log('Decryption successful with Sepolia testnet wallet ownership verification');
      
      try {
        const content = JSON.parse(decryptedString);
        fs.writeFileSync(outputFilename, JSON.stringify(content, null, 2));
      } catch (e) {
        fs.writeFileSync(outputFilename, decryptedString);
      }
      
      console.log(`Decrypted file saved to: ${outputFilename}`);
      return; // Exit if successful
    } catch (sepoliaError) {
      console.log('Sepolia testnet approach failed:', sepoliaError.message);
    }
    
    // Goerli testnet approach
    try {
      console.log('Trying to decrypt using Goerli testnet (chain ID: 5)...');
      
      const accessControlConditions = [
        {
          contractAddress: '',
          standardContractType: '',
          chain: 'goerli',
          chainId: chainIds.goerli, // Goerli testnet
          method: '',
          parameters: [':userAddress'],
          returnValueTest: {
            comparator: '=',
            value: walletAddress.toLowerCase(),
          },
        },
      ];
      
      console.log('Decrypt params:', JSON.stringify({
        accessControlConditions,
        chain: 'goerli',
        ciphertext,
        dataToEncryptHash,
        authSig
      }, null, 2));

      let decryptedString = await decryptToString(
        {
          accessControlConditions,
          chain: 'goerli',
          ciphertext,
          dataToEncryptHash,
          authSig
        },
        litClient
      );
      
      console.log('Decryption successful with Goerli testnet wallet ownership verification');
      
      try {
        const content = JSON.parse(decryptedString);
        fs.writeFileSync(outputFilename, JSON.stringify(content, null, 2));
      } catch (e) {
        fs.writeFileSync(outputFilename, decryptedString);
      }
      
      console.log(`Decrypted file saved to: ${outputFilename}`);
      return; // Exit if successful
    } catch (goerliError) {
      console.log('Goerli testnet approach failed:', goerliError.message);
    }

    // First approach with EVM contract conditions
    try {
      console.log('Approach 1: Using contract address in EVM conditions...');
      console.log(`Contract chain ID: ${litChainId}`);
      
      const evmContractConditions = [
        {
          contractAddress: contractAddress,
          functionName: validationMethod,
          functionParams: [fileId, ":userAddress"],
          functionAbi: {
            inputs: [
              {
                internalType: "string",
                name: "cid",
                type: "string"
              },
              {
                internalType: "address",
                name: "requestor",
                type: "address"
              }
            ],
            name: validationMethod,
            outputs: [
              {
                "internalType": "bool",
                "name": "",
                "type": "bool"
              }
            ],
            stateMutability: "view",
            type: "function"
          },
          chain: litChain,
          chainId: litChainId, // Include chain ID directly
          returnValueTest: {
            key: "",
            comparator: "=",
            value: "true",
          },
        },
      ];
      
      console.log('Decrypt params:', JSON.stringify({
        evmContractConditions,
        chain: litChain,
        ciphertext,
        dataToEncryptHash,
        authSig
      }, null, 2));

      let decryptedString = await decryptToString(
        {
          evmContractConditions,
          chain: litChain,
          ciphertext,
          dataToEncryptHash,
          authSig
        },
        litClient
      );
      
      console.log('Decryption successful with EVM contract conditions');
      
      try {
        const content = JSON.parse(decryptedString);
        fs.writeFileSync(outputFilename, JSON.stringify(content, null, 2));
      } catch (e) {
        fs.writeFileSync(outputFilename, decryptedString);
      }
      
      console.log(`Decrypted file saved to: ${outputFilename}`);
      return; // Exit if successful
    } catch (firstError) {
      console.log('First approach failed:', firstError.message);
    }
    
    // Second approach
    try {
      console.log('Approach 2: Using ethereum chain with contract ownership verification...');
      console.log(`Contract chain ID: ${litChainId}`);
      
      const accessControlConditions = [
        {
          contractAddress: contractAddress,
          standardContractType: "ERC721",
          chain: litChain,
          chainId: litChainId, // Include chain ID directly
          method: "ownerOf",
          parameters: ["1"], // Token ID 1
          returnValueTest: {
            comparator: "=",
            value: walletAddress.toLowerCase(),
          },
        },
      ];
      
      console.log('Decrypt params:', JSON.stringify({
        accessControlConditions,
        chain: litChain,
        ciphertext,
        dataToEncryptHash,
        authSig
      }, null, 2));
      
      let decryptedString = await decryptToString(
        {
          accessControlConditions,
          chain: litChain,
          ciphertext,
          dataToEncryptHash,
          authSig
        },
        litClient
      );
      
      console.log('Decryption successful with contract ownership verification');
      
      try {
        const content = JSON.parse(decryptedString);
        fs.writeFileSync(outputFilename, JSON.stringify(content, null, 2));
      } catch (e) {
        fs.writeFileSync(outputFilename, decryptedString);
      }
      
      console.log(`Decrypted file saved to: ${outputFilename}`);
      return; // Exit if successful
    } catch (secondError) {
      console.log('Second approach failed:', secondError.message);
    }
    
    // Third approach
    try {
      console.log('Approach 3: Using ethereum chain with wallet ownership verification...');
      console.log(`Contract chain ID: ${litChainId}`);
      
      const accessControlConditions = [
        {
          contractAddress: '',
          standardContractType: '',
          chain: litChain,
          chainId: litChainId, // Include chain ID directly
          method: '',
          parameters: [':userAddress'],
          returnValueTest: {
            comparator: '=',
            value: walletAddress.toLowerCase(),
          },
        },
      ];
      
      console.log('Decrypt params:', JSON.stringify({
        accessControlConditions,
        chain: litChain,
        ciphertext,
        dataToEncryptHash,
        authSig
      }, null, 2));
      
      let decryptedString = await decryptToString(
        {
          accessControlConditions,
          chain: litChain,
          ciphertext,
          dataToEncryptHash,
          authSig
        },
        litClient
      );
      
      console.log('Decryption successful with wallet ownership verification');
      
      try {
        const content = JSON.parse(decryptedString);
        fs.writeFileSync(outputFilename, JSON.stringify(content, null, 2));
      } catch (e) {
        fs.writeFileSync(outputFilename, decryptedString);
      }
      
      console.log(`Decrypted file saved to: ${outputFilename}`);
      return; // Exit if successful
    } catch (thirdError) {
      console.log('Third approach failed:', thirdError.message);
    }
    
    // Fourth approach
    try {
      console.log('Approach 4: Using ethereum chain with unified access control conditions...');
      console.log(`Contract chain ID: ${litChainId}`);
      
      const unifiedAccessControlConditions = [
        {
          conditionType: "evmBasic",
          contractAddress: "",
          standardContractType: "",
          chain: litChain,
          chainId: litChainId, // Include chain ID directly
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: walletAddress.toLowerCase()
          }
        }
      ];
      
      console.log('Decrypt params:', JSON.stringify({
        unifiedAccessControlConditions,
        chain: litChain,
        ciphertext,
        dataToEncryptHash,
        authSig
      }, null, 2));
      
      let decryptedString = await decryptToString(
        {
          unifiedAccessControlConditions,
          chain: litChain,
          ciphertext,
          dataToEncryptHash,
          authSig
        },
        litClient
      );
      
      console.log('Decryption successful with unified access control conditions');
      
      try {
        const content = JSON.parse(decryptedString);
        fs.writeFileSync(outputFilename, JSON.stringify(content, null, 2));
      } catch (e) {
        fs.writeFileSync(outputFilename, decryptedString);
      }
      
      console.log(`Decrypted file saved to: ${outputFilename}`);
      return; // Exit if successful
    } catch (fourthError) {
      console.log('Fourth approach failed:', fourthError.message);
    }
    
    // Fifth approach (fallback)
    try {
      console.log('Approach 5: Fallback with detailed EVM contract conditions...');
      console.log(`Contract chain ID: ${litChainId}`);
      
      const evmContractConditions = [
        {
          contractAddress: contractAddress,
          functionName: validationMethod,
          functionParams: [fileId, ":userAddress"],
          functionAbi: {
            inputs: [
              {
                name: "cid",
                type: "string"
              },
              {
                name: "requestor",
                type: "address"
              }
            ],
            name: validationMethod,
            outputs: [
              {
                name: "",
                type: "bool"
              }
            ],
            stateMutability: "view",
            type: "function"
          },
          chain: litChain,
          chainId: litChainId, // Include chain ID directly
          returnValueTest: {
            key: "",
            comparator: "=",
            value: "true",
          },
        },
      ];
      
      console.log('Decrypt params:', JSON.stringify({
        evmContractConditions,
        chain: litChain,
        ciphertext,
        dataToEncryptHash,
        authSig
      }, null, 2));

      let decryptedString = await decryptToString(
        {
          evmContractConditions,
          chain: litChain,
          ciphertext,
          dataToEncryptHash,
          authSig
        },
        litClient
      );
      
      console.log('Decryption successful with fallback EVM contract conditions');
      
      try {
        const content = JSON.parse(decryptedString);
        fs.writeFileSync(outputFilename, JSON.stringify(content, null, 2));
      } catch (e) {
        fs.writeFileSync(outputFilename, decryptedString);
      }
      
      console.log(`Decrypted file saved to: ${outputFilename}`);
      return; // Exit if successful
    } catch (fifthError) {
      console.error('All decryption attempts failed:');
      console.error('First approach error:', firstError?.message || 'N/A');
      console.error('Second approach error:', secondError?.message || 'N/A');
      console.error('Third approach error:', thirdError?.message || 'N/A');
      console.error('Fourth approach error:', fourthError?.message || 'N/A');
      console.error('Fifth approach error:', fifthError.message);
      
      console.log("\nDetailed errors:");
      console.error('\nFirst attempt detailed error:', firstError || 'N/A');
      console.error('\nSecond attempt detailed error:', secondError || 'N/A');
      console.error('\nThird attempt detailed error:', thirdError || 'N/A');
      console.error('\nFourth attempt detailed error:', fourthError || 'N/A');
      console.error('\nFifth attempt detailed error:', fifthError);
    }
    
    console.error('All decryption attempts failed.');
    
  } catch (outerError) {
    console.error('Outer Error:', outerError);
  }
}

main().catch(console.error); 