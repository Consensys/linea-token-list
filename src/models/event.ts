import { Event } from 'ethers';

export interface EventCustom extends Event {
  chainId?: number;
}
