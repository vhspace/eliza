import { Wallet } from 'ethers';
import { ethers } from 'ethers';

/**
 * Configuration options for the EthStorage provider
 */
export interface EthStorageConfig {
  /**
   * EthStorage RPC URL
   */
  rpcUrl: string;
  
  /**
   * Ethereum wallet for authentication and transactions
   * Can be a private key string or a Wallet instance
   */
  wallet: string | Wallet;
  
  /**
   * Optional encryption key for content encryption/decryption
   * If not provided, content will be stored unencrypted
   */
  encryptionKey?: string;
  
  /**
   * Whether to use Lit Protocol for encryption
   * If true, encryptionKey is ignored and Lit Protocol is used instead
   */
  useLitProtocol?: boolean;
  
  /**
   * Optional Lit Protocol access control conditions
   * Only used if useLitProtocol is true
   */
  litAccessControlConditions?: any;
}

/**
 * Metadata for files stored in EthStorage
 */
export interface EthStorageFileMetadata {
  /**
   * The name of the file
   */
  filename: string;
  
  /**
   * The size of the file in bytes
   */
  size: number;
  
  /**
   * The content type of the file
   */
  contentType: string;
  
  /**
   * The date the file was created
   */
  createdAt: Date;
  
  /**
   * The date the file was last modified
   */
  lastModified: Date;
  
  /**
   * Whether the file is encrypted
   */
  isEncrypted: boolean;
  
  /**
   * The SHA-256 hash of the file content
   */
  contentHash: string;
}

/**
 * Response when uploading a file to EthStorage
 */
export interface UploadResponse {
  /**
   * Reference ID for the uploaded file
   */
  id: string;
  
  /**
   * Transaction hash of the upload transaction
   */
  txHash: string;
  
  /**
   * Metadata of the uploaded file
   */
  metadata: EthStorageFileMetadata;
}

/**
 * Types for EthStorage integration
 */

/**
 * Configuration options for the EthStorage client
 */
export interface EthStorageClientConfig {
  /**
   * RPC URL for the Ethereum network
   */
  rpcUrl: string;
  
  /**
   * Private key for the wallet to use with EthStorage
   * Can be provided as either a string or an ethers Wallet instance
   */
  privateKey?: string;
  
  /**
   * Optional wallet instance to use instead of creating one from privateKey
   */
  wallet?: ethers.Wallet;
  
  /**
   * Contract address for the EthStorage contract
   */
  contractAddress?: string;
}

/**
 * Interface for stored file metadata
 */
export interface StoredFileInfo {
  /**
   * File name
   */
  name: string;
  
  /**
   * File size in bytes
   */
  size: number;
  
  /**
   * MIME type of the file
   */
  contentType: string;
  
  /**
   * Timestamp when the file was uploaded
   */
  timestamp: number;
  
  /**
   * File identifier in EthStorage
   */
  fileId: string;
}

/**
 * Result of an upload operation
 */
export interface UploadResult {
  /**
   * Whether the upload was successful
   */
  success: boolean;
  
  /**
   * File identifier in EthStorage
   */
  fileId?: string;
  
  /**
   * Transaction hash of the upload transaction
   */
  txHash?: string;
  
  /**
   * Error message if the upload failed
   */
  error?: string;
}

/**
 * Result of a download operation
 */
export interface DownloadResult {
  /**
   * Whether the download was successful
   */
  success: boolean;
  
  /**
   * File data as a Uint8Array or Buffer
   */
  data?: Uint8Array | Buffer;
  
  /**
   * File name
   */
  fileName?: string;
  
  /**
   * File metadata (optional)
   */
  metadata?: StoredFileInfo;
  
  /**
   * Error message if the download failed
   */
  error?: string;
} 