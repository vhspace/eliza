#!/bin/bash

# Web3 URL Personal Data Sharing Demo: Quick Start Script
# This script helps set up and run the demo with minimal effort

# Function to print messages
print_message() {
  echo -e "\033[1;34m>> $1\033[0m"
}

# Function to print errors
print_error() {
  echo -e "\033[1;31m>> ERROR: $1\033[0m"
}

# Function to print success messages
print_success() {
  echo -e "\033[1;32m>> $1\033[0m"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  print_error "Node.js is not installed. Please install Node.js v16 or later."
  exit 1
fi

print_message "Web3 URL Personal Data Sharing Demo"
print_message "===================================="

# Check if .env file exists
if [ ! -f .env ]; then
  print_message "Setting up environment file..."
  if [ -f .env.example ]; then
    cp .env.example .env
    print_success "Created .env file from template. Please edit it with your private key and other settings."
    print_message "Press Enter to continue after editing the .env file..."
    read
  else
    print_error "No .env.example file found. Please create a .env file manually."
    exit 1
  fi
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
  print_message "Installing dependencies..."
  npm install
  
  if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies. Please run 'npm install' manually."
    exit 1
  fi
  
  print_success "Dependencies installed successfully."
fi

# Compile smart contract
print_message "Compiling smart contract..."
npx hardhat compile

if [ $? -ne 0 ]; then
  print_error "Failed to compile smart contract. Check for errors above."
  exit 1
fi

print_success "Smart contract compiled successfully."

# Check if contract is already deployed
if [ ! -f "deployments/quarkchainTestnet.json" ]; then
  print_message "Smart contract not yet deployed. Would you like to deploy it now? (y/n)"
  read deploy_choice
  
  if [[ $deploy_choice == "y" || $deploy_choice == "Y" ]]; then
    print_message "Deploying smart contract to QuarkChain L2 TestNet..."
    npx hardhat run scripts/deploy.js --network quarkchainTestnet
    
    if [ $? -ne 0 ]; then
      print_error "Failed to deploy smart contract. Check for errors above."
      exit 1
    fi
    
    print_success "Smart contract deployed successfully."
    print_message "Please add the deployed contract address to your .env file as DATA_REGISTRY_CONTRACT."
    print_message "Press Enter to continue after updating the .env file..."
    read
  else
    print_message "Skipping contract deployment. You'll need to deploy it manually later."
  fi
fi

# Start the demo server
print_message "Starting the demo server..."
node scripts/start.js

exit 0 