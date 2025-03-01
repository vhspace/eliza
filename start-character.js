#!/usr/bin/env node

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Default character to start
const DEFAULT_CHARACTER = 'mediaexpert';

async function startCharacter(characterName) {
  const characterPath = path.join(process.cwd(), 'characters', `${characterName}.character.json`);
  
  // Check if the character file exists
  if (!fs.existsSync(characterPath)) {
    console.error(`Character file not found: ${characterPath}`);
    console.log(`Available characters: ${fs.readdirSync(path.join(process.cwd(), 'characters'))
      .filter(file => file.endsWith('.character.json'))
      .map(file => file.replace('.character.json', ''))
      .join(', ')}`);
    process.exit(1);
  }

  try {
    // API endpoint - using port 3001 since the server automatically switches to it when 3000 is in use
    const apiUrl = 'http://localhost:3001/agent/start';
    
    // Send request to start the character
    console.log(`Starting character: ${characterName}`);
    const response = await axios.post(apiUrl, {
      characterPath: characterPath
    });

    console.log('Character started successfully:');
    console.log(`ID: ${response.data.id}`);
    console.log(`Name: ${response.data.character.name}`);
    return response.data;
  } catch (error) {
    console.error('Error starting character:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Get character name from command line arguments or use default
const characterName = process.argv[2] || DEFAULT_CHARACTER;
startCharacter(characterName).catch(console.error); 