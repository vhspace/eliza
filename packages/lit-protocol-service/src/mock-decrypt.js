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
    
    // Add module.exports
    const exportsStatement = '\nmodule.exports = { Lit, encryptData, decryptData };\n';
    fs.writeFileSync(tempPath, modifiedContent + exportsStatement);
    
    // Use createRequire to import CommonJS module
    const require = createRequire(import.meta.url);
    return require(tempPath);
  } catch (error) {
    console.error('Error setting up Lit module:', error);
    throw error;
  }
}

// Mock the fetch response based on the mock URL
async function mockFetchEncryptedData(url) {
  // This is our mock data - in a real implementation this would be
  // returned from the actual endpoint with encrypted content
  console.log(`Fetching (mock) encrypted data from: ${url}`);
  
  if (url.includes('0x6969eea2f225e64c0857d07a9a9752f57fb61d56-1740798766062')) {
    // Create mock encrypted data based on the actual contents of the URL
    // In a real scenario, this would be properly encrypted with Lit Protocol 
    const mockPlainText = JSON.stringify({
      name: "Bala",
      age: "25"
    });
    
    // Mock ciphertext object that would normally come from Lit encryption
    return {
      ciphertext: {
        mock_encrypted_content: Buffer.from(mockPlainText).toString('base64')
      },
      dataToEncryptHash: "0x" + Buffer.from(mockPlainText).toString('hex').substring(0, 64)
    };
  }
  
  throw new Error('Mock URL not recognized');
}

// Modify the decrypt function to handle our mock data
async function mockDecrypt(myLit, ciphertext, dataToEncryptHash, delegationAuthSig, fileId, wallet, walletAddress) {
  try {
    console.log("Getting session signatures...");
    const sessionSigs = await myLit.getSessionSignatures(
      delegationAuthSig,
      wallet,
      walletAddress
    );
    
    console.log("Session signatures obtained. Attempting to decrypt...");
    
    // For mock testing, we'll bypass the actual decryption
    // In a real implementation, we would call myLit.decrypt here
    
    // Extract original content from our mock ciphertext
    // This simulates a successful decryption
    const mockDecryptedBase64 = ciphertext.mock_encrypted_content;
    const decryptedString = Buffer.from(mockDecryptedBase64, 'base64').toString();
    
    console.log("Mock decryption successful");
    return { decryptedString };
  } catch (error) {
    console.error("Mock decryption failed:", error);
    throw error;
  }
}

async function initializeAgent(decryptedData, characterId) {
  try {
    console.log(`Initializing agent with characterId: ${characterId}`);
    console.log(`Agent data: ${JSON.stringify(decryptedData)}`);
    
    // This would be a real API call in production
    console.log("\nAPI Call Simulation:");
    console.log(`POST http://your-api-endpoint/agents/initialize`);
    console.log(`Headers: { 'Authorization': 'Bearer YOUR_API_KEY', 'Content-Type': 'application/json' }`);
    
    const payload = {
      agentConfig: {
        characterId: characterId,
        name: decryptedData.name || "Default Name",
        visibility: "PRIVATE"
      },
      sourceData: decryptedData,
      settings: {
        attributes: {
          age: decryptedData.age
        },
        responseModel: "default",
        maxResponseTokens: 2048
      }
    };
    
    console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
    
    // Simulate successful response
    console.log("\nSimulated API Response:");
    console.log(JSON.stringify({
      success: true,
      agentId: "ag_" + Math.random().toString(36).substring(2, 15),
      session: {
        id: "sess_" + Math.random().toString(36).substring(2, 15),
        expires: new Date(Date.now() + 24*60*60*1000).toISOString()
      }
    }, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error initializing agent:', error);
    throw error;
  }
}

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const mockUrl = args[0] || 'https://0xe8515a3786d8ef25398aa54c3580a34a0da48397.3337.w3link.io/0x6969eea2f225e64c0857d07a9a9752f57fb61d56-1740798766062';
    const characterId = parseInt(args[1]) || 3; // Default to character #3
    
    // Set environment variables
    const privateKey = process.env.WALLET_PRIVATE_KEY || 'cae12297a07b1d5a55515ec06cb378878cb99bdd0e43c505ffe8b9748103134d';
    process.env.CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986';
    process.env.API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:3000/';
    
    // Extract info from URL
    const urlParts = new URL(mockUrl);
    const hostParts = urlParts.hostname.split('.');
    const contractAddress = hostParts[0];
    const fileId = urlParts.pathname.substring(1); // Remove leading slash
    
    console.log(`Contract Address from URL: ${contractAddress}`);
    console.log(`File ID: ${fileId}`);
    console.log(`Using contract address from env: ${process.env.CONTRACT_ADDRESS}`);
    console.log(`Selected character ID: ${characterId}`);
    
    // Initialize ethers wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://sepolia-rpc.scroll.io');
    const wallet = new ethers.Wallet(privateKey, provider);
    const walletAddress = await wallet.getAddress();
    
    console.log(`Using wallet address: ${walletAddress}`);
    
    // Mock fetch the encrypted file
    const fileData = await mockFetchEncryptedData(mockUrl);
    
    if (!fileData || !fileData.ciphertext || !fileData.dataToEncryptHash) {
      console.error('Invalid file format or file not found');
      console.log(fileData);
      process.exit(1);
    }
    
    const ciphertext = fileData.ciphertext;
    const dataToEncryptHash = fileData.dataToEncryptHash;
    
    console.log('File fetched successfully');
    
    // Import and use the Lit module
    const litModule = await setupLitModule();
    const { Lit } = litModule;
    
    // Initialize Lit client with ethereum chain
    const chain = "ethereum";
    const myLit = new Lit(chain);
    await myLit.connect();
    
    // Request capacity delegation
    console.log("Requesting capacity delegation...");
    const delegationAuthSig = await myLit.delegateCapacity(walletAddress);
    
    // Decrypt the file using our mock function
    console.log(`Decrypting file with ID: ${fileId}`);
    const { decryptedString } = await mockDecrypt(
      myLit,
      ciphertext,
      dataToEncryptHash,
      delegationAuthSig,
      fileId,
      wallet,
      walletAddress
    );
    
    // Parse the decrypted content
    let decryptedData;
    try {
      decryptedData = JSON.parse(decryptedString);
      console.log('Decrypted data:', decryptedData);
    } catch (e) {
      console.error('Error parsing decrypted data:', e);
      decryptedData = { content: decryptedString };
    }
    
    // Initialize the agent with the decrypted data
    await initializeAgent(decryptedData, characterId);
    
    // Cleanup
    await myLit.disconnect();
    
    console.log("\nMock testing complete. This demonstrates the full flow from:");
    console.log("1. Fetching encrypted data from w3link.io");
    console.log("2. Connecting to Lit Protocol");
    console.log("3. Obtaining delegation authorization");
    console.log("4. Decrypting the data using session signatures");
    console.log("5. Initializing an agent with the decrypted data");
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error); 