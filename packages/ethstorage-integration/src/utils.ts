import { ethers } from 'ethers';
import * as crypto from 'crypto';

/**
 * Creates an Ethereum wallet instance from a private key
 * @param privateKey The private key string
 * @returns A Wallet instance
 */
export function createWalletFromPrivateKey(privateKey: string): ethers.Wallet {
  return new ethers.Wallet(privateKey);
}

/**
 * Generates a random Ethereum wallet
 * @returns A new random Wallet instance
 */
export function generateRandomWallet(): any {
  // Using 'any' to avoid type conflicts between HDNodeWallet and Wallet
  return ethers.Wallet.createRandom();
}

/**
 * Encrypts data using AES-256-GCM
 * @param data The data to encrypt
 * @param encryptionKey The encryption key
 * @returns The encrypted data as a Buffer
 */
export function encryptData(data: Buffer, encryptionKey: string): Buffer {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(data),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Format: IV (16 bytes) + Auth Tag (16 bytes) + Encrypted Data
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypts data using AES-256-GCM
 * @param encryptedData The encrypted data
 * @param encryptionKey The encryption key
 * @returns The decrypted data as a Buffer
 */
export function decryptData(encryptedData: Buffer, encryptionKey: string): Buffer {
  const iv = encryptedData.subarray(0, 16);
  const authTag = encryptedData.subarray(16, 32);
  const encrypted = encryptedData.subarray(32);
  
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
}

/**
 * Computes the SHA-256 hash of the data
 * @param data The data to hash
 * @returns The hash as a hex string
 */
export function computeContentHash(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes The file size in bytes
 * @returns A human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
} 