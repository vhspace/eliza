/**
 * EthStorage Configuration
 * Contains the official endpoints from the EthStorage documentation
 * Source: https://docs.ethstorage.io/information
 */

// Official EthStorage endpoints from documentation
export const ETHSTORAGE_CONFIG = {
  // ES-Geth RPC endpoint
  RPC_URL: "http://65.108.236.27:9540",
  
  // Blob Archiver API endpoint
  BLOB_ARCHIVER_API: "http://65.108.236.27:9645",
  
  // Storage contract address
  CONTRACT_ADDRESS: "0x804C520d3c084C805E37A35E90057Ac32831F96f"
};

/**
 * Get the EthStorage configuration
 * @returns The official EthStorage configuration
 */
export function getEthStorageConfig() {
  return ETHSTORAGE_CONFIG;
}

export default ETHSTORAGE_CONFIG; 