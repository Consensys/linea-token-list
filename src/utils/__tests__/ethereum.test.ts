import { normalizeAddress } from '../ethereum';

describe('normalizeAddress', () => {
  it('should return the normalized address', () => {
    const addr = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

    const result = normalizeAddress(addr);

    expect(result).toEqual('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
  });

  it('should throw error for invalid address', () => {
    const invalidAddr = 'invalid';

    expect(() => normalizeAddress(invalidAddr)).toThrow();
  });
});
