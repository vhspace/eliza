import { type Plugin, type Provider, type Evaluator, type UUID, type Memory, type IAgentRuntime, type State } from '@elizaos/core';
import adapter from './index';

// Provider that retrieves user facts from EthStorage
const userFactsProvider: Provider = {
  async get(runtime: IAgentRuntime, message: Memory, state?: State): Promise<string> {
    // Get the EthStorage adapter instance
    const ethStorageAdapter = adapter.init(runtime);
    
    // Get the user ID from the message
    const userId = message.userId;
    
    try {
      // In a real implementation, you would:
      // 1. Call getUserFacts to retrieve facts about the user
      // 2. Format them into a readable string
      
      // Placeholder for demonstration
      return `User ${userId} facts:
- Likes: coding, reading, hiking
- Dislikes: spam, waiting in lines
- Birthday: April 15
- Favorite color: blue
- Last visited: Yesterday`;
    } catch (error) {
      console.error('Error getting user facts:', error);
      return '';
    }
  }
};

// Evaluator that identifies when to add a user fact
const addUserFactEvaluator: Evaluator = {
  name: 'addUserFact',
  description: 'Add a new fact about the user that was learned during the conversation',
  similes: [
    'Learn something new about the user',
    'Record user preferences',
    'Save user information',
    'Store user fact'
  ],
  examples: [
    {
      context: 'The bot asks the user about their interests, and the user shares that they like playing piano.',
      messages: [
        {
          user: 'bot',
          content: {
            text: 'What are some of your hobbies or interests?'
          }
        },
        {
          user: 'user',
          content: {
            text: 'I really enjoy playing the piano in my free time. I've been learning for about 3 years now.'
          }
        }
      ],
      outcome: 'addUserFact'
    },
    {
      context: 'The user mentions they dislike a particular food.',
      messages: [
        {
          user: 'bot',
          content: {
            text: 'Have you tried the new Mexican restaurant downtown?'
          }
        },
        {
          user: 'user',
          content: {
            text: 'No, I haven't. To be honest, I don't really like spicy food that much.'
          }
        }
      ],
      outcome: 'addUserFact'
    }
  ],
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Check if the message is from the user (not the agent)
    return message.userId !== message.agentId;
  },
  handler: async (runtime: IAgentRuntime, message: Memory): Promise<any> => {
    // Get the EthStorage adapter instance
    const ethStorageAdapter = adapter.init(runtime);
    
    // Extract information from the message
    const userId = message.userId;
    const messageText = message.content.text;
    
    // In a real implementation, you would:
    // 1. Analyze the message to extract facts (possibly using the LLM)
    // 2. Format the facts into key-value pairs
    // 3. Store them using the adapter
    
    // Here's a simplified, placeholder implementation
    console.log(`Evaluating message for facts: ${messageText}`);
    
    // Placeholder logic to extract a fact (would be more sophisticated in reality)
    if (messageText.toLowerCase().includes('like')) {
      // Example of saving a user preference
      const key = 'preferences.likes';
      const value = messageText.substring(messageText.toLowerCase().indexOf('like') + 5, messageText.length);
      
      // Create the fact object
      const fact = {
        id: `fact-${Date.now()}` as UUID,
        userId,
        key,
        value: value.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Store the fact
      // @ts-ignore - Custom method we added to the adapter
      await ethStorageAdapter.createUserFact(fact);
      
      return {
        fact: { key, value: value.trim() }
      };
    }
    
    return null;
  }
};

// Evaluator that identifies when to update a user fact
const updateUserFactEvaluator: Evaluator = {
  name: 'updateUserFact',
  description: 'Update an existing fact about the user based on new information learned during the conversation',
  similes: [
    'Update user preferences',
    'Change stored user information',
    'Modify user fact',
    'Correct user details'
  ],
  examples: [
    {
      context: 'The user previously mentioned they like rock music, but now they clarify their preference has changed.',
      messages: [
        {
          user: 'bot',
          content: {
            text: 'Last time we spoke, you mentioned you enjoy rock music. Do you have a favorite band?'
          }
        },
        {
          user: 'user',
          content: {
            text: 'Actually, my music taste has changed a bit. I've been getting more into jazz lately.'
          }
        }
      ],
      outcome: 'updateUserFact'
    }
  ],
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Check if the message is from the user (not the agent)
    return message.userId !== message.agentId;
  },
  handler: async (runtime: IAgentRuntime, message: Memory): Promise<any> => {
    // Get the EthStorage adapter instance
    const ethStorageAdapter = adapter.init(runtime);
    
    // Extract information from the message
    const userId = message.userId;
    const messageText = message.content.text;
    
    // In a real implementation, you would:
    // 1. Analyze the message to identify which fact needs updating
    // 2. Retrieve the existing fact
    // 3. Update it with the new information
    
    // Here's a simplified, placeholder implementation
    console.log(`Evaluating message for fact updates: ${messageText}`);
    
    // Placeholder logic to extract a fact update
    if (messageText.toLowerCase().includes('changed') || 
        messageText.toLowerCase().includes('actually') || 
        messageText.toLowerCase().includes('not anymore')) {
      
      // Example of updating a user preference
      const key = 'preferences.likes';
      
      // Retrieve existing fact
      // @ts-ignore - Custom method we added to the adapter
      const existingFact = await ethStorageAdapter.getUserFactByKey(userId, key);
      
      if (existingFact) {
        // Update with new value (simplified logic for demo)
        const value = messageText.split('.')[0]; // Just use the first sentence
        
        // Update the fact
        const updatedFact = {
          ...existingFact,
          value: value.trim(),
          updatedAt: Date.now()
        };
        
        // Store the updated fact
        // @ts-ignore - Custom method we added to the adapter
        await ethStorageAdapter.updateUserFact(updatedFact);
        
        return {
          before: existingFact.value,
          after: value.trim()
        };
      }
    }
    
    return null;
  }
};

// Define and export the plugin
const plugin: Plugin = {
  name: 'ethstorage-user-facts',
  description: 'Plugin for managing user facts in EthStorage',
  providers: [userFactsProvider],
  evaluators: [addUserFactEvaluator, updateUserFactEvaluator],
  adapters: [adapter],
};

export default plugin; 