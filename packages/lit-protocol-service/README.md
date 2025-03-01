# Lit Protocol Service for ElizaOS

A TypeScript service for decrypting data from ethstorage using Lit Protocol for ElizaOS agents.

## Overview

This service enables ElizaOS agents to access encrypted data stored on ethstorage that is protected by Lit Protocol access control conditions. It integrates with the TrustDAI-helper service to manage capacity delegation and perform decryption operations.

## Features

- Connect to Lit Protocol network
- Delegate capacity for decryption operations
- Fetch encrypted files from ethstorage
- Decrypt files based on smart contract access conditions
- Save decrypted files for agent use

## Installation

1. Add the package to your workspace:

```bash
cd packages/lit-protocol-service
pnpm install
```

2. Build the package:

```bash
pnpm run build
```

## Usage

### Basic Usage

```typescript
import { ethers } from 'ethers';
import { LitProtocolService } from '@elizaos/lit-protocol-service';

async function decryptFiles() {
  // Configure the service
  const litService = new LitProtocolService({
    contractAddress: '0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986',
    helperApiUrl: 'http://localhost:3000',
    chain: 'sepolia',
  });
  
  // Create a wallet
  const provider = new ethers.JsonRpcProvider('https://sepolia.publicnode.com');
  const wallet = new ethers.Wallet(process.env.ETH_PRIVATE_KEY, provider);
  const signerAddress = await wallet.getAddress();
  
  // Fetch encrypted files
  const fileIds = ['file1', 'file2', 'file3'];
  const encryptedFiles = await litService.fetchEncryptedFiles(fileIds);
  
  // Decrypt the files
  const decryptedFiles = await litService.decryptFiles(
    encryptedFiles,
    wallet,
    signerAddress
  );
  
  // Use the decrypted files
  decryptedFiles.forEach(file => {
    console.log(`File ${file.fileID}: ${file.content}`);
  });
}
```

### Using the Agent Helper

The package includes a helper script to automate the process of fetching and decrypting files for agent use:

```typescript
import { loadAgentDataFromEthStorage } from '@elizaos/lit-protocol-service/agent-helper';

async function loadAgentData() {
  const config = {
    contractAddress: '0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986',
    helperApiUrl: 'http://localhost:3000',
    chain: 'sepolia',
    walletPrivateKey: process.env.ETH_PRIVATE_KEY,
    fileIds: ['file1', 'file2', 'file3'],
    outputDir: './agent-data',
  };
  
  const savedFilePaths = await loadAgentDataFromEthStorage(config);
  console.log('Decrypted files saved to:', savedFilePaths);
}
```

### Command Line Usage

You can also use the agent helper script directly from the command line:

```bash
# Set environment variables
export ETH_PRIVATE_KEY="your-private-key"
export ETH_STORAGE_FILE_IDS="file1,file2,file3"
export LIT_HELPER_API_URL="http://localhost:3000"
export LIT_CONTRACT_ADDRESS="0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986"
export LIT_CHAIN="sepolia"
export OUTPUT_DIR="./agent-data"

# Run the script
node dist/agent-helper.js
```

## Configuration

The service requires the following configuration:

- `contractAddress`: The address of the contract that contains the access control conditions (e.g., `0xd0EBaF6bAc19AA239853D94ec0FC0639F27eA986`)
- `helperApiUrl`: URL of the TrustDAI-helper service (default: `http://localhost:3000`)
- `chain`: The blockchain network to use (e.g., `sepolia`, `ethereum`)

## TrustDAI-Helper Integration

This service communicates with the TrustDAI-helper service running on `localhost:3000`. Make sure the helper service is running and accessible before using this service.

## Security Considerations

- Never hardcode private keys in your code. Use environment variables or secure key management solutions.
- Protect decrypted data appropriately, especially if it contains sensitive information.
- Consider implementing rate limiting and access controls to prevent abuse.

## License

MIT 