# EthStorage Integration for ElizaOS

This package provides integration between ElizaOS and EthStorage, allowing for decentralized storage of user data on the Ethereum blockchain.

## Features

- Upload files to EthStorage
- Download files from EthStorage
- List files stored in EthStorage
- Delete files from EthStorage
- Wallet management for EthStorage interactions

## Installation

This package is part of the ElizaOS monorepo and can be installed using pnpm:

```bash
pnpm install
```

## Usage

```typescript
import { EthStorageClient } from '@elizaos/ethstorage-integration';

// Create an EthStorage client
const client = new EthStorageClient({
  rpcUrl: 'https://ethereum-rpc-url',
  privateKey: 'your-private-key', // Or use a wallet instance
  // Optional: contractAddress: 'custom-contract-address'
});

// Upload a file
const data = new Uint8Array([/* file data */]);
const uploadResult = await client.uploadFile(data, 'example.txt', 'text/plain');

if (uploadResult.success) {
  console.log(`File uploaded with ID: ${uploadResult.fileId}`);
}

// Download a file
const downloadResult = await client.downloadFile('file-id');

if (downloadResult.success && downloadResult.data) {
  console.log(`Downloaded file: ${downloadResult.metadata?.name}`);
  console.log(`File size: ${downloadResult.metadata?.size} bytes`);
  // Process downloadResult.data (Uint8Array)
}

// List files
const files = await client.listFiles();
console.log(`Found ${files.length} files`);

// Delete a file
const deleted = await client.deleteFile('file-id');
console.log(`File deletion ${deleted ? 'succeeded' : 'failed'}`);
```

## Integration with ElizaOS Plugins

This package can be used to create an ElizaOS plugin for EthStorage:

```typescript
import { Plugin } from '@elizaos/core';
import { EthStorageClient } from '@elizaos/ethstorage-integration';

class EthStoragePlugin implements Plugin {
  private client: EthStorageClient;
  
  constructor(config) {
    this.client = new EthStorageClient({
      rpcUrl: config.rpcUrl,
      privateKey: config.privateKey,
    });
  }
  
  // Implement Plugin interface methods
  // ...
}
```

## License

ISC 