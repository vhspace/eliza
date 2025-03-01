#!/usr/bin/env node
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';
import axios from 'axios';
import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';
import { decryptToString } from '@lit-protocol/encryption';

dotenv.config();

// Simple script to decrypt a file from ethstorage using the provided decrypt function pattern
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const fileUrl = args[0] || '';
    const outputFilename = args[1] || 'decrypted-file.json';
    
    if (!fileUrl) {
      console.error('Error: File URL is required');
      console.log('Usage: ts-node src/simple-decrypt.ts <fileUrl> [outputFilename]');
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
    
    if (!privateKey) {
      console.error('Error: WALLET_PRIVATE_KEY is required in .env file');
      process.exit(1);
    }
    
    // Initialize ethers wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://sepolia.infura.io/v3/');
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
    });
    
    await litClient.connect();
    console.log('Connected to Lit Protocol');
    
    // Create capacity delegation auth signature (mock for testing)
    const capacityDelegationAuthSig = {
      sig: 'mock_signature',
      derivedVia: 'web3.eth.personal.sign',
      signedMessage: 'mock_message',
      address: walletAddress,
    };
    
    // Implementation based on the provided decrypt function
    async function decrypt(ciphertext, dataToEncryptHash, capacityDelegationAuthSig, fileID, signer, signerAddress) {
      // Get session signatures
      const sessionSigsMessage = `Auth for Lit Protocol at ${Date.now()}`;
      const signedMessage = await signer.signMessage(sessionSigsMessage);
      
      const sessionSigs = {
        sig: signedMessage,
        derivedVia: 'ethers.js',
        signedMessage: sessionSigsMessage,
        address: signerAddress,
      };
      
      const evmContractConditions = [
        {
          contractAddress: contractAddress,
          functionName: "hasAccess",
          functionParams: [fileID, ":userAddress"],
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
            name: "hasAccess",
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
          chain: "sepolia",
          returnValueTest: {
            key: "",
            comparator: "=",
            value: "true",
          },
        },
      ];
      
      const decryptedString = await decryptToString(
        {
          evmContractConditions,
          chain: chain,
          ciphertext,
          dataToEncryptHash,
          sessionSigs,
        },
        litClient
      );
      
      return { decryptedString };
    }
    
    // Decrypt the file
    console.log('Attempting to decrypt...');
    try {
      const result = await decrypt(
        ciphertext,
        dataToEncryptHash,
        capacityDelegationAuthSig,
        fileId,
        wallet,
        walletAddress
      );
      
      console.log('Decryption successful');
      
      // Save the decrypted file
      try {
        // Try to parse as JSON for pretty formatting
        const content = JSON.parse(result.decryptedString);
        fs.writeFileSync(outputFilename, JSON.stringify(content, null, 2));
      } catch (e) {
        // If not valid JSON, save as plain text
        fs.writeFileSync(outputFilename, result.decryptedString);
      }
      
      console.log(`Decrypted file saved to: ${outputFilename}`);
    } catch (error) {
      console.error('Error decrypting file:', error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error); 