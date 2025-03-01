#!/usr/bin/env node
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Initialize dotenv
dotenv.config();

// Convert ESM paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to dynamically import and use the lit.js module
async function setupLitModule() {
  try {
    // Create a CommonJS version of lit.js
    const litJsPath = path.join(__dirname, 'lit.js');
    const litJsContent = fs.readFileSync(litJsPath, 'utf8');
    
    // Create a temporary CJS file
    const tempPath = path.join(__dirname, 'lit-temp.cjs');
    const modifiedContent = litJsContent
      .replace(/import \* as LitJsSdk from "@lit-protocol\/lit-node-client";/g, 'const LitJsSdk = require("@lit-protocol/lit-node-client");')
      .replace(/import { LIT_NETWORK, LIT_ABILITY } from "@lit-protocol\/constants";/g, 'const { LIT_NETWORK, LIT_ABILITY } = require("@lit-protocol/constants");')
      .replace(/import { encryptString, decryptToString } from "@lit-protocol\/encryption";/g, 'const { encryptString, decryptToString } = require("@lit-protocol/encryption");')
      .replace(/import { createSiweMessageWithRecaps, generateAuthSig, LitAccessControlConditionResource } from "@lit-protocol\/auth-helpers";/g, 'const { createSiweMessageWithRecaps, generateAuthSig, LitAccessControlConditionResource } = require("@lit-protocol/auth-helpers");')
      .replace(/import axios from "axios";/g, 'const axios = require("axios");')
      .replace(/import\.meta\.env\.VITE_CONTRACT_ADDRESS/g, `"${process.env.CONTRACT_ADDRESS || '0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986'}"`)
      .replace(/import\.meta\.env\.VITE_API_ENDPOINT/g, `"${process.env.API_ENDPOINT || 'http://localhost:3000/'}"`)
      .replace(/export class/g, 'class')
      .replace(/export async function/g, 'async function');
    
    // Add module.exports - make sure to include decryptToString
    const exportsStatement = '\nmodule.exports = { Lit, encryptData, decryptData, decryptToString };\n';
    fs.writeFileSync(tempPath, modifiedContent + exportsStatement);
    
    // Use createRequire to import CommonJS module
    const require = createRequire(import.meta.url);
    return require(tempPath);
  } catch (error) {
    console.error('Error setting up Lit module:', error);
    throw error;
  }
}

// Function to manually call the delegate-capacity endpoint
async function directlyDelegateCapacity(walletAddress, apiEndpoint) {
  console.log(`Directly requesting capacity delegation for address: ${walletAddress}`);
  console.log(`Using API URL: ${apiEndpoint}`);
  
  const req = {
    userAddress: walletAddress,
    capacityTokenIdStr: "default" // Include this required parameter
  };

  try {
    // Call the delegate-capacity endpoint
    const endpoint = `${apiEndpoint}delegate-capacity`;
    console.log(`Calling capacity delegation endpoint: ${endpoint}`);
    
    const resp = await axios.post(endpoint, req, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    console.log("Capacity delegation response status:", resp.status);
    console.log("Capacity delegation response data:", JSON.stringify(resp.data, null, 2));
    
    // Check if delegationAuthSig exists in the response or direct data
    if (resp.data.delegationAuthSig) {
      return resp.data.delegationAuthSig;
    } else if (resp.data && typeof resp.data === 'object') {
      // Some APIs might return the auth sig directly
      return resp.data;
    } else {
      throw new Error("Unable to extract delegationAuthSig from response");
    }
  } catch (error) {
    console.error('Error requesting capacity delegation:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    throw error;
  }
}

// Function to extract and properly format the delegation auth signature
function formatDelegationAuthSig(authSig) {
  console.log('Formatting auth signature');
  
  // If authSig is undefined or null, return it as is
  if (!authSig) {
    console.log('Auth signature is undefined or null');
    return authSig;
  }
  
  // If authSig has capacityDelegationAuthSig property (from API response)
  if (authSig.delegationAuthSig && authSig.delegationAuthSig.capacityDelegationAuthSig) {
    console.log('Found nested capacityDelegationAuthSig property in API response');
    return authSig.delegationAuthSig.capacityDelegationAuthSig;
  }
  
  // If authSig has delegationAuthSig property (from API response)
  if (authSig.delegationAuthSig) {
    console.log('Found delegationAuthSig property in API response');
    return authSig.delegationAuthSig;
  }
  
  // If authSig already looks like a valid auth signature
  if (authSig.sig && authSig.signedMessage) {
    console.log('Auth signature already in correct format');
    return authSig;
  }
  
  // If authSig has capacityDelegationAuthSig as direct property
  if (authSig.capacityDelegationAuthSig) {
    console.log('Found direct capacityDelegationAuthSig property');
    return authSig.capacityDelegationAuthSig;
  }

  console.log('Returning original auth signature');
  return authSig;
}

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const fileUrl = args[0] || 'https://0xe8515a3786d8ef25398aa54c3580a34a0da48397.3337.w3link.io/0x6969eea2f225e64c0857d07a9a9752f57fb61d56-1740804908722';
    const outputFilename = args[1] || 'decrypted-file.json';
    
    // Set environment variables
    const privateKey = process.env.WALLET_PRIVATE_KEY || 'cae12297a07b1d5a55515ec06cb378878cb99bdd0e43c505ffe8b9748103134d';
    process.env.CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0xe8515A3786d8Ef25398aA54C3580a34a0DA48397';
    process.env.API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:3000/';
    
    // Extract info from URL
    const urlParts = new URL(fileUrl);
    const pathParts = urlParts.pathname.split('/');
    const fileId = pathParts[pathParts.length - 1]; // Get the last part of the path
    
    console.log(`File ID: ${fileId}`);
    console.log(`Using contract address from env: ${process.env.CONTRACT_ADDRESS}`);
    
    // Initialize ethers wallet with the Infura Sepolia RPC endpoint
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://sepolia.infura.io/v3/4d74848dcabf45e281e242222312fbd1');
    const wallet = new ethers.Wallet(privateKey, provider);
    const walletAddress = await wallet.getAddress();
    
    console.log(`Using wallet address: ${walletAddress}`);
    
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
    
    console.log('File fetched successfully');
    
    // Log all file data to inspect the access control conditions
    console.log('Complete file data:');
    console.log(JSON.stringify(fileData, null, 2));
    
    // Check if accessControlConditions or evmContractConditions exist in the file data
    if (fileData.accessControlConditions) {
      console.log('Found accessControlConditions in file:', JSON.stringify(fileData.accessControlConditions, null, 2));
    }
    
    if (fileData.evmContractConditions) {
      console.log('Found evmContractConditions in file:', JSON.stringify(fileData.evmContractConditions, null, 2));
    }
    
    if (fileData.unifiedAccessControlConditions) {
      console.log('Found unifiedAccessControlConditions in file:', JSON.stringify(fileData.unifiedAccessControlConditions, null, 2));
    }
    
    // Import and use the Lit module
    const litModule = await setupLitModule();
    const { Lit } = litModule;
    
    // Initialize Lit client with sepolia chain
    const chain = "sepolia";
    const myLit = new Lit(chain);
    await myLit.connect();
    
    // Apply necessary patches to the Lit module
    applyLitPatches(myLit, walletAddress);
    
    // Request capacity delegation
    console.log("Requesting capacity delegation...");
    let delegationAuthSig;
    try {
      // Try the direct method first with the required capacityTokenIdStr
      delegationAuthSig = await directlyDelegateCapacity(walletAddress, process.env.API_ENDPOINT);
    } catch (directError) {
      console.warn("Direct capacity delegation failed:", directError.message);
      // Try with the modified method
      console.log("Trying modified delegateCapacity method...");
      delegationAuthSig = await myLit.delegateCapacity(walletAddress);
    }
    
    console.log("Delegation auth signature obtained:", delegationAuthSig ? "Success" : "Failed");
    
    // Format the delegation auth signature
    const formattedDelegationAuthSig = formatDelegationAuthSig(delegationAuthSig);
    console.log("Using formatted delegation auth signature");
    
    // Log the access control conditions that will be used
    console.log("Access control conditions will use:");
    console.log(`- Contract Address: ${process.env.CONTRACT_ADDRESS}`);
    console.log(`- File ID: ${fileId}`);
    console.log(`- User Address: ${walletAddress}`);
    
    // Try multiple decryption approaches using the Lit class directly
    let decryptionSuccess = false;
    let decryptedString;

    // Try to decrypt using the Lit class's decrypt method directly first
    try {
      console.log('Trying to decrypt using the Lit class decrypt method...');
      
      // This uses the standard access checks from lit.js including the hasAccess contract call
      const { decryptedString: result } = await myLit.decrypt(
        ciphertext,
        dataToEncryptHash,
        formattedDelegationAuthSig,
        fileId,
        wallet,
        walletAddress
      );
      
      decryptedString = result;
      console.log('Decryption successful using Lit class decrypt method!');
      decryptionSuccess = true;
    } catch (litDecryptError) {
      console.warn('Lit class decrypt method failed:', litDecryptError.message);
      
      // Fall back to our multiple approach method if the direct approach fails
      try {
        decryptionSuccess = await tryMultipleDecryptionApproaches(
          myLit,
          ciphertext,
          dataToEncryptHash,
          formattedDelegationAuthSig,
          wallet,
          walletAddress,
          fileId
        );
        
        if (!decryptionSuccess) {
          throw new Error('All decryption approaches failed');
        }
      } catch (error) {
        console.error('All decryption approaches failed', error);
        throw error;
      }
    }
    
    // Save the decrypted file
    if (decryptionSuccess && decryptedString) {
      try {
        const content = JSON.parse(decryptedString);
        fs.writeFileSync(outputFilename, JSON.stringify(content, null, 2));
      } catch (e) {
        fs.writeFileSync(outputFilename, decryptedString);
      }
      
      console.log(`Decrypted file saved to: ${outputFilename}`);
    }
    
    // Cleanup
    await myLit.disconnect();
    
  } catch (error) {
    console.error('Error:', error);
    
    // Log detailed error information for debugging
    if (error.info) {
      console.error('Error info:', error.info);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.shortMessage) {
      console.error('Error short message:', error.shortMessage);
    }
    
    process.exit(1);
  }
}

