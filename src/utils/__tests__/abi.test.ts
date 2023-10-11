import fs from 'fs';
import { logger } from 'src/logger';
import { loadABI } from 'src/utils/abi';

// Mock the fs module
jest.mock('fs');

// Mock the logger module
jest.mock('src/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('loadABI', () => {
  it('should load and parse ABI from file system', () => {
    const mockAbi = { some: 'abi' };
    const mockPath = './path/to/abi';

    // Mock fs.readFileSync to return a JSON string
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockAbi));

    const result = loadABI(mockPath);

    expect(result).toEqual(mockAbi);
    expect(fs.readFileSync).toHaveBeenCalledWith(mockPath);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should log an error and throw if ABI loading fails', () => {
    const mockPath = './path/to/abi';
    const mockError = new Error('File not found');

    // Mock fs.readFileSync to throw an error
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw mockError;
    });

    expect(() => loadABI(mockPath)).toThrowError(mockError);

    // Check the error is logged
    expect(logger.error).toHaveBeenCalledWith('Error loading ABI', { from: mockPath }, { error: mockError });
  });
});
