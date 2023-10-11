import fs from 'fs';
import { logger } from 'src/logger';

/**
 * Reads a JSON file
 * @param filePath
 * @returns
 */
export const readJsonFile = (filePath: string): any => {
  try {
    return JSON.parse(fs.readFileSync(filePath).toString());
  } catch (error) {
    logger.error(`Error reading file: ${error}`);
    throw error;
  }
};

/**
 * Saves a JSON file
 * @param filePath
 * @param data
 */
export const saveJsonFile = (filePath: string, data: any): void => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error(`Error writing file: ${error}`);
    throw error;
  }
};
