import * as LitJsSdk from '@lit-protocol/lit-node-client';
import { LIT_NETWORK, LIT_ABILITY } from '@lit-protocol/constants';
import { decryptToString } from '@lit-protocol/encryption';
import { 
  createSiweMessageWithRecaps, 
  generateAuthSig, 
  LitAccessControlConditionResource 
} from '@lit-protocol/auth-helpers';
import axios from 'axios';
import { ethers } from 'ethers';

export interface DecryptedFile {
  fileID: string;
  content: string;
}

export interface EncryptedFile {
  fileID: string;
  cipherText: string;
  hash: string;
}

export interface LitServiceConfig {
  contractAddress: string;
  helperApiUrl: string;
  chain: string;
}

export class LitProtocolService {
  private litNodeClient: LitJsSdk.LitNodeClient;
  private config: LitServiceConfig;
  
  constructor(config: LitServiceConfig) {
    this.config = config;
    this.litNodeClient = new LitJsSdk.LitNodeClient({
      litNetwork: LIT_NETWORK.DatilDev,
    });
  }

  /**
   * Connects to the Lit Protocol network
   */
  async connect(): Promise<void> {
    await this.litNodeClient.connect();
  }

  /**
   * Disconnects from the Lit Protocol network
   */
  async disconnect(): Promise<void> {
    await this.litNodeClient.disconnect();
  }

  /**
   * Delegates capacity from the Lit Protocol helper service
   * @param userAddress Ethereum address of the user
   * @returns Capacity delegation auth signature
   */
  async delegateCapacity(userAddress: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.config.helperApiUrl}/delegate-capacity`,
        { userAddress },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.data || !response.data.delegationAuthSig) {
        throw new Error('Failed to get delegation auth signature');
      }
      
      return response.data.delegationAuthSig;
    } catch (error) {
      console.error('Error delegating capacity:', error);
      throw error;
    }
  }

  /**
   * Gets session signatures for Lit Protocol operations
   * @param capacityDelegationAuthSig Delegation auth signature
   * @param signer Ethereum signer
   * @param signerAddress Ethereum address of the signer
   * @returns Session signatures
   */
  async getSessionSignatures(
    capacityDelegationAuthSig: any, 
    signer: ethers.Signer, 
    signerAddress: string
  ): Promise<any> {
    try {
      const latestBlockhash = await this.litNodeClient.getLatestBlockhash();
      
      const authNeededCallback = async (params: any) => {
        if (!params.uri) {
          throw new Error('uri is required');
        }
        if (!params.expiration) {
          throw new Error('expiration is required');
        }
        if (!params.resourceAbilityRequests) {
          throw new Error('resourceAbilityRequests is required');
        }
        
        const toSign = await createSiweMessageWithRecaps({
          uri: params.uri,
          expiration: params.expiration,
          resources: params.resourceAbilityRequests,
          walletAddress: signerAddress,
          nonce: latestBlockhash,
          litNodeClient: this.litNodeClient,
        });
        
        const authSig = await generateAuthSig({
          signer,
          address: signerAddress,
          toSign,
        });
        
        return authSig;
      };
      
      const litResource = new LitAccessControlConditionResource('*');
      
      const sessionSigs = await this.litNodeClient.getSessionSigs({
        chain: this.config.chain,
        resourceAbilityRequests: [
          {
            resource: litResource,
            ability: LIT_ABILITY.AccessControlConditionDecryption,
          },
        ],
        authNeededCallback,
        capacityDelegationAuthSig,
      });
      
      return sessionSigs;
    } catch (error) {
      console.error('Error getting session signatures:', error);
      throw error;
    }
  }

  /**
   * Decrypts a file using Lit Protocol
   * @param encryptedFile Encrypted file data
   * @param capacityDelegationAuthSig Delegation auth signature
   * @param signer Ethereum signer
   * @param signerAddress Ethereum address of the signer
   * @returns Decrypted file content
   */
  async decryptFile(
    encryptedFile: EncryptedFile,
    capacityDelegationAuthSig: any,
    signer: ethers.Signer,
    signerAddress: string
  ): Promise<string> {
    try {
      const sessionSigs = await this.getSessionSignatures(
        capacityDelegationAuthSig,
        signer,
        signerAddress
      );
      
      const evmContractConditions = [
        {
          contractAddress: this.config.contractAddress,
          functionName: 'hasAccess',
          functionParams: [encryptedFile.fileID, ':userAddress'],
          functionAbi: {
            inputs: [
              {
                internalType: 'string',
                name: 'cid',
                type: 'string',
              },
              {
                internalType: 'address',
                name: 'requestor',
                type: 'address',
              },
            ],
            name: 'hasAccess',
            outputs: [
              {
                internalType: 'bool',
                name: '',
                type: 'bool',
              },
            ],
            stateMutability: 'view',
            type: 'function',
          },
          chain: this.config.chain,
          returnValueTest: {
            key: '',
            comparator: '=',
            value: 'true',
          },
        },
      ];
      
      const decryptedString = await decryptToString(
        {
          evmContractConditions,
          chain: this.config.chain,
          ciphertext: encryptedFile.cipherText,
          dataToEncryptHash: encryptedFile.hash,
          sessionSigs,
        },
        this.litNodeClient
      );
      
      return decryptedString;
    } catch (error) {
      console.error('Error decrypting file:', error);
      throw error;
    }
  }

  /**
   * Decrypts multiple files using Lit Protocol
   * @param encryptedFiles Array of encrypted file data
   * @param signer Ethereum signer
   * @param signerAddress Ethereum address of the signer
   * @returns Array of decrypted files
   */
  async decryptFiles(
    encryptedFiles: EncryptedFile[],
    signer: ethers.Signer,
    signerAddress: string
  ): Promise<DecryptedFile[]> {
    try {
      await this.connect();
      
      const delegationAuthSig = await this.delegateCapacity(signerAddress);
      const decryptedFiles: DecryptedFile[] = [];
      
      for (const encryptedFile of encryptedFiles) {
        const decryptedContent = await this.decryptFile(
          encryptedFile,
          delegationAuthSig,
          signer,
          signerAddress
        );
        
        decryptedFiles.push({
          fileID: encryptedFile.fileID,
          content: decryptedContent,
        });
      }
      
      await this.disconnect();
      return decryptedFiles;
    } catch (error) {
      console.error('Error decrypting files:', error);
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Fetches encrypted files from ethstorage
   * @param apiUrl API URL for the ethstorage service
   * @param fileIds Array of file IDs to fetch
   * @returns Array of encrypted files
   */
  async fetchEncryptedFiles(fileIds: string[]): Promise<EncryptedFile[]> {
    try {
      const encryptedFiles: EncryptedFile[] = [];
      
      for (const fileId of fileIds) {
        const response = await axios.get(
          `${this.config.helperApiUrl}/get-file/${fileId}`
        );
        
        if (response.data && response.data.cipherText && response.data.hash) {
          encryptedFiles.push({
            fileID: fileId,
            cipherText: response.data.cipherText,
            hash: response.data.hash,
          });
        }
      }
      
      return encryptedFiles;
    } catch (error) {
      console.error('Error fetching encrypted files:', error);
      throw error;
    }
  }
} 