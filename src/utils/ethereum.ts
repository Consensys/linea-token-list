import { getAddress, pad, type Address, type Hex } from 'viem';

/**
 * Normalizes an address by padding it to 20 bytes and checksumming it.
 * Used for short-form addresses like 0x111 (reserved status).
 * @param addr - Address to normalize (can be short form like 0x111)
 * @returns Checksummed address
 */
export const normalizeAddress = (addr: string): Address => {
  if (!addr.startsWith('0x')) {
    throw new Error(`Invalid hex string: ${addr}`);
  }
  const paddedAddress = pad(addr as Hex, { size: 20 });
  return getAddress(paddedAddress);
};
