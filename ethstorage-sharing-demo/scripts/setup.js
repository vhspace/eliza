/**
 * EthStorage Personal Data Sharing Demo Setup Script
 * 
 * This script helps set up the demo project:
 * 1. Creates directories if they don't exist
 * 2. Copies .env.example to .env if it doesn't exist
 * 3. Checks if the required dependencies are installed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Base directories
const REQUIRED_DIRS = [
  'deployments',
  'frontend',
  'scripts/lib'
];

// Check if a command exists
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Create directory if it doesn't exist
function ensureDirectoryExists(dir) {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

// Copy a file if destination doesn't exist
function copyFileIfNotExists(src, dest) {
  const srcPath = path.join(__dirname, '..', src);
  const destPath = path.join(__dirname, '..', dest);
  
  if (!fs.existsSync(destPath) && fs.existsSync(srcPath)) {
    console.log(`Creating ${dest} from template`);
    fs.copyFileSync(srcPath, destPath);
  }
}

// Main setup function
function setup() {
  console.log("=== Setting up EthStorage Personal Data Sharing Demo ===");
  
  // Check Node.js and npm
  if (!commandExists('node')) {
    console.error("Error: Node.js is not installed. Please install Node.js v16 or later.");
    process.exit(1);
  }
  
  // Create required directories
  console.log("\nChecking required directories...");
  REQUIRED_DIRS.forEach(ensureDirectoryExists);
  
  // Set up .env file
  console.log("\nChecking environment configuration...");
  copyFileIfNotExists('.env.example', '.env');
  
  // Check if environment variables are set
  if (fs.existsSync(path.join(__dirname, '..', '.env'))) {
    console.log("Environment file (.env) exists");
    console.log("NOTE: Please make sure to update the .env file with your private key and contract addresses");
  } else {
    console.warn("WARNING: No .env file found. Environment setup is required.");
  }
  
  // Install dependencies
  console.log("\nChecking dependencies...");
  if (!fs.existsSync(path.join(__dirname, '..', 'node_modules'))) {
    console.log("Installing dependencies... (this may take a minute)");
    try {
      execSync('npm install', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
    } catch (error) {
      console.error("Error installing dependencies:", error.message);
      console.error("Please run 'npm install' manually in the project directory");
    }
  } else {
    console.log("Dependencies already installed");
  }
  
  console.log("\n=== Setup Complete ===");
  console.log("\nNext steps:");
  console.log("1. Update the .env file with your credentials");
  console.log("2. Compile the smart contract:   npm run compile");
  console.log("3. Deploy to testnet:            npm run deploy-testnet");
  console.log("4. Add the deployed contract address to your .env file");
  console.log("5. Start the demo:               npm start");
  console.log("\nFor more information, see the README.md file");
}

// Run setup
setup(); 