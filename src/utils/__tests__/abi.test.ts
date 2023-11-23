import fs from 'fs';
import { logger } from 'src/logger';
import { loadABI } from 'src/utils/abi';

jest.mock('fs');
jest.mock('src/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('loadABI', () => {
  it('should load and parse ABI from file system', () => {
    const mockAbi = { some: 'abi' };
    const mockPath = './path/to/abi';

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockAbi));

    const result = loadABI(mockPath);

    expect(result).toEqual(mockAbi);
    expect(fs.readFileSync).toHaveBeenCalledWith(mockPath);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should log an error and throw if ABI loading fails', () => {
    const mockPath = './path/to/abi';
    const mockError = new Error('File not found');

    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw mockError;
    });

    expect(() => loadABI(mockPath)).toThrowError(mockError);

    expect(logger.error).toHaveBeenCalledWith('Error loading ABI', { from: mockPath }, { error: mockError });
  });
});
