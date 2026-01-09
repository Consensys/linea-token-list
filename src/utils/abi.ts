import fs from 'fs';
import { logger } from 'src/logger';
import type { Abi } from 'viem';

/**
 * Loads an ABI from a file
 * @param abiPath - Path to the ABI JSON file
 * @returns Parsed ABI
 */
export const loadABI = (abiPath: string): Abi => {
  try {
    return JSON.parse(fs.readFileSync(abiPath).toString()) as Abi;
  } catch (error) {
    logger.error('Error loading ABI', { from: abiPath }, { error });
    throw error;
  }
};
