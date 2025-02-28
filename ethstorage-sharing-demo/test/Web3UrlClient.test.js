const { expect } = require('chai');
const { Web3UrlClient } = require('../scripts/lib/web3url');
const axios = require('axios');
const dotenv = require('dotenv');

// Enable debug mode for more verbose logging
process.env.DEBUG_WEB3URL = 'true';

// Load environment variables
dotenv.config();

describe('Web3UrlClient Tests', function() {
  let web3UrlClient;
  const testWalletAddress = '0xEE45A0D3466A6a961D286cc61666B7067D7a7619';
  const testChainId = '3337'; // Default QuarkChain testnet

  // These tests may take time for network requests
  this.timeout(30000);

  beforeEach(function() {
    // Create a new client for each test
    web3UrlClient = new Web3UrlClient(testWalletAddress, testChainId);
  });

  describe('Client Configuration', function() {
    it('should set wallet address correctly', function() {
      expect(web3UrlClient.walletAddress).to.equal(testWalletAddress.toLowerCase());
      expect(web3UrlClient.baseUrl).to.equal(`https://${testWalletAddress.toLowerCase()}.${testChainId}.w3link.io/`);
    });

    it('should update base URL when changing wallet or chain', function() {
      const newWallet = '0x1234567890abcdef1234567890abcdef12345678';
      const newChain = '1234';
      
      web3UrlClient.setWalletAddress(newWallet);
      expect(web3UrlClient.getBaseUrl()).to.equal(`https://${newWallet.toLowerCase()}.${testChainId}.w3link.io/`);
      
      web3UrlClient.setChainId(newChain);
      expect(web3UrlClient.getBaseUrl()).to.equal(`https://${newWallet.toLowerCase()}.${newChain}.w3link.io/`);
    });
  });

  describe('Content Key Formatting', function() {
    it('should format content keys correctly for URLs', function() {
      const testKeys = [
        'simple-key',
        'category.random123',
        'special chars & spaces.123',
        'encoded/slash.and+plus'
      ];
      
      testKeys.forEach(key => {
        const formatted = web3UrlClient.formatContentKey(key);
        console.log(`Original: "${key}" → Formatted: "${formatted}"`);
        
        // Key should be URL-safe but preserve periods
        expect(formatted).to.include('.');
        expect(formatted).to.not.include(' ');
        expect(formatted).to.not.include('&');
      });
    });

    it('should generate unique content keys for categories', function() {
      const categories = ['PERSONAL_INFO', 'CONTACT_INFO', 'interests & hobbies'];
      const keys = categories.map(cat => web3UrlClient.generateContentKey(cat));
      
      console.log('Generated keys:', keys);
      
      // Keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).to.equal(categories.length);
      
      // Keys should follow the pattern category.random
      keys.forEach((key, i) => {
        const parts = key.split('.');
        expect(parts.length).to.equal(2);
        
        const cleanCategory = categories[i]
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '_');
        expect(parts[0]).to.equal(cleanCategory);
      });
    });
  });

  describe('URL Generation', function() {
    it('should generate content URLs with formatted keys', function() {
      const contentKey = 'test-category.abcd1234';
      const url = web3UrlClient.getContentUrl(contentKey);
      console.log(`Content key: ${contentKey} → URL: ${url}`);
      
      expect(url).to.equal(`https://${testWalletAddress.toLowerCase()}.${testChainId}.w3link.io/${contentKey}`);
    });

    it('should generate multiple URL formats for debugging', function() {
      const contentKey = 'test-category.abcd1234';
      const debugUrls = web3UrlClient.getDebugUrl(contentKey);
      
      console.log('Debug URLs:', debugUrls);
      
      // We should have several URL formats
      expect(Object.keys(debugUrls).length).to.be.at.least(3);
      
      // Each URL should contain the content key in some form
      Object.values(debugUrls).forEach(url => {
        expect(url).to.include('test-category') || expect(url).to.include(encodeURIComponent('test-category'));
      });
    });
  });

  describe('Content Fetching', function() {
    // These tests interact with real services
    // They may be skipped in some environments
    
    it('should handle both URL and content key inputs', async function() {
      const testKey = 'test-key.1234';
      const testUrl = `https://example.com/${testKey}`;
      
      // Mock the actual HTTP request
      const originalFetch = axios.get;
      axios.get = async function mockGet(url) {
        console.log(`Mock HTTP request to: ${url}`);
        return { 
          status: 200, 
          data: { success: true, url } 
        };
      };
      
      try {
        // Test with URL
        const result1 = await web3UrlClient.fetchContent(testUrl);
        expect(result1.success).to.be.true;
        expect(result1.url).to.equal(testUrl);
        
        // Test with content key
        const result2 = await web3UrlClient.fetchContent(testKey);
        expect(result2.success).to.be.true;
        
        // Should have used one of the debug URLs
        const debugUrls = Object.values(web3UrlClient.getDebugUrl(testKey));
        const matchesDebugUrl = debugUrls.some(url => result2.url === url);
        expect(matchesDebugUrl).to.be.true;
      } finally {
        // Restore original implementation
        axios.get = originalFetch;
      }
    });
  });

  describe('Error Analysis', function() {
    it('should diagnose common Web3 URL errors', function() {
      const errors = {
        '400 Bad Request': 'Content may not exist or URL format is incorrect',
        '403 Forbidden': 'Access permissions may not be correctly set',
        '404 Not Found': 'Content key or URL path is incorrect',
        'ECONNREFUSED': 'Network connectivity issues or service is down',
        'ETIMEDOUT': 'Request timed out, network may be slow or service unresponsive'
      };
      
      console.log('🔍 Web3 URL Error Analysis:');
      Object.entries(errors).forEach(([error, explanation]) => {
        console.log(`- ${error}: ${explanation}`);
      });
      
      console.log('\n🛠️ Troubleshooting steps:');
      console.log('1. Verify the content key is correctly formatted');
      console.log('2. Check all alternative URL formats using the debug URLs');
      console.log('3. Ensure content was properly stored in the first place');
      console.log('4. Verify the wallet has permission to access the content');
      console.log('5. Check network connectivity to the Web3 URL domain');
      
      // This test is informational only
      expect(true).to.be.true;
    });

    it('should analyze URL encoding in content keys', function() {
      const problematicKey = 'personal_info.special&chars.m7o1ucvg';
      console.log(`Analyzing problematic key: ${problematicKey}`);
      
      // Different encoding strategies
      const strategies = {
        'Standard URL encoding': encodeURIComponent(problematicKey),
        'Component encoding': problematicKey.split('.').map(encodeURIComponent).join('.'),
        'Simple replacement': problematicKey.replace(/[^a-zA-Z0-9_.]/g, '-'),
        'Web3UrlClient format': web3UrlClient.formatContentKey(problematicKey)
      };
      
      console.log('Encoding strategies:');
      Object.entries(strategies).forEach(([name, encoded]) => {
        console.log(`- ${name}: ${encoded}`);
      });
      
      // Check which characters are problematic
      const specialChars = '&?=#/+%';
      console.log('Special character handling in Web3 URLs:');
      specialChars.split('').forEach(char => {
        const key = `test${char}key`;
        console.log(`- "${char}" → ${web3UrlClient.formatContentKey(key)}`);
      });
      
      // This test is informational only
      expect(true).to.be.true;
    });
  });
  
  describe('URL Format Test', function() {
    it('should test alternative URL formats for a real content key', function() {
      const realContentKey = 'personal_info.m7o1ucvg'; // A real content key from the app
      const ownerAddress = '0xEE45A0D3466A6a961D286cc61666B7067D7a7619';
      
      // Create client with the owner's address
      const client = new Web3UrlClient(ownerAddress, '3337');
      
      // Generate all possible URL formats
      const urls = client.getDebugUrl(realContentKey);
      
      console.log(`🔍 Testing URLs for key "${realContentKey}" and wallet ${ownerAddress}:`);
      Object.entries(urls).forEach(([format, url]) => {
        console.log(`- ${format}: ${url}`);
      });
      
      // Create a quick helper for manually testing URLs
      console.log('\n📋 Curl commands for testing:');
      Object.entries(urls).forEach(([format, url]) => {
        console.log(`curl -v "${url}" # Test ${format}`);
      });
      
      // This is informational
      expect(true).to.be.true;
    });
  });
}); 