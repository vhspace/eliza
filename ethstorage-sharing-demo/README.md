# Web3 URL Personal Data Sharing Demo

This demo showcases a decentralized application for personal data sharing using web3 URLs and Ethereum smart contracts. Users can share content via web3 URLs (w3link.io) and selectively grant access through a smart contract.

## Features

- Upload personal information in different categories (personal info, interests, travel history, etc.)
- Generate unique web3 URLs for each content piece
- Selectively share data categories with specific users
- View shared data through a simple web interface

## Architecture

The system uses:
- **Smart Contract**: Controls access permissions to data keys
- **Web3 URLs**: Decentralized URLs in the format `https://{wallet_address}.{chain_id}.w3link.io/{content_key}`
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

## About Web3 URLs

The demo uses web3 URLs in the format:
```
https://{wallet_address}.{chain_id}.w3link.io/{content_key}
```

Where:
- `wallet_address`: The Ethereum address that owns the content
- `chain_id`: The blockchain network ID (3337 for QuarkChain L2 TestNet)
- `content_key`: A unique identifier for the content

In a production environment, you would need a service to upload actual content to these URLs. For the demo, we simulate the content storage.

## Security Notes

- Access to content keys is controlled by the smart contract
- Anyone with a content key and knowledge of the owner's address can construct the full URL
- For sensitive data, implement client-side encryption before storing

## Directory Structure

See [DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md) for a complete overview of the project files.

## License

MIT 