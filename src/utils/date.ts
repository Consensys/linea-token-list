/**
 * Returns the current date in the format yyyy-MM-dd
 * @returns
 */
export const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};
