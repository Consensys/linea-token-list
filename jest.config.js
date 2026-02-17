module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*\\.(test|spec)\\.ts?$)|(\\.(test|spec)\\.ts?$)',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^root/(.*)$': '<rootDir>/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/scripts/dist/'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!**/node_modules/**', '!**/dist/**', '!**/tests/**'],
};
