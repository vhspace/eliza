#!/usr/bin/env node

/**
 * EthStorage Diagnostic Test Runner
 * 
 * This script runs diagnostic tests to identify and troubleshoot issues with
 * EthStorage integration, Web3 URLs, and authorization problems.
 */

const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
const { existsSync } = require('fs');

// Load environment variables
dotenv.config();

// Configuration for tests
const TEST_CONFIGS = {
  'ethstorage': {
    file: 'test/EthStorageClient.test.js',
    description: 'EthStorage Client Tests',
    emoji: '🗄️'
  },
  'web3url': {
    file: 'test/Web3UrlClient.test.js',
    description: 'Web3 URL Client Tests',
    emoji: '🔗'
  },
  'access': {
    file: 'test/RegistryAccess.test.js',
    description: 'Registry Access Tests',
    emoji: '🔑'
  },
  'integration': {
    file: 'test/Integration.test.js',
    description: 'Integration Tests',
    emoji: '🧩'
  }
};

// Check for required environment variables
const requiredEnvVars = ['PRIVATE_KEY', 'RPC_URL', 'DATA_REGISTRY_CONTRACT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please set these in your .env file');
  process.exit(1);
}

/**
 * Run a test with Mocha
 * @param {string} testFile - The test file to run
 * @param {string} description - Description of the test
 * @param {string} emoji - Emoji for visual identification
 * @returns {Promise<boolean>} Whether the test succeeded
 */
function runTest(testFile, description, emoji) {
  return new Promise((resolve) => {
    const fullPath = path.join(__dirname, '..', testFile);
    
    if (!existsSync(fullPath)) {
      console.error(`\n${emoji} ${description}`);
      console.error(`❌ Test file not found: ${testFile}`);
      return resolve(false);
    }
    
    console.log(`\n${emoji} Running ${description}...`);
    console.log('─'.repeat(process.stdout.columns || 80));
    
    // Use Mocha to run the test
    const mochaArgs = [
      '--timeout', '60000',  // 60 second timeout
      fullPath
    ];
    
    const testProcess = spawn('npx', ['mocha', ...mochaArgs], { 
      stdio: 'inherit',
      env: { ...process.env, DEBUG_WEB3URL: 'true' }
    });
    
    testProcess.on('close', (code) => {
      const success = code === 0;
      console.log('─'.repeat(process.stdout.columns || 80));
      console.log(`${success ? '✅' : '❌'} ${description} ${success ? 'completed successfully' : 'failed'}`);
      resolve(success);
    });
  });
}

/**
 * Main function to run tests
 */
async function main() {
  let args = process.argv.slice(2);
  let testsToRun = [];
  
  if (args.length === 0 || args.includes('all')) {
    // Run all tests if no specific test is specified
    testsToRun = Object.keys(TEST_CONFIGS);
  } else {
    // Run only the specified tests
    testsToRun = args.filter(arg => TEST_CONFIGS[arg]);
    
    // Check for unknown test names
    const unknownTests = args.filter(arg => !TEST_CONFIGS[arg] && arg !== 'all');
    if (unknownTests.length > 0) {
      console.error(`Unknown test(s): ${unknownTests.join(', ')}`);
      console.error(`Available tests: ${Object.keys(TEST_CONFIGS).join(', ')}, all`);
      process.exit(1);
    }
  }
  
  if (testsToRun.length === 0) {
    console.error('No tests to run');
    process.exit(1);
  }
  
  console.log('🧪 EthStorage Diagnostic Test Runner');
  console.log('─'.repeat(process.stdout.columns || 80));
  console.log(`Running ${testsToRun.length} test suites: ${testsToRun.join(', ')}`);
  console.log('─'.repeat(process.stdout.columns || 80));
  
  let successCount = 0;
  
  // Run tests in sequence
  for (const testName of testsToRun) {
    const { file, description, emoji } = TEST_CONFIGS[testName];
    const success = await runTest(file, description, emoji);
    if (success) successCount++;
  }
  
  // Print summary
  console.log('\n📋 Test Summary');
  console.log('─'.repeat(process.stdout.columns || 80));
  console.log(`Completed ${successCount} of ${testsToRun.length} test suites successfully`);
  
  // Exit with appropriate code
  process.exit(successCount === testsToRun.length ? 0 : 1);
}

// Run the main function
main().catch(error => {
  console.error('❌ An error occurred:', error);
  process.exit(1);
}); 