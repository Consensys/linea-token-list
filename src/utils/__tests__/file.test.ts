import fs from 'fs';
import { logger } from 'src/logger';
import { readJsonFile, saveJsonFile } from 'src/utils/file';

// Mocking dependencies
jest.mock('fs');
jest.mock('src/logger');

describe('File Utils', () => {
  describe('readJsonFile', () => {
    it('should return parsed JSON when file is read successfully', () => {
      // Setup
      const fakePath = 'fakePath.json';
      const fakeData = { key: 'value' };
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fakeData));

      // Execute
      const data = readJsonFile(fakePath);

      // Assert
      expect(data).toEqual(fakeData);
      expect(fs.readFileSync).toHaveBeenCalledWith(fakePath);
    });

    it('should log error and throw when reading file fails', () => {
      // Setup
      const fakePath = 'fakePath.json';
      const error = new Error('File not found');
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw error;
      });
      const errorSpy = jest.spyOn(logger, 'error');

      // Execute & Assert
      expect(() => readJsonFile(fakePath)).toThrowError(error);
      expect(errorSpy).toHaveBeenCalledWith(`Error reading file: ${error}`);
    });
  });

  describe('saveJsonFile', () => {
    it('should save stringified JSON data to file', () => {
      // Setup
      const fakePath = 'fakePath.json';
      const fakeData = { key: 'value' };

      // Execute
      saveJsonFile(fakePath, fakeData);

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledWith(fakePath, JSON.stringify(fakeData, null, 2));
    });

    it('should log error and throw when writing to file fails', () => {
      // Setup
      const fakePath = 'fakePath.json';
      const fakeData = { key: 'value' };
      const error = new Error('Disk full');
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw error;
      });
      const errorSpy = jest.spyOn(logger, 'error');

      // Execute & Assert
      expect(() => saveJsonFile(fakePath, fakeData)).toThrowError(error);
      expect(errorSpy).toHaveBeenCalledWith(`Error writing file: ${error}`);
    });
  });
});
