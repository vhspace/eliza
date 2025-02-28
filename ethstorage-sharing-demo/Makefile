# EthStorage Personal Data Sharing Demo Makefile

.PHONY: setup compile deploy deploy-testnet run-demo test demo-test clean

# Setup the project
setup:
	node scripts/setup.js

# Compile smart contracts
compile:
	npx hardhat compile

# Deploy to local hardhat network
deploy:
	npx hardhat run scripts/deploy.js --network hardhat

# Deploy to QuarkChain L2 TestNet
deploy-testnet:
	npx hardhat run scripts/deploy.js --network quarkchainTestnet

# Run the demo server
run-demo:
	node scripts/start.js

# Run Hardhat tests
test:
	npx hardhat test

# Run demo test script
demo-test:
	node scripts/test.js

# Clean build artifacts
clean:
	rm -rf artifacts
	rm -rf cache
	rm -rf deployments/*

# All-in-one setup for local testing
local-setup: setup compile deploy

# All-in-one setup for testnet
testnet-setup: setup compile deploy-testnet

# Help command
help:
	@echo "EthStorage Personal Data Sharing Demo"
	@echo ""
	@echo "Available commands:"
	@echo "  make setup         - Setup the project"
	@echo "  make compile       - Compile smart contracts"
	@echo "  make deploy        - Deploy to local hardhat network"
	@echo "  make deploy-testnet - Deploy to QuarkChain L2 TestNet"
	@echo "  make run-demo      - Run the demo server"
	@echo "  make test          - Run Hardhat tests"
	@echo "  make demo-test     - Run demo test script"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make local-setup   - All-in-one setup for local testing"
	@echo "  make testnet-setup - All-in-one setup for testnet"
	@echo "  make help          - Show this help" 