# Web3 URL Personal Data Sharing Demo

This demo showcases a decentralized application for personal data sharing using EthStorage and Ethereum smart contracts. Users can securely store data on EthStorage and selectively grant access through a smart contract.

## Features

- Upload personal information in different categories (personal info, interests, travel history, etc.)
- Store content securely on EthStorage
- Selectively share data categories with specific users
- View shared data through a simple web interface

## Architecture

The system uses:
- **Smart Contract**: Controls access permissions to data keys
- **EthStorage**: Permanent on-chain storage for your data
- **Web3 URLs**: References to content in the format `https://{wallet_address}.{chain_id}.w3link.io/{content_key}`
- **Web Interface**: Allows users to interact with the system

## Prerequisites

- Node.js (v16+)
- npm or pnpm
- MetaMask or similar Ethereum wallet
- Some QuarkChain L2 TestNet ETH for transaction fees

## Quick Start

The easiest way to get started is to use our quick start script:

```bash
cd ethstorage-sharing-demo
./run-demo.sh
```

This script will:
1. Set up your environment file
2. Install dependencies
3. Compile the smart contract
4. Offer to deploy the contract
5. Start the demo server

## Manual Setup Instructions

If you prefer to set up manually, follow these steps:

1. **Clone and Install Dependencies**

```bash
cd ethstorage-sharing-demo
npm install
# or
pnpm install
```

2. **Configure Environment**

Create a `.env` file in the project root:

```
PRIVATE_KEY=your_private_key_without_0x_prefix
RPC_URL=https://rpc.beta.testnet.l2.quarkchain.io:8545/
CHAIN_ID=3337
DATA_REGISTRY_CONTRACT=your_deployed_contract_address
```

3. **Compile and Deploy Smart Contract**

```bash
npm run compile
npm run deploy-testnet
```

After deployment, update the `.env` file with the deployed contract address:

```
DATA_REGISTRY_CONTRACT=deployed_contract_address
```

4. **Start the Demo Application**

```bash
npm start
```

This will start a local server at http://localhost:3000

## Using the Makefile

The project includes a Makefile with helpful commands:

```bash
# Setup everything
make setup

# Compile contracts
make compile

# Deploy to testnet
make deploy-testnet

# Run the demo server
make run-demo

# Run tests
make test

# View all available commands
make help
```

## Testing the Demo

1. **Connect Wallet**: The demo automatically connects using the wallet from your `.env` file.

2. **Upload Data**: Go to the "Profile" section and upload information in different categories.

3. **Share Data**: Navigate to the "Access Control" section to share specific data categories with other users.

4. **View Shared Data**: Switch to a different wallet (or have another user connect) and go to the "Shared Data" section to view information that has been shared with you.

## Smart Contract

The main smart contract is `PersonalDataRegistry.sol` which manages:
- Data category registration
- Access control permissions
- Content key tracking

## About Web3 URLs and EthStorage

The demo uses EthStorage to store your data on-chain. Each piece of content can be referenced using a web3 URL in the format:
```
https://{wallet_address}.{chain_id}.w3link.io/{content_key}
```

Where:
- `wallet_address`: The Ethereum address that owns the content
- `chain_id`: The blockchain network ID (3337 for QuarkChain L2 TestNet)
- `content_key`: A unique identifier for the content

The web interface provides these URLs for convenience, but the actual data retrieval happens directly through the EthStorage SDK. This provides a more reliable and decentralized experience.

## Security Notes

- Data is stored on-chain through EthStorage
- Access to content keys is controlled by the smart contract
- Anyone with a content key and knowledge of the owner's address can access the data
- For sensitive data, implement client-side encryption before storing

## Directory Structure

See [DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md) for a complete overview of the project files.

## License

MIT

## Diagnostic Tools

This project includes a set of diagnostic tools to help identify and fix common issues with EthStorage, Web3 URLs, and authorization.

### Running Diagnostic Tests

To run the full diagnostic suite:

```bash
npm run diagnose
```

To run specific diagnostic tests:

```bash
npm run diagnose:ethstorage  # Test EthStorage client only
npm run diagnose:web3url     # Test Web3 URL generation and access
npm run diagnose:access      # Test registry authorization issues
npm run diagnose:integration # Run integration tests
```

### Common Issues and Solutions

#### "Not authorized to view this data" Error

This occurs when trying to access data in the registry. The diagnostics will:

1. Check if you're attempting to access your own data
2. Verify the contract allows self-access
3. Test different address formats
4. Check if the registry contract is working properly

#### "DecentralizedKV: get() must be called on ES node" Error

This error occurs when the EthStorage client tries to connect to an RPC that doesn't support EthStorage operations. The diagnostics will:

1. Verify the RPC URL supports EthStorage
2. Test the fallback storage mechanism
3. Evaluate connection parameters

#### Web3 URL 400 Errors

When Web3 URLs return 400 errors, the diagnostics will:

1. Generate multiple URL formats for the same content key
2. Test each format to find which ones work
3. Check URL encoding for special characters
4. Provide curl commands for manual testing

### Fixing Issues

The diagnostic tools may recommend specific fixes:

1. For authorization issues: Updates to the `isApproved` method in `registry.js`
2. For EthStorage connection: Configuration changes or fallback usage
3. For Web3 URL access: Alternative URL formats or encoding solutions

## Advanced Debugging

For more detailed debugging:

```bash
# Enable Web3URL debugging
DEBUG_WEB3URL=true npm start

# Run with verbose logging
DEBUG=* npm run diagnose
``` 