import { getCurrentDate } from 'src/utils/date';
import { format } from 'date-fns';

describe('getCurrentDate', () => {
  it('should return the current date in yyyy-MM-dd format', () => {
    const actualDate = new Date();
    const expectedResult = format(actualDate, 'yyyy-MM-dd');

    const result = getCurrentDate();

    expect(result).toEqual(expectedResult);
  });
});
