const express = require('express');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const dotenv = require('dotenv');
const { PersonalDataRegistry } = require('./lib/registry');
const { Web3UrlClient } = require('./lib/web3url');
const { EthStorageClient } = require('./lib/EthStorageClient');
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

// Initialize EthStorageClient
const ethStorageClient = new EthStorageClient(PRIVATE_KEY, RPC_URL);
// Initialize immediately to verify it works
ethStorageClient.initialize().catch(err => {
  console.error('Failed to initialize EthStorage client:', err);
  console.warn('Some features may not work correctly');
});

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
    registryConfigured: !!registryContractAddress,
    ethStorageConfigured: ethStorageClient.isInitialized
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
    
    // Actually store the data using EthStorage
    try {
      await ethStorageClient.storeContent(contentKey, data);
      console.log(`Data stored successfully with key ${contentKey}`);
    } catch (storageError) {
      console.error('Failed to store data in EthStorage:', storageError);
      return res.status(500).json({ 
        error: 'Failed to store data in EthStorage',
        details: storageError.message
      });
    }
    
    // Register in smart contract if available
    if (registry) {
      await registry.connect(wallet).uploadData(category, contentKey);
    }
    
    res.json({
      success: true,
      contentKey,
      fullUrl: web3UrlClient.getContentUrl(contentKey),
      category,
      storedOnChain: true
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
    
    if (!hasAccess && ownerAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to access this data' });
    }
    
    // Get the content key
    const contentKey = await registry.getContentKey(ownerAddress, category);
    
    if (!contentKey) {
      return res.status(404).json({ 
        success: false, 
        error: `No content key found for category: ${category}` 
      });
    }
    
    // Create a Web3UrlClient for the owner's address
    const ownerWeb3UrlClient = new Web3UrlClient(ownerAddress, CHAIN_ID);
    
    // Generate the URL
    const contentUrl = ownerWeb3UrlClient.getContentUrl(contentKey);
    
    // Get debug URLs
    const debugUrls = ownerWeb3UrlClient.getDebugUrl(contentKey);
    
    // Now try to get the actual data content, first try EthStorage
    try {
      // NOTE: We're using our own private key here, which works because EthStorage
      // allows anyone to read data if they know the key. The registry contract
      // handles access control by only sharing the key with authorized users.
      const data = await ethStorageClient.retrieveContent(contentKey);
      
      return res.json({
        success: true,
        category,
        ownerAddress,
        data,
        contentKey,
        contentUrl,
        debugUrls, // Add debug URLs for troubleshooting
        retrievedFrom: 'ethstorage',
        storedOnChain: true
      });
    } catch (error) {
      console.error(`Error retrieving content from EthStorage: ${error.message}`);
      
      // Try to fetch from web3 URL as a fallback
      try {
        console.log(`Trying to fetch directly from web3 URL: ${contentUrl}`);
        const data = await ownerWeb3UrlClient.fetchContent(contentKey);
        
        return res.json({
          success: true,
          category,
          ownerAddress,
          data,
          contentKey,
          contentUrl,
          debugUrls,
          retrievedFrom: 'web3url',
          storedOnChain: true,
          note: 'Retrieved from web3 URL after EthStorage failure'
        });
      } catch (urlError) {
        console.error(`Error fetching from web3 URL: ${urlError.message}`);
        
        // Generate mock data for this category as a last resort
        const mockData = generateMockData(category);
        if (mockData) {
          console.log(`Returning mock data for category: ${category}`);
          return res.json({
            success: true,
            category,
            ownerAddress,
            data: mockData,
            contentKey,
            contentUrl,
            debugUrls,
            retrievedFrom: 'mock',
            storedOnChain: false,
            note: 'Generated mock data as fallback'
          });
        }
        
        return res.status(404).json({ 
          success: false, 
          error: `Could not retrieve content: ${error.message}`,
          urlError: urlError.message,
          contentKey,
          contentUrl,
          debugUrls,
          troubleshooting: [
            "The data might still be processing on the blockchain",
            "Try accessing one of the alternative URLs directly",
            "Check that the content was successfully stored on EthStorage"
          ]
        });
      }
    }
  } catch (error) {
    console.error(`Error in shared data endpoint: ${error.message}`);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add a dedicated endpoint for getting my own data for a specific category
app.get('/api/mydata/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!registry) {
      return res.status(500).json({ error: 'Registry not configured' });
    }
    
    // Get the content key for the current user's wallet
    const contentKey = await registry.getContentKey(wallet.address, category);
    
    if (!contentKey) {
      // Generate mock data as fallback
      const mockData = generateMockData(category);
      if (mockData) {
        console.log(`No data found, returning mock data for category: ${category}`);
        return res.json({
          success: true,
          category,
          ownerAddress: wallet.address,
          data: mockData,
          contentKey: `mock-${category.toLowerCase()}-${Date.now().toString(36)}`,
          contentUrl: null,
          retrievedFrom: 'mock',
          storedOnChain: false,
          note: 'Generated mock data as no real data exists'
        });
      }
      
      return res.status(404).json({ 
        success: false, 
        error: `No data found for category: ${category}` 
      });
    }
    
    // Create our web3 URL client
    const contentUrl = web3UrlClient.getContentUrl(contentKey);
    const debugUrls = web3UrlClient.getDebugUrl(contentKey);
    
    try {
      // Try to retrieve from EthStorage first
      const data = await ethStorageClient.retrieveContent(contentKey);
      
      return res.json({
        success: true,
        category,
        ownerAddress: wallet.address,
        data,
        contentKey,
        contentUrl,
        debugUrls,
        retrievedFrom: 'ethstorage',
        storedOnChain: true
      });
    } catch (error) {
      console.error(`Error retrieving own content from EthStorage: ${error.message}`);
      
      // Try web3 URL as fallback
      try {
        console.log(`Trying to fetch own data from web3 URL: ${contentUrl}`);
        const data = await web3UrlClient.fetchContent(contentKey);
        
        return res.json({
          success: true,
          category,
          ownerAddress: wallet.address,
          data,
          contentKey,
          contentUrl,
          debugUrls,
          retrievedFrom: 'web3url',
          storedOnChain: true
        });
      } catch (urlError) {
        console.error(`Error fetching own data from web3 URL: ${urlError.message}`);
        
        // Generate mock data for this category as a last resort
        const mockData = generateMockData(category);
        if (mockData) {
          console.log(`Returning mock data for category: ${category}`);
          return res.json({
            success: true,
            category,
            ownerAddress: wallet.address,
            data: mockData,
            contentKey,
            contentUrl,
            debugUrls,
            retrievedFrom: 'mock',
            storedOnChain: false,
            note: 'Generated mock data as fallback'
          });
        }
        
        return res.status(404).json({
          success: false,
          error: `Could not retrieve content: ${error.message}`,
          urlError: urlError.message,
          contentKey,
          contentUrl,
          debugUrls
        });
      }
    }
  } catch (error) {
    console.error(`Error in my data endpoint: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Fetch data category endpoint
app.get('/api/data/my/:category', async (req, res) => {
  const { category } = req.params;
  
  try {
    const owner = wallet.address;
    const contentKey = await registry.getContentKey(owner, category);
    
    if (!contentKey) {
      return res.json({
        success: false,
        error: 'No data found for this category',
        simulated: false
      });
    }
    
    // Try to get from EthStorage first
    let data = null;
    let retrievedFrom = null;
    let note = null;
    
    try {
      data = await ethStorageClient.retrieveContent(contentKey);
      retrievedFrom = 'ethstorage';
      note = 'Retrieved directly from on-chain storage';
    } catch (ethStorageError) {
      console.log(`EthStorage retrieval failed for ${contentKey}: ${ethStorageError.message}`);
      
      // Try Web3 URL as fallback
      try {
        const contentUrl = await registry.getContentUrl(owner, category);
        if (contentUrl) {
          data = await web3UrlClient.fetchContent(contentUrl);
          retrievedFrom = 'web3url';
          note = 'Retrieved via Web3 URL';
        }
      } catch (web3UrlError) {
        console.log(`Web3 URL retrieval failed: ${web3UrlError.message}`);
        
        // Generate mock data as last resort
        data = generateMockData(category);
        retrievedFrom = 'mock';
        note = 'Using mock data (EthStorage and Web3 URL retrieval failed)';
      }
    }
    
    // Create debug URLs for troubleshooting
    const debugUrls = {
      alternativeUrl: `https://${web3UrlClient.formatContentKey(contentKey)}.${web3UrlClient.getBaseUrl().replace('https://', '')}/`,
      apiUrl: `${web3UrlClient.getBaseUrl()}api/v0/${web3UrlClient.formatContentKey(contentKey)}`
    };
    
    // Return the response with source information
    return res.json({
      success: true,
      data,
      contentKey,
      retrievedFrom,
      note,
      debugUrls
    });
  } catch (error) {
    console.error('Error in /api/data/my/:category:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      simulated: false
    });
  }
});

