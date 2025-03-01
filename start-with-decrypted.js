#!/usr/bin/env node

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

// Default values
const DEFAULT_CHARACTER = 'mediaexpert';
const DEFAULT_CONTRACT_ADDRESS = '0x7d302b49617e8C8adD2d7E6F92999e0a9EFea01c';
const API_PORT = 3001;

// Simple argument parser
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    character: DEFAULT_CHARACTER,
    privateKey: null,
    contractAddress: DEFAULT_CONTRACT_ADDRESS,
    inputFile: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-c' || arg === '--character') {
      result.character = args[++i] || DEFAULT_CHARACTER;
    }
    else if (arg === '-k' || arg === '--privateKey') {
      result.privateKey = args[++i];
    }
    else if (arg === '-a' || arg === '--contractAddress') {
      result.contractAddress = args[++i] || DEFAULT_CONTRACT_ADDRESS;
    }
    else if (arg === '-i' || arg === '--inputFile') {
      result.inputFile = args[++i];
    }
    else if (arg === '-h' || arg === '--help') {
      showHelp();
      process.exit(0);
    }
  }
  
  return result;
}

function showHelp() {
  console.log(`
Usage: ./start-with-decrypted.js [options]

Options:
  -c, --character CHARACTER    Character name to start (default: ${DEFAULT_CHARACTER})
  -k, --privateKey KEY         Wallet private key for decryption
  -a, --contractAddress ADDR   Contract address for access control (default: ${DEFAULT_CONTRACT_ADDRESS})
  -i, --inputFile URL          URL of the encrypted file to decrypt
  -h, --help                   Show this help message
  
Example:
  ./start-with-decrypted.js -k YOUR_PRIVATE_KEY -i https://example.com/encrypted-file
  `);
}

async function decryptFile(privateKey, contractAddress, inputFileUrl) {
  console.log('Decrypting file using Lit Protocol...');
  
  // Execute the decryption script from the lit-protocol-service directory
  const { execSync } = require('child_process');
  
  const originalDir = process.cwd();
  const litServiceDir = path.join(originalDir, 'packages', 'lit-protocol-service', 'src');
  const outputPath = path.join(originalDir, 'decrypted_output.json');
  
  try {
    // Change to the lit-protocol-service directory and run the decryption script
    process.chdir(litServiceDir);
    
    // Execute the decryption command
    const cmd = `WALLET_PRIVATE_KEY=${privateKey} CONTRACT_ADDRESS=${contractAddress} node run-decrypt.js ${inputFileUrl} ${outputPath}`;
    execSync(cmd, { stdio: 'inherit' });
    
    // Make sure to change back to the original directory
    process.chdir(originalDir);
    
    // Read the decrypted file
    const decryptedData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    console.log('File decrypted successfully:', decryptedData);
    
    return decryptedData;
  } catch (error) {
    // Make sure to change back to the original directory even if an error occurs
    process.chdir(originalDir);
    console.error('Error during decryption:', error.message);
    throw error;
  }
}

