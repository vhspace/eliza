#!/usr/bin/env node
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { LitNodeClientNodeJs } from '@lit-protocol/lit-node-client-nodejs';
import { 
  AuthSig,
  EvmContractConditions,
  Chain,
  SessionSigsMap
} from '@lit-protocol/types';
import { LIT_NETWORKS } from '@lit-protocol/constants';
import { decryptToString } from '@lit-protocol/encryption';
import axios from 'axios';

dotenv.config();

interface EncryptedFile {
  fileId: string;
  ciphertext: string;
  dataToEncryptHash: string;
  contractAddress: string;
}

// Define valid networks and chains
type LitNetwork = 'datil' | 'datil-dev' | 'datil-test' | 'custom';
type LitChain = 'sepolia' | 'ethereum' | 'polygon' | 'goerli';

/**
 * Simple script to decrypt a file directly from ethstorage
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const fileUrl = args[0] || '';
    const outputFilename = args[1] || 'decrypted-file.json';
    
    if (!fileUrl) {
      console.error('Error: File URL is required');
      console.log('Usage: node manual-decrypt.js <fileUrl> [outputFilename]');
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
    const networkEnv = process.env.LIT_NETWORK || 'datil-test';
    const chainEnv = process.env.CHAIN || 'sepolia';
    
    // Ensure we have valid values
    const network = networkEnv as LitNetwork;
    const chain = chainEnv as LitChain;
    
    if (!privateKey) {
      console.error('Error: WALLET_PRIVATE_KEY is required in .env file');
      process.exit(1);
    }
    
    // Initialize ethers wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://sepolia.infura.io/v3/your-infura-key');
    const wallet = new ethers.Wallet(privateKey, provider);
    const walletAddress = await wallet.getAddress();
    
    console.log(`Using wallet address: ${walletAddress}`);
    console.log(`Using Lit Network: ${network}`);
    console.log(`Using Chain: ${chain}`);
    
    // Fetch the encrypted file
    console.log(`Fetching encrypted file from: ${fileUrl}`);
    const response = await axios.get(fileUrl);
    const fileData = response.data;
    
    if (!fileData || !fileData.ciphertext || !fileData.dataToEncryptHash) {
      console.error('Invalid file format or file not found');
      console.log(fileData);
      process.exit(1);
    }
    
    const encryptedFile: EncryptedFile = {
      fileId,
      ciphertext: fileData.ciphertext,
      dataToEncryptHash: fileData.dataToEncryptHash,
      contractAddress
    };
    
    console.log('File fetched successfully. Decrypting...');
    
    // Initialize Lit client - specify network
    const litNodeClient = new LitNodeClientNodeJs({
      litNetwork: LIT_NETWORKS[network],
      debug: true,
    });
    
    await litNodeClient.connect();
    console.log('Connected to Lit Protocol');
    
    // Create auth signature
    const domain = 'localhost';
    const origin = 'https://localhost/login';
    const statement = 'This is a test statement. You can put anything you want here.';
    
    const nonce = litNodeClient.getLatestBlockhash();
    
    // Sign with the wallet
    const signedMessage = await wallet.signMessage(
      `${domain} wants you to sign in with your Ethereum account:\n${walletAddress}\n\n${statement}\n\nURI: ${origin}\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`
    );
    
    const authSig: AuthSig = {
      sig: signedMessage,
      derivedVia: 'web3.eth.personal.sign',
      signedMessage: statement,
      address: walletAddress,
    };
    
    console.log('Auth signature created');
    
    // Create a SessionSigsMap from authSig
    const sessionSigs: SessionSigsMap = {
      [walletAddress]: authSig
    };
    
    // Define evmContractConditions similar to the provided function
    const evmContractConditions: EvmContractConditions = [
      {
        contractAddress: encryptedFile.contractAddress,
        functionName: "hasAccess",
        functionParams: [encryptedFile.fileId, ":userAddress"],
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
        chain: chain,
        returnValueTest: {
          key: "",
          comparator: "=",
          value: "true",
        },
      },
    ];
    
    // Decrypt the file using decryptToString as shown in the provided function
    console.log('Attempting to decrypt with Lit Protocol...');
    try {
      // Use decryptToString
      const decryptedString = await decryptToString(
        {
          evmContractConditions,
          chain,
          ciphertext: encryptedFile.ciphertext,
          dataToEncryptHash: encryptedFile.dataToEncryptHash,
          sessionSigs,
        },
        litNodeClient
      );
      
      console.log('Decryption successful');
      
      // Save the decrypted file
      try {
        // Try to parse as JSON for pretty formatting
        const content = JSON.parse(decryptedString);
        fs.writeFileSync(outputFilename, JSON.stringify(content, null, 2));
      } catch (e) {
        // If not valid JSON, save as plain text
        fs.writeFileSync(outputFilename, decryptedString);
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