// Fetch shared data endpoint
app.get('/api/data/shared/:owner/:category', async (req, res) => {
  const { owner, category } = req.params;
  const viewer = wallet.address;
  
  try {
    // Check if the viewer has access
    const hasAccess = await registry.isApproved(owner, viewer, category);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this data',
        simulated: false
      });
    }
    
    const contentKey = await registry.getContentKey(owner, category);
    
    if (!contentKey) {
      // Generate troubleshooting tips
      const troubleshooting = [
        'The data may not exist for this category',
        'The owner address might be incorrect',
        'There might be a network issue with the blockchain'
      ];
      
      return res.status(404).json({
        success: false,
        error: 'No data found for this category',
        simulated: false,
        troubleshooting
      });
    }
    
    const contentUrl = await registry.getContentUrl(owner, category);
    
    // Try to get from EthStorage first
    let data = null;
    let retrievedFrom = null;
    let note = null;
    
    try {
      data = await ethStorageClient.retrieveContent(contentKey);
      retrievedFrom = 'ethstorage';
      note = 'Retrieved directly from on-chain storage';
    } catch (ethStorageError) {
      console.log(`EthStorage retrieval failed for ${contentKey}: ${ethStorageError.message}`);
      
      // Try Web3 URL as fallback
      try {
        if (contentUrl) {
          data = await web3UrlClient.fetchContent(contentUrl);
          retrievedFrom = 'web3url';
          note = 'Retrieved via Web3 URL';
        } else {
          throw new Error('No content URL available');
        }
      } catch (web3UrlError) {
        console.log(`Web3 URL retrieval failed: ${web3UrlError.message}`);
        
        // Generate mock data as last resort
        data = generateMockData(category);
        retrievedFrom = 'mock';
        note = 'Using mock data (EthStorage and Web3 URL retrieval failed)';
      }
    }
    
    // Create debug URLs for troubleshooting
    const debugUrls = {
      alternativeUrl: `https://${web3UrlClient.formatContentKey(contentKey)}.${web3UrlClient.getBaseUrl().replace('https://', '')}/`,
      apiUrl: `${web3UrlClient.getBaseUrl()}api/v0/${web3UrlClient.formatContentKey(contentKey)}`
    };
    
    // Return the response with source information
    return res.json({
      success: true,
      data,
      contentKey,
      contentUrl,
      retrievedFrom,
      note,
      debugUrls
    });
  } catch (error) {
    console.error('Error in /api/data/shared/:owner/:category:', error);
    
    // Generate troubleshooting tips based on the error
    const troubleshooting = [
      'Check that the owner address is correct',
      'Ensure you have been granted permission to access this data',
      'The data may not exist for this category'
    ];
    
    if (error.message.includes('network') || error.message.includes('connection')) {
      troubleshooting.push('There might be network connectivity issues');
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      simulated: false,
      troubleshooting
    });
  }
});

