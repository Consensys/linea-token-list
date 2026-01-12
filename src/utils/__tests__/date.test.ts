import { getCurrentDate } from 'src/utils/date';

describe('getCurrentDate', () => {
  it('should return the current date in yyyy-MM-dd format', () => {
    const result = getCurrentDate();

    // Verify format matches yyyy-MM-dd
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Verify it's today's date
    const today = new Date().toISOString().split('T')[0];
    expect(result).toEqual(today);
  });
});
