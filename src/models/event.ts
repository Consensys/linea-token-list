/* istanbul ignore file */

import { Event } from 'ethers';

export interface EventExtended extends Event {
  chainId: number;
}
