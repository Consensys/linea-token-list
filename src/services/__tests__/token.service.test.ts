import { providers } from 'ethers';

import { TokenService } from '../token.service';
import { mockExistingTokenList, mockTokenShortlist } from './mockedData';
import { Token } from 'src/models/token';

describe('TokenService', () => {
  let tokenService: TokenService;
  let l1Provider;
  let l2Provider;

  beforeEach(() => {
    l1Provider = new providers.JsonRpcProvider('l1-provider-url');
    l2Provider = new providers.JsonRpcProvider('l2-provider-url');

    tokenService = new TokenService(l1Provider, l2Provider, mockTokenShortlist);
  });

  describe('fetchAndAssignTokenLogo', () => {
    it('should fetch and assign the token logo URI', async () => {
      const token: Token = mockExistingTokenList[0];
      const mockLogoURI = 'https://s2.coinmarketcap.com/static/img/coins/64x64/15024.png';

      const fetchLogoURIMock = jest.spyOn(tokenService, 'fetchAndAssignTokenLogo');
      fetchLogoURIMock.mockResolvedValue(mockExistingTokenList[0]);

      const result = await tokenService.fetchAndAssignTokenLogo(token);

      expect(result?.logoURI).toEqual(mockLogoURI);
    });
  });

  describe('concatTokenShortList', () => {
    it('should add new tokens to the token list', () => {
      tokenService['tokenList'] = [...mockExistingTokenList];

      tokenService.concatTokenShortList(mockTokenShortlist);

      expect(tokenService['tokenList']).toHaveLength(3);
      expect(tokenService['tokenList']).toEqual(
        expect.arrayContaining([
          ...mockExistingTokenList, // Existing token should still be in the list
          mockTokenShortlist.tokens[0], // New token should be added to the list
        ])
      );
    });

    it('should replace existing tokens in the token list if they are different', () => {
      tokenService['tokenList'] = mockExistingTokenList;

      tokenService.concatTokenShortList(mockTokenShortlist);

      expect(tokenService['tokenList']).toHaveLength(3);
      expect(tokenService['tokenList']).toEqual(expect.arrayContaining([mockTokenShortlist.tokens[0]]));
    });

    it('should not modify the token list if existing tokens are the same', () => {
      tokenService['tokenList'] = [...mockExistingTokenList];

      tokenService.concatTokenShortList(mockTokenShortlist);

      expect(tokenService['tokenList']).toHaveLength(3);
      expect(tokenService['tokenList']).toEqual(expect.arrayContaining([...mockExistingTokenList]));
    });
  });
});
