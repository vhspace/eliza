# Web3 URL Personal Data Sharing Demo: Directory Structure

This document outlines the directory structure of the project for reference:

```
ethstorage-sharing-demo/
│
├── contracts/                      # Smart contracts
│   └── PersonalDataRegistry.sol    # Main contract for data access control
│
├── scripts/                        # Node.js scripts
│   ├── lib/                        # Helper libraries
│   │   ├── registry.js             # Library for interacting with the PersonalDataRegistry contract
│   │   └── web3url.js              # Library for working with web3 URLs (w3link.io)
│   │
│   ├── deploy.js                   # Contract deployment script
│   ├── setup.js                    # Project setup script
│   ├── start.js                    # Demo server script
│   └── test.js                     # Demo test script
│
├── test/                           # Hardhat tests
│   └── PersonalDataRegistry.test.js # Tests for the registry contract
│
├── frontend/                       # Web frontend for the demo
│   └── index.html                  # Simple demo UI
│
├── deployments/                    # Deployment information (created during deployment)
│   └── quarkchainTestnet.json      # Deployment info for QuarkChain L2 TestNet
│
├── .env.example                    # Environment variables template
├── .env                            # Actual environment variables (created from .env.example)
├── hardhat.config.js               # Hardhat configuration
├── Makefile                        # Handy commands for the demo
├── package.json                    # Project dependencies and scripts
└── README.md                       # Project documentation
```

## Key Components

1. **Smart Contract**: The `PersonalDataRegistry.sol` manages access control to content keys used in web3 URLs.

2. **Helper Libraries**:
   - `registry.js`: Interface for the smart contract
   - `web3url.js`: Utilities for working with web3 URLs (constructing URLs, generating keys)

3. **Scripts**:
   - `setup.js`: Initializes the project
   - `deploy.js`: Deploys the smart contract
   - `start.js`: Runs the demo server
   - `test.js`: Tests the full data flow

4. **Frontend**: A simple web UI to interact with the system

5. **Configuration**:
   - `.env`: Contains credentials and contract addresses
   - `hardhat.config.js`: Network and compiler settings 