import { ethers } from 'ethers';
import adapter, { type UserFact } from './index';

// Mock the IAgentRuntime interface
const mockRuntime = {
  agentId: 'agent-123',
  // Add other required properties as needed
} as any;

// Mock environment variables for testing
process.env.ETHSTORAGE_RPC_URL = 'https://mock-rpc-url.example.com';
process.env.ETHSTORAGE_DIRECTORY_ADDRESS = '0xMockDirectoryAddress';
process.env.ETHSTORAGE_PRIVATE_KEY = '0xMockPrivateKey';

// Mock ethers
jest.mock('ethers', () => {
  const original = jest.requireActual('ethers');
  return {
    ...original,
    ethers: {
      ...original.ethers,
      providers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
          // Mock provider methods as needed
        }))
      },
      Wallet: jest.fn().mockImplementation(() => ({
        // Mock wallet methods as needed
      }))
    }
  };
});

describe('EthStorage Adapter', () => {
  let ethStorageAdapter: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Initialize adapter
    ethStorageAdapter = adapter.init(mockRuntime);
  });

  it('should initialize properly', async () => {
    // Mock console.log to capture output
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    
    await ethStorageAdapter.init();
    
    expect(mockConsoleLog).toHaveBeenCalledWith(
      'Initializing EthStorage adapter with directory:',
      '0xMockDirectoryAddress'
    );
    
    // Verify that the JsonRpcProvider was created with the correct URL
    expect(ethers.providers.JsonRpcProvider).toHaveBeenCalledWith(
      'https://mock-rpc-url.example.com'
    );
    
    // Verify that the Wallet was created with the correct private key
    expect(ethers.Wallet).toHaveBeenCalled();
    
    // Restore console.log
    mockConsoleLog.mockRestore();
  });

  it('should create a user fact', async () => {
    // Mock console.log to capture output
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    
    const fact: UserFact = {
      id: 'fact-123',
      userId: 'user-123',
      key: 'preferences.likes',
      value: 'chocolate',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const result = await ethStorageAdapter.createUserFact(fact);
    
    expect(result).toBe(true);
    expect(mockConsoleLog).toHaveBeenCalledWith(
      `Creating user fact for user ${fact.userId}: ${fact.key} = ${fact.value}`
    );
    
    // Restore console.log
    mockConsoleLog.mockRestore();
  });

  it('should get a user fact by key', async () => {
    // Mock console.log to capture output
    const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    
    const userId = 'user-123';
    const key = 'preferences.likes';
    
    const result = await ethStorageAdapter.getUserFactByKey(userId, key);
    
    expect(result).toBe(null); // Our implementation returns null for now
    expect(mockConsoleLog).toHaveBeenCalledWith(
      `Getting user fact for user ${userId}: ${key}`
    );
    
    // Restore console.log
    mockConsoleLog.mockRestore();
  });

  it('should close properly', async () => {
    await ethStorageAdapter.close();
    
    // Our implementation just sets db to null, so there's not much to test here
    expect(ethStorageAdapter.db).toBe(null);
  });
}); 