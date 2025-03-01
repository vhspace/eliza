#!/usr/bin/env node
require('dotenv').config();
const axios = require('axios');
const { ethers } = require('ethers');

// API endpoint for capacity delegation
const API_URL = process.env.API_ENDPOINT || 'http://localhost:3000/';

async function testDelegateCapacity() {
  try {
    // Load environment variables
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      console.error('Error: WALLET_PRIVATE_KEY is required in .env file');
      process.exit(1);
    }
    
    // Initialize ethers wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://testnet-l2-ethapi.quarkchain.io');
    const wallet = new ethers.Wallet(privateKey, provider);
    const walletAddress = await wallet.getAddress();
    
    console.log(`Using wallet address: ${walletAddress}`);
    
    // Test delegate capacity call
    console.log(`Requesting capacity delegation for address: ${walletAddress}`);
    console.log(`Using API URL: ${API_URL}`);
    
    const req = {
      userAddress: walletAddress,
    };

    // Call the delegate-capacity endpoint
    const endpoint = `${API_URL}delegate-capacity`;
    console.log(`Calling capacity delegation endpoint: ${endpoint}`);
    
    const resp = await axios.post(endpoint, req, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    console.log("Capacity delegation response status:", resp.status);
    console.log("Capacity delegation response:", JSON.stringify(resp.data, null, 2));
    
    if (resp.data.delegationAuthSig) {
      console.log("✅ Successfully received delegationAuthSig");
    } else {
      console.log("❌ Failed to receive delegationAuthSig");
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDelegateCapacity().catch(console.error); 