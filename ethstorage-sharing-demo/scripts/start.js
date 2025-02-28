const express = require('express');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const dotenv = require('dotenv');
const { PersonalDataRegistry } = require('./lib/registry');
const { Web3UrlClient } = require('./lib/web3url');
const axios = require('axios');

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3000;
const {
  PRIVATE_KEY,
  RPC_URL,
  DATA_REGISTRY_CONTRACT,
  CHAIN_ID = '3337' // Default to 3337 for QuarkChain
} = process.env;

if (!PRIVATE_KEY) {
  console.error('PRIVATE_KEY is required. Please set it in your .env file.');
  process.exit(1);
}

// Check if contract is deployed
let registryContractAddress = DATA_REGISTRY_CONTRACT;
if (!registryContractAddress) {
  try {
    // Try to load from deployments
    const deploymentFile = path.join(__dirname, '../deployments/quarkchainTestnet.json');
    if (fs.existsSync(deploymentFile)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
      registryContractAddress = deployment.address;
    }
  } catch (error) {
    console.log('No deployment found. Please deploy the contract first.');
  }
}

if (!registryContractAddress) {
  console.warn('DATA_REGISTRY_CONTRACT not set. Some features will not work.');
}

// Create provider and wallet
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Initialize registry
let registry = null;
if (registryContractAddress) {
  registry = new PersonalDataRegistry(provider, registryContractAddress);
}

// Initialize Web3UrlClient
const web3UrlClient = new Web3UrlClient(wallet.address, CHAIN_ID);

// Setup Express
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    web3UrlConfigured: !!wallet.address,
    registryConfigured: !!registryContractAddress
  });
});

// Get wallet info
app.get('/api/wallet', async (req, res) => {
  try {
    const address = wallet.address;
    const balance = ethers.formatEther(await provider.getBalance(address));
    const baseUrl = web3UrlClient.getBaseUrl();
    
    res.json({
      address,
      balance,
      network: await provider.getNetwork(),
      web3Domain: baseUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Store data in a category
app.post('/api/data', async (req, res) => {
  try {
    const { category, data } = req.body;
    
    if (!category || !data) {
      return res.status(400).json({ error: 'Category and data are required' });
    }
    
    // Generate a content key
    const contentKey = web3UrlClient.generateContentKey(category.toLowerCase());
    
    // In a real implementation, you would need to upload the content to the web3 URL
    // This is a placeholder - in production, you would use a service that can upload to w3link.io
    
    // For demo purposes, we'll simulate storage
    console.log(`Simulating storage at: ${web3UrlClient.getContentUrl(contentKey)}`);
    console.log(`Content: ${JSON.stringify(data)}`);
    
    // Register in smart contract if available
    if (registry) {
      await registry.connect(wallet).uploadData(category, contentKey);
    }
    
    res.json({
      success: true,
      contentKey,
      fullUrl: web3UrlClient.getContentUrl(contentKey),
      category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Grant access to another user
app.post('/api/share', async (req, res) => {
  try {
    const { viewerAddress, category } = req.body;
    
    if (!viewerAddress || !category) {
      return res.status(400).json({ error: 'Viewer address and category are required' });
    }
    
    if (!registry) {
      return res.status(500).json({ error: 'Registry not configured' });
    }
    
    await registry.connect(wallet).grantAccess(viewerAddress, category);
    
    res.json({
      success: true,
      viewerAddress,
      category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my data categories
app.get('/api/categories', async (req, res) => {
  try {
    if (!registry) {
      return res.status(500).json({ error: 'Registry not configured' });
    }
    
    const categories = await registry.getUserCategories(wallet.address);
    
    res.json({
      categories
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get shared data
app.get('/api/shared/:ownerAddress/:category', async (req, res) => {
  try {
    const { ownerAddress, category } = req.params;
    
    if (!registry) {
      return res.status(500).json({ error: 'Registry not configured' });
    }
    
    // Check if we have access
    const hasAccess = await registry.isApproved(ownerAddress, wallet.address, category);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to access this data' });
    }
    
    // Get the content key
    const contentKey = await registry.getContentKey(ownerAddress, category);
    
    // Create a Web3UrlClient for the owner's address
    const ownerWeb3UrlClient = new Web3UrlClient(ownerAddress, CHAIN_ID);
    
    // Generate the URL
    const contentUrl = ownerWeb3UrlClient.getContentUrl(contentKey);
    
    // In a real implementation, you would fetch the content from the web3 URL
    // This is a placeholder - in production, you would fetch from w3link.io
    try {
      // Attempt to fetch, but this may fail in the demo if content wasn't actually uploaded
      const response = await axios.get(contentUrl);
      
      res.json({
        success: true,
        category,
        ownerAddress,
        data: response.data,
        contentKey,
        contentUrl
      });
    } catch (error) {
      // For demo, simulate content
      res.json({
        success: true,
        category,
        ownerAddress,
        data: { note: "Simulated data - content URL was not actually accessible", contentKey, contentUrl },
        contentKey,
        contentUrl,
        simulated: true
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Demo server running at http://localhost:${PORT}`);
  console.log('Wallet address:', wallet.address);
  console.log('Web3 URL domain:', web3UrlClient.getBaseUrl());
  
  if (registryContractAddress) {
    console.log('Registry contract:', registryContractAddress);
  } else {
    console.log('Registry contract not configured');
  }
  
  console.log('RPC URL:', RPC_URL);
}); 