async function startCharacter(characterName, decryptedData = null) {
  const characterPath = path.join(process.cwd(), 'characters', `${characterName}.character.json`);
  
  // Check if the character file exists
  if (!fs.existsSync(characterPath)) {
    console.error(`Character file not found: ${characterPath}`);
    // List available characters if the directory exists
    const charactersDir = path.join(process.cwd(), 'characters');
    if (fs.existsSync(charactersDir)) {
      console.log(`Available characters: ${fs.readdirSync(charactersDir)
        .filter(file => file.endsWith('.character.json'))
        .map(file => file.replace('.character.json', ''))
        .join(', ')}`);
    } else {
      console.error(`Characters directory not found: ${charactersDir}`);
      // Try to find the characters directory
      const possiblePaths = [
        path.join(process.cwd(), 'packages/agent/characters'),
        path.join(process.cwd(), 'agent/characters')
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          console.log(`Characters might be located at: ${possiblePath}`);
          break;
        }
      }
    }
    process.exit(1);
  }

  try {
    // API endpoint
    const apiUrl = `http://localhost:${API_PORT}/agent/start`;
    
    // Request payload - just use the character path
    const payload = {
      characterPath: characterPath
    };
    
    console.log(`Starting character ${characterName} from path: ${characterPath}`);
    const response = await axios.post(apiUrl, payload);
    
    console.log('Character started successfully:');
    console.log(`ID: ${response.data.id}`);
    console.log(`Name: ${response.data.character.name}`);
    
    // If we have decrypted data, send it as a message to the agent
    if (decryptedData) {
      // Format the decrypted data as a readable message
      let formattedData;
      if (typeof decryptedData === 'string') {
        formattedData = decryptedData;
      } else if (typeof decryptedData === 'object') {
        formattedData = JSON.stringify(decryptedData, null, 2);
      }
      
      try {
        console.log('Sending decrypted data as a message to the agent...');
        const messageEndpoint = `http://localhost:${API_PORT}/${response.data.id}/message`;
        await axios.post(messageEndpoint, {
          text: `I have decrypted this confidential information for you using Lit Protocol:\n\n${formattedData}`,
          userId: 'user',
          userName: 'User'
        });
        console.log('Message with decrypted data sent successfully!');
        
        // Wait a moment for the character to process the message
        console.log('Waiting for the character to process the message...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Send a follow-up message to verify the character received the data
        console.log('Sending verification message...');
        const verificationResponse = await axios.post(messageEndpoint, {
          text: "Can you confirm that you received the decrypted information? Please summarize what you learned.",
          userId: 'user',
          userName: 'User'
        });
        
        // Wait for the character to respond (in a real application, you'd use websockets or polling)
        console.log('Waiting for character response...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('\n-------------------------------------------------');
        console.log('SUCCESS: Decrypted data was sent to the character');
        console.log('-------------------------------------------------');
        console.log('You can now interact with the character normally through the ElizaOS interface');
        console.log('To verify the character has the decrypted data, ask about the specific information');
        console.log(`For example: "What do you know about ${Object.keys(decryptedData).join(', ')}?"`);
        console.log('-------------------------------------------------\n');
        
      } catch (error) {
        console.error('Failed to send message with decrypted data:', error.message);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error starting character:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Is the ElizaOS agent running on port', API_PORT, '?');
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Main function
async function main() {
  const args = parseArgs();
  
  // Try to detect available character directories
  const possibleCharacterDirs = [
    path.join(process.cwd(), 'characters'),
    path.join(process.cwd(), 'packages/agent/characters'),
    path.join(process.cwd(), 'agent/characters'),
    path.join(process.cwd(), 'packages/agent/src/characters'),
    path.join(process.cwd(), 'agent/src/characters')
  ];
  
  let characterDir = null;
  for (const dir of possibleCharacterDirs) {
    if (fs.existsSync(dir)) {
      characterDir = dir;
      console.log(`Found character directory at: ${characterDir}`);
      break;
    }
  }
  
  if (!characterDir) {
    console.error('Could not find character directory. Please check your project structure.');
    process.exit(1);
  }
  
  if (args.privateKey && args.inputFile) {
    try {
      // Decrypt the file
      const decryptedData = await decryptFile(args.privateKey, args.contractAddress, args.inputFile);
      
      // Find the character file path
      const characterPath = path.join(characterDir, `${args.character}.character.json`);
      if (!fs.existsSync(characterPath)) {
        console.error(`Character file not found: ${characterPath}`);
        console.log(`Available characters: ${fs.readdirSync(characterDir)
          .filter(file => file.endsWith('.character.json'))
          .map(file => file.replace('.character.json', ''))
          .join(', ')}`);
        process.exit(1);
      }
      
      // Start the character and then send the decrypted data as a message
      await startCharacter(args.character, decryptedData);
      
    } catch (error) {
      console.error('Process failed:', error.message);
      process.exit(1);
    }
  } else if (args.privateKey || args.inputFile) {
    console.error('Both privateKey (-k) and inputFile (-i) are required for decryption.');
    showHelp();
    process.exit(1);
  } else {
    // Start character without decryption
    await startCharacter(args.character);
  }
}

// Run the main function
main().catch(console.error);

// Run after all script execution is complete
process.on('exit', () => {
  // This will be executed when the script is about to exit
  if (process.exitCode !== 1) { // Only show if not exiting due to an error
    console.log('\n-------------------------------------------------');
    console.log('NEXT STEPS:');
    console.log('-------------------------------------------------');
    console.log('1. Open the ElizaOS interface in your browser');
    console.log('2. Find and select the character you just started');
    console.log('3. Ask the character about the decrypted information');
    console.log('-------------------------------------------------');
  }
}); 