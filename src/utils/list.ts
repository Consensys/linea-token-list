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
 * Returns the token address from the mapping
 * @param tokenList
 * @returns
 */
export const sortAlphabetically = (tokenList: Token[]): Token[] => {
  return [...tokenList].sort((a, b) => a.name.localeCompare(b.name));
};