// Fetch categories endpoint
app.get('/api/categories', async (req, res) => {
  try {
    const owner = wallet.address;
    const categories = await registry.getUserCategories(owner);
    
    // Map numerical IDs to human-readable names
    const categoryNames = {
      '0': 'Personal Information',
      '1': 'Contact Information',
      '2': 'Interests & Hobbies',
      '3': 'Travel History',
      '4': 'Education',
      '5': 'Work Experience',
      'PERSONAL_INFO': 'Personal Information',
      'CONTACT_INFO': 'Contact Information',
      'INTERESTS': 'Interests & Hobbies',
      'TRAVEL_HISTORY': 'Travel History',
      'EDUCATION': 'Education',
      'WORK_HISTORY': 'Work Experience'
    };
    
    const formattedCategories = categories.map(cat => ({
      id: cat,
      name: categoryNames[cat] || cat
    }));
    
    res.json({
      success: true,
      categories: formattedCategories
    });
  } catch (error) {
    console.error('Error in /api/categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to generate mock data based on category
function generateMockData(category) {
  const mockData = {
    'PERSONAL_INFO': {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      nationality: 'United States',
      bio: 'A sample bio for demonstration purposes'
    },
    'CONTACT_INFO': {
      email: 'sample@example.com',
      phone: '+1 555-123-4567',
      address: '123 Main St, Anytown, USA'
    },
    'INTERESTS': {
      hobbies: ['Reading', 'Hiking', 'Blockchain Technology'],
      favorites: {
        music: 'Electronic',
        movies: 'Sci-Fi',
        books: 'Non-fiction'
      }
    },
    'TRAVEL_HISTORY': {
      countries: ['United States', 'Canada', 'Japan', 'Germany'],
      recentTrips: [
        { destination: 'Tokyo', date: '2023-03-15' },
        { destination: 'Berlin', date: '2022-09-10' }
      ]
    },
    'EDUCATION': {
      highestDegree: 'Master of Science',
      university: 'Sample University',
      graduationYear: 2015,
      major: 'Computer Science'
    },
    'WORK_HISTORY': {
      currentPosition: 'Software Engineer',
      company: 'Tech Innovations Inc.',
      yearsOfExperience: 7,
      skills: ['JavaScript', 'TypeScript', 'Blockchain', 'Web3']
    },
    '0': {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      nationality: 'United States',
      bio: 'A sample bio for demonstration purposes'
    },
    '1': {
      email: 'sample@example.com',
      phone: '+1 555-123-4567',
      address: '123 Main St, Anytown, USA'
    },
    '2': {
      hobbies: ['Reading', 'Hiking', 'Blockchain Technology'],
      favorites: {
        music: 'Electronic',
        movies: 'Sci-Fi',
        books: 'Non-fiction'
      }
    },
    '3': {
      countries: ['United States', 'Canada', 'Japan', 'Germany'],
      recentTrips: [
        { destination: 'Tokyo', date: '2023-03-15' },
        { destination: 'Berlin', date: '2022-09-10' }
      ]
    },
    '4': {
      highestDegree: 'Master of Science',
      university: 'Sample University',
      graduationYear: 2015,
      major: 'Computer Science'
    },
    '5': {
      currentPosition: 'Software Engineer',
      company: 'Tech Innovations Inc.',
      yearsOfExperience: 7,
      skills: ['JavaScript', 'TypeScript', 'Blockchain', 'Web3']
    }
  };
  
  // Return the mock data for the specified category or a default message
  return mockData[category] || { 
    message: 'Mock data for demonstration',
    category
  };
}

// Content verification endpoint
app.get('/api/verify/:contentKey', async (req, res) => {
  const { contentKey } = req.params;
  
  // Initialize result object
  const result = {
    contentKey,
    tests: {}
  };
  
  // Test direct EthStorage retrieval
  try {
    const data = await ethStorageClient.retrieveContent(contentKey);
    result.tests.ethStorage = {
      success: true,
      data
    };
  } catch (error) {
    result.tests.ethStorage = {
      success: false,
      error: error.message
    };
  }
  
  // Test Web3 URL retrieval using standard URL format
  try {
    const formattedKey = web3UrlClient.formatContentKey(contentKey);
    const standardUrl = `${web3UrlClient.getBaseUrl()}${formattedKey}`;
    
    try {
      const data = await web3UrlClient.fetchContent(standardUrl);
      result.tests.standardUrl = {
        success: true,
        url: standardUrl,
        data
      };
    } catch (error) {
      result.tests.standardUrl = {
        success: false,
        url: standardUrl,
        error: error.message
      };
    }
    
    // Test alternate URL format (contentKey.domain)
    const alternateDomain = web3UrlClient.getBaseUrl().replace('https://', '');
    const alternateUrl = `https://${formattedKey}.${alternateDomain}/`;
    
    try {
      const data = await web3UrlClient.fetchContent(alternateUrl);
      result.tests.alternateUrl = {
        success: true,
        url: alternateUrl,
        data
      };
    } catch (error) {
      result.tests.alternateUrl = {
        success: false,
        url: alternateUrl,
        error: error.message
      };
    }
  } catch (error) {
    result.error = `Failed to test URLs: ${error.message}`;
  }
  
  // Add recommendations based on results
  const successfulMethods = Object.keys(result.tests)
    .filter(key => result.tests[key].success);
  
  if (successfulMethods.length > 0) {
    result.recommendation = {
      preferredMethod: successfulMethods[0],
      allWorkingMethods: successfulMethods
    };
  } else {
    result.recommendation = {
      message: "No successful retrieval methods found",
      suggestion: "Use mock data as a fallback"
    };
  }
  
  res.json(result);
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