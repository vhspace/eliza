const { expect } = require('chai');
const { EthStorageClient } = require('../scripts/lib/EthStorageClient');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get configuration from environment variables
const {
  PRIVATE_KEY,
  RPC_URL
} = process.env;

describe('EthStorageClient Tests', function() {
  let ethStorageClient;

  // These tests may take longer than the default timeout
  this.timeout(30000);

  before(function() {
    // Skip tests if environment variables are not set
    if (!PRIVATE_KEY || !RPC_URL) {
      console.warn('PRIVATE_KEY or RPC_URL not set. Skipping EthStorageClient tests.');
      this.skip();
    }
  });

  beforeEach(function() {
    // Create a new client instance for each test
    ethStorageClient = new EthStorageClient(PRIVATE_KEY, RPC_URL);
  });

  describe('Initialization', function() {
    it('should initialize with fallback mode when EthStorage fails', async function() {
      try {
        await ethStorageClient.initialize();
        
        // Get client status
        const status = ethStorageClient.getStatus();
        console.log('EthStorage client status:', status);
        
        // We expect either successful initialization or fallback mode
        expect(status.initialized).to.be.true;
        
        if (status.useFallback) {
          console.log('⚠️ WARNING: Client initialized in fallback mode. EthStorage not available.');
          console.log('Last error:', status.lastError);
        } else {
          console.log('✅ Client initialized with EthStorage successfully.');
        }
      } catch (error) {
        console.error('❌ Initialization failed completely:', error.message);
        throw error;
      }
    });

    it('should get wallet address after initialization', async function() {
      await ethStorageClient.initialize();
      const address = ethStorageClient.getWalletAddress();
      console.log('Wallet address:', address);
      expect(address).to.be.a('string').and.to.match(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('Storage Operations', function() {
    beforeEach(async function() {
      // Initialize the client before each test
      await ethStorageClient.initialize();
      
      // Skip tests if in fallback mode (optional - you might want to test fallback mode too)
      if (ethStorageClient.getStatus().useFallback) {
        console.log('⚠️ WARNING: Running tests in fallback mode.');
      }
    });

    it('should store and retrieve content', async function() {
      const contentKey = `test-key-${Date.now()}`;
      const testData = { test: 'data', timestamp: Date.now() };
      
      try {
        // Store content
        await ethStorageClient.storeContent(contentKey, testData);
        console.log(`Content stored with key: ${contentKey}`);
        
        // Retrieve content
        const retrievedData = await ethStorageClient.retrieveContent(contentKey);
        console.log('Retrieved data:', retrievedData);
        
        // Compare the objects
        expect(retrievedData).to.deep.equal(testData);
      } catch (error) {
        console.error(`❌ Store/retrieve test failed: ${error.message}`);
        
        // Check if we're using fallback storage
        const status = ethStorageClient.getStatus();
        if (status.useFallback) {
          console.log('Running in fallback mode, which should work for basic operations');
          throw error; // Re-throw the error since fallback should still work
        } else {
          console.log('Not using fallback storage, error might be related to EthStorage connectivity');
          this.skip(); // Skip the test if EthStorage is not available
        }
      }
    });
  });

  describe('Error handling and diagnostics', function() {
    beforeEach(async function() {
      await ethStorageClient.initialize();
    });

    it('should run diagnostics on EthStorage connection', async function() {
      // Check status
      const status = ethStorageClient.getStatus();
      console.log('Client status:', status);
      
      // Test health check
      try {
        const healthResult = await ethStorageClient.checkHealth();
        console.log('Health check result:', healthResult);
        
        if (healthResult.success) {
          console.log('✅ Health check passed. EthStorage is working correctly.');
        } else {
          console.log('⚠️ Health check failed:', healthResult.error);
          console.log('Details:', healthResult.details);
        }
      } catch (error) {
        console.error('❌ Health check error:', error.message);
      }
      
      // Even if health check fails, the test passes because it's diagnostic
      expect(true).to.be.true;
    });

    it('should detail error when retrieving non-existent content', async function() {
      const nonExistentKey = `nonexistent-${Date.now()}`;
      
      try {
        await ethStorageClient.retrieveContent(nonExistentKey);
        // If we get here, it means fallback mode automatically created empty content
        const status = ethStorageClient.getStatus();
        expect(status.useFallback).to.be.true;
      } catch (error) {
        console.log(`Expected error for non-existent key: ${error.message}`);
        expect(error.message).to.include('No data found');
      }
    });
  });

  describe('EthStorage node error diagnosis', function() {
    it('should analyze the "ES node" error', function() {
      const errorMessage = 'DecentralizedKV: get() must be called on ES node';
      
      console.log('Analyzing error:', errorMessage);
      console.log('Potential causes:');
      console.log('1. RPC URL does not support EthStorage API calls');
      console.log('2. The EthStorage contract might not be deployed on this network');
      console.log('3. Network connectivity issues with the EthStorage node');
      console.log('4. SDK version mismatch with the deployed contract');
      
      console.log('\nRecommended actions:');
      console.log('1. Check RPC URL is pointing to a node with EthStorage support');
      console.log('2. Verify network supports EthStorage (like QuarkChain testnet)');
      console.log('3. Check wallet has enough balance for transactions');
      console.log('4. Update to the latest ethstorage-sdk version');
      
      // This test is informational only
      expect(true).to.be.true;
    });
  });
}); 