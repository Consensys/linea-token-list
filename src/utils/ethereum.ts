import { ethers } from 'ethers';

export const normalizeAddress = (addr: string) => {
  const paddedAddress = ethers.utils.hexZeroPad(addr, 20); // 20 bytes for Ethereum address
  return ethers.utils.getAddress(paddedAddress);
};
