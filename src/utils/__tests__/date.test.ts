import { getCurrentDate } from 'src/utils/date';

// Mocking date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn(() => '2023-10-11'),
}));

describe('getCurrentDate', () => {
  it('should return the current date in yyyy-MM-dd format', () => {
    const result = getCurrentDate();
    expect(result).toEqual('2023-10-11');
  });
});
