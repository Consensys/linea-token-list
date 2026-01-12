import { Token, Version } from 'src/models/token';

/**
 * Returns the token address from the mapping
 * @param versions
 * @returns
 */
export const getBumpedVersions = (versions: Version[]): Version[] => {
  const [currentVersion] = versions;
  return [
    {
      ...currentVersion,
      minor: currentVersion.minor + 1,
    },
  ];
};

/**
 * Sorts tokens alphabetically by their name field
 * @param tokenList - Array of tokens to sort
 * @returns A new sorted array (does not mutate the original)
 */
export const sortTokensByName = (tokenList: Token[]): Token[] => {
  return [...tokenList].sort((a, b) => a.name.localeCompare(b.name));
};
