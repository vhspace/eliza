import { plugin as ethStoragePlugin } from '../src/plugin';
import adapter, { type UserFact } from '../src/index';

/**
 * This example demonstrates how to:
 * 1. Use the EthStorage adapter directly to store and retrieve user facts
 * 2. Register the plugin with an ElizaOS agent
 */

// Sample runtime (in a real app, this would be provided by ElizaOS)
const mockRuntime = {
  agentId: 'agent-123',
  // Other runtime properties would be here in a real implementation
} as any;

async function directAdapterUsage() {
  // Set up environment variables for the adapter
  process.env.ETHSTORAGE_RPC_URL = 'https://galileo.web3q.io:8545';
  process.env.ETHSTORAGE_DIRECTORY_ADDRESS = '0xExampleDirectoryAddress';
  process.env.ETHSTORAGE_PRIVATE_KEY = '0xExamplePrivateKey';
  
  // Initialize the adapter
  const ethStorageAdapter = adapter.init(mockRuntime);
  await ethStorageAdapter.init();
  
  // Create a user fact
  const userId = 'user-123' as any; // TypeScript UUID type
  
  const fact: UserFact = {
    id: `fact-${Date.now()}` as any, // TypeScript UUID type
    userId,
    key: 'preferences.likes',
    value: 'chocolate',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  // Store the fact
  console.log('Creating user fact...');
  const createResult = await ethStorageAdapter.createUserFact(fact);
  console.log('Create result:', createResult);
  
  // Get the fact
  console.log('Getting user fact...');
  const retrievedFact = await ethStorageAdapter.getUserFactByKey(userId, 'preferences.likes');
  console.log('Retrieved fact:', retrievedFact);
  
  // Get all facts for the user
  console.log('Getting all user facts...');
  const allFacts = await ethStorageAdapter.getUserFacts(userId);
  console.log('All facts:', allFacts);
  
  // Update the fact
  if (retrievedFact) {
    console.log('Updating user fact...');
    const updatedFact = {
      ...retrievedFact,
      value: 'dark chocolate',
      updatedAt: Date.now()
    };
    
    const updateResult = await ethStorageAdapter.updateUserFact(updatedFact);
    console.log('Update result:', updateResult);
  }
  
  // Delete the fact
  console.log('Deleting user fact...');
  const deleteResult = await ethStorageAdapter.deleteUserFact(userId, 'preferences.likes');
  console.log('Delete result:', deleteResult);
  
  // Close the adapter
  await ethStorageAdapter.close();
}

async function pluginUsage() {
  // In a real application, you would configure ElizaOS to use the plugin
  
  console.log('Plugin configuration:');
  console.log('- Name:', ethStoragePlugin.name);
  console.log('- Description:', ethStoragePlugin.description);
  console.log('- Providers:', ethStoragePlugin.providers?.length);
  console.log('- Evaluators:', ethStoragePlugin.evaluators?.length);
  
  // To use the plugin, you would:
  // 1. Add it to your character configuration
  // 2. ElizaOS would automatically register the providers and evaluators
  
  const character = {
    name: 'Memory Bot',
    // Other character properties...
    plugins: [
      ethStoragePlugin,
      // Other plugins...
    ]
  };
  
  console.log('Character configured with EthStorage plugin');
  
  // The evaluators will automatically run when messages are processed by ElizaOS
  // The provider will automatically be included in the conversation context
}

// Run the examples
async function main() {
  console.log('=== Direct Adapter Usage Example ===');
  await directAdapterUsage();
  
  console.log('\n=== Plugin Usage Example ===');
  await pluginUsage();
}

// Only run if executed directly (not imported)
if (require.main === module) {
  main().catch(error => {
    console.error('Error running examples:', error);
    process.exit(1);
  });
}

export { directAdapterUsage, pluginUsage }; 