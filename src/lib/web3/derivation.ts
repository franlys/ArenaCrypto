import { mnemonicToAccount, HDKey } from 'viem/accounts';
import { publicActions, createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';

/**
 * ARENACRYPTO: Professional HD Wallet Derivation
 * This utility handles the generation of unique deposit addresses for gamers.
 * Strategy: BIP44 (m/44'/60'/0'/0/index)
 */

const MNEMONIC = process.env.HD_WALLET_MNEMONIC || ''; 

export function deriveUserAddress(index: number): string {
  if (!MNEMONIC) {
    throw new Error("Missing HD_WALLET_MNEMONIC in environment variables.");
  }

  // Derive account using the BIP44 path for Ethereum/Polygon
  const account = mnemonicToAccount(MNEMONIC, {
    addressIndex: index,
  });

  return account.address;
}

/**
 * Note: For production, we should only use the xPub on the server 
 * to derive addresses, keeping the Mnemonic completely offline.
 * This implementation uses the mnemonic for development convenience.
 */
