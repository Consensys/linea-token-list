import { normalizeAddress } from '../ethereum';

describe('normalizeAddress', () => {
  it('should return the normalized address for full address', () => {
    const addr = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

    const result = normalizeAddress(addr);

    expect(result).toEqual('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
  });

  it('should pad short address to 20 bytes', () => {
    const shortAddr = '0x111';

    const result = normalizeAddress(shortAddr);

    expect(result).toEqual('0x0000000000000000000000000000000000000111');
  });

  it('should throw error for non-hex string', () => {
    const invalidAddr = 'invalid';

    expect(() => normalizeAddress(invalidAddr)).toThrow('Invalid hex string: invalid');
  });
});
