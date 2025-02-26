# EthStorage Adapter for ElizaOS

This package provides an adapter and plugin for integrating EthStorage with ElizaOS. It enables storing and retrieving user facts on the Ethereum blockchain using EthStorage.

## Features

- Store user facts persistently on the blockchain
- Retrieve user facts to enhance AI interactions
- Evaluators to automatically identify and store new facts about users
- Decentralized storage for user data

## Installation

```bash
# Using npm
npm install @elizaos/adapter-ethstorage

# Using pnpm
pnpm add @elizaos/adapter-ethstorage
```

## Configuration

Add the following environment variables to your `.env` file:

```
# EthStorage Configuration
ETHSTORAGE_RPC_URL=https://galileo.web3q.io:8545
ETHSTORAGE_DIRECTORY_ADDRESS=0xYourEthStorageDirectoryAddress
ETHSTORAGE_PRIVATE_KEY=0xYourPrivateKey
```

## Usage

### As a Plugin

Import and use the plugin in your ElizaOS character configuration:

```typescript
import { plugin as ethStoragePlugin } from '@elizaos/adapter-ethstorage';

// In your character configuration
const character = {
  // ... other character configuration
  plugins: [
    // ... other plugins
    ethStoragePlugin,
  ],
};
```

### Using the Evaluators

The plugin automatically includes evaluators that will:

1. `addUserFact` - Identify and store new facts about users
2. `updateUserFact` - Update existing facts when users provide new information

These evaluators will be automatically registered and used by the ElizaOS runtime.

### Using the Provider

The plugin includes a provider that will retrieve and format user facts for inclusion in the AI context. The provider is automatically registered and will be included in the conversation context.

### Direct Adapter Usage

If you need more control, you can use the adapter directly:

```typescript
import adapter from '@elizaos/adapter-ethstorage';
import type { UserFact } from '@elizaos/adapter-ethstorage';

// Initialize the adapter
const ethStorageAdapter = adapter.init(runtime);

// Create a new user fact
const fact: UserFact = {
  id: `fact-${Date.now()}`,
  userId,
  key: 'preferences.likes',
  value: 'chocolate',
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// Store the fact
await ethStorageAdapter.createUserFact(fact);

// Get a fact by key
const retrievedFact = await ethStorageAdapter.getUserFactByKey(userId, 'preferences.likes');

// Get all facts for a user
const allFacts = await ethStorageAdapter.getUserFacts(userId);

// Update a fact
fact.value = 'dark chocolate';
fact.updatedAt = Date.now();
await ethStorageAdapter.updateUserFact(fact);

// Delete a fact
await ethStorageAdapter.deleteUserFact(userId, 'preferences.likes');
```

## Development

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

## License

MIT 