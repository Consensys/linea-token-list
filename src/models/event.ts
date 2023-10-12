import { Event } from 'ethers';

export interface EventExtended extends Event {
  chainId: number;
}
