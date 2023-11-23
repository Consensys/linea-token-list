import { format } from 'date-fns';

/**
 * Returns the current date in the format yyyy-MM-dd
 * @returns
 */
export const getCurrentDate = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};