// Apply necessary patches to the Lit module
function applyLitPatches(myLit, walletAddress) {
  // Patch the delegateCapacity method to include capacityTokenIdStr
  myLit.delegateCapacity = async function(userAddress) {
    const req = {
      userAddress: userAddress,
      capacityTokenIdStr: "default"  // Add the required parameter
    };
    
    console.log("Modified delegateCapacity request:", JSON.stringify(req, null, 2));
    
    const resp = await axios.post(process.env.API_ENDPOINT + "delegate-capacity", req, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    console.log("Delegation response:", JSON.stringify(resp.data, null, 2));
    const capacityDelegationAuthSig = resp.data.delegationAuthSig || resp.data;
    return capacityDelegationAuthSig;
  };
  
  // Patch the getSessionSignatures method to handle complex capacity delegation objects
  const originalGetSessionSigs = myLit.getSessionSignatures;
  myLit.getSessionSignatures = async function(capacityDelegationAuthSig, signer, signerAddress) {
    // Make sure the capacityDelegationAuthSig is in the expected format
    if (capacityDelegationAuthSig && 
        (capacityDelegationAuthSig.capacityDelegationAuthSig || 
          (capacityDelegationAuthSig.delegationAuthSig && 
          capacityDelegationAuthSig.delegationAuthSig.capacityDelegationAuthSig))) {
      // Extract the inner auth sig if needed
      if (capacityDelegationAuthSig.delegationAuthSig && 
          capacityDelegationAuthSig.delegationAuthSig.capacityDelegationAuthSig) {
        capacityDelegationAuthSig = capacityDelegationAuthSig.delegationAuthSig.capacityDelegationAuthSig;
      } else if (capacityDelegationAuthSig.capacityDelegationAuthSig) {
        capacityDelegationAuthSig = capacityDelegationAuthSig.capacityDelegationAuthSig;
      }
    }
    
    console.log("Using cleaned capacityDelegationAuthSig for session signatures");
    return originalGetSessionSigs.call(this, capacityDelegationAuthSig, signer, signerAddress);
  };
  
  // Patch the decrypt method to provide better error messages
  const originalDecrypt = myLit.decrypt;
  myLit.decrypt = async function(ciphertext, dataToEncryptHash, capacityDelegationAuthSig, fileID, signer, signerAddress) {
    try {
      return await originalDecrypt.call(this, ciphertext, dataToEncryptHash, capacityDelegationAuthSig, fileID, signer, signerAddress);
    } catch (error) {
      console.error("Error in decrypt method:", error.message);
      throw error;
    }
  };
}

// Try multiple decryption approaches using the lit-protocol SDK directly
async function tryMultipleDecryptionApproaches(myLit, ciphertext, dataToEncryptHash, formattedDelegationAuthSig, wallet, walletAddress, fileId) {
  // Import the decryptToString function from the require module
  const { decryptToString } = await setupLitModule();
  
  // Approach 1: Try simplified wallet ownership condition
  try {
    console.log('Trying to decrypt with simplified wallet ownership condition...');
    
    const sessionSigs = await myLit.getSessionSignatures(
      formattedDelegationAuthSig,
      wallet,
      walletAddress
    );
    
    // Simple wallet ownership condition that doesn't rely on contract calls
    const accessControlConditions = [
      {
        contractAddress: '',
        standardContractType: '',
        chain: "sepolia",
        method: '',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '=',
          value: walletAddress.toLowerCase(),
        },
      },
    ];
    
    console.log('Using wallet ownership access control condition');
    
    const result = await decryptToString(
      {
        accessControlConditions,
        chain: "sepolia",
        ciphertext,
        dataToEncryptHash,
        sessionSigs,
      },
      myLit.litNodeClient
    );
    
    console.log('Decryption successful with wallet ownership verification!');
    return result;
  } catch (walletOwnershipError) {
    console.warn('Wallet ownership approach failed:', walletOwnershipError.message);
    
    // Approach 2: Try with the original evmContractConditions
    try {
      console.log('Trying with standard contract conditions...');
      
      const sessionSigs = await myLit.getSessionSignatures(
        formattedDelegationAuthSig,
        wallet,
        walletAddress
      );
      
      const evmContractConditions = [
        {
          contractAddress: process.env.CONTRACT_ADDRESS,
          functionName: "hasAccess",
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
            name: "hasAccess",
            outputs: [
              {
                name: "",
                type: "bool"
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
      
      const result = await decryptToString(
        {
          evmContractConditions,
          chain: "sepolia",
          ciphertext,
          dataToEncryptHash,
          sessionSigs,
        },
        myLit.litNodeClient
      );
      
      console.log('Decryption successful with contract conditions!');
      return result;
    } catch (contractError) {
      console.warn('Contract approach failed:', contractError.message);
      
      // Approach 3: Try with isOwner function instead of hasAccess
      try {
        console.log('Trying with isOwner function instead of hasAccess...');
        
        const sessionSigs = await myLit.getSessionSignatures(
          formattedDelegationAuthSig,
          wallet,
          walletAddress
        );
        
        const evmContractConditions = [
          {
            contractAddress: process.env.CONTRACT_ADDRESS,
            functionName: "isOwner",  // Try different function name
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
              name: "isOwner",
              outputs: [
                {
                  name: "",
                  type: "bool"
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
        
        const result = await decryptToString(
          {
            evmContractConditions,
            chain: "sepolia",
            ciphertext,
            dataToEncryptHash,
            sessionSigs,
          },
          myLit.litNodeClient
        );
        
        console.log('Decryption successful with isOwner function!');
        return result;
      } catch (isOwnerError) {
        console.warn('isOwner approach failed:', isOwnerError.message);
        return false;
      }
    }
  }
}

main().catch(console.error); 