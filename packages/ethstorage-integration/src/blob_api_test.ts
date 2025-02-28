/**
 * EthStorage Blob Archiver API Test
 * Tests different endpoints of the Blob Archiver API
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the .env-ethstorage file
const envPath = path.resolve(process.cwd(), '../../.env-ethstorage');
dotenv.config({ path: envPath });

// Get configuration from environment variables
const BLOB_ARCHIVER_API = process.env.ETHSTORAGE_BLOB_ARCHIVER_API || 'http://65.108.236.27:9645';

async function testBlobArchiverApi(): Promise<void> {
  console.log('EthStorage Blob Archiver API Test');
  console.log('================================');
  console.log(`Blob Archiver API: ${BLOB_ARCHIVER_API}`);

  // List of endpoints to test
  const endpoints = [
    { path: '/', method: 'GET', description: 'Root endpoint' },
    { path: '/status', method: 'GET', description: 'Status endpoint' },
    { path: '/health', method: 'GET', description: 'Health check endpoint' },
    { path: '/archive', method: 'GET', description: 'Archive endpoint' },
    { path: '/blobTxs', method: 'GET', description: 'Blob transactions endpoint' },
    { path: '/info', method: 'GET', description: 'API info endpoint' }
  ];
  
  console.log('\nTesting different endpoints...');
  
  for (const endpoint of endpoints) {
    const url = `${BLOB_ARCHIVER_API}${endpoint.path}`;
    console.log(`\nTesting ${endpoint.description}: ${url}`);
    
    try {
      const response = await fetch(url, { method: endpoint.method });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        // Try to get response as text first
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          const jsonData = await response.json();
          console.log(`Response (JSON): ${JSON.stringify(jsonData, null, 2)}`);
        } else {
          const textData = await response.text();
          console.log(`Response (Text): ${textData.substring(0, 200)}${textData.length > 200 ? '...' : ''}`);
        }
        
        console.log(`✅ Endpoint ${endpoint.path} is accessible`);
      } else {
        console.log(`❌ Endpoint ${endpoint.path} returned error: ${await response.text()}`);
      }
    } catch (error) {
      console.error(`❌ Error accessing ${endpoint.path}:`, error);
    }
  }
  
  console.log('\nBlob Archiver API Test Summary:');
  console.log('=============================');
  console.log('API URL:', BLOB_ARCHIVER_API);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testBlobArchiverApi().catch(console.error);
}

export default testBlobArchiverApi; 