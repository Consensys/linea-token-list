import fs from 'fs';
import { logger } from 'src/logger';
import { ContractInterface } from 'ethers';

/**
 * Loads an ABI from a file
 * @param abiPath
 * @returns
 */
export const loadABI = (abiPath: string): ContractInterface => {
  try {
    const abi = JSON.parse(fs.readFileSync(abiPath).toString());
    return abi;
  } catch (error) {
    logger.error('Error loading ABI', { from: abiPath }, { error });
    throw error;
  }
};
