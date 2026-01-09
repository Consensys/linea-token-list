import { createPublicClient, http, type PublicClient, type Chain } from 'viem';
import { mainnet, linea } from 'viem/chains';
import { logger } from 'src/logger';

/**
 * Public RPC endpoints for Ethereum Mainnet (L1)
 * Order: Infura > Alchemy > QuickNode > Public endpoints
 */
const L1_PUBLIC_ENDPOINTS = [
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
  'https://1rpc.io/eth',
];

/**
 * Public RPC endpoints for Linea Mainnet (L2)
 * Order: Infura > Linea official > Public endpoints
 */
const L2_PUBLIC_ENDPOINTS = ['https://rpc.linea.build', 'https://linea.drpc.org', 'https://1rpc.io/linea'];

/**
 * Attempts to connect to a provider and verify it's working
 * @param url - RPC endpoint URL
 * @param name - Provider name for logging
 * @param chain - Chain configuration
 * @returns PublicClient if connection successful, null otherwise
 */
async function tryClient(url: string, name: string, chain: Chain): Promise<PublicClient | null> {
  try {
    const client = createPublicClient({
      chain,
      transport: http(url, { timeout: 10_000 }),
    });
    // Test the connection by getting the chain ID
    await client.getChainId();
    logger.info(`Successfully connected to ${name}`, { url: url.replace(/\/[^/]*$/, '/***') });
    return client;
  } catch {
    logger.warn(`Failed to connect to ${name}`, { url: url.replace(/\/[^/]*$/, '/***') });
    return null;
  }
}

/**
 * Creates a client with fallback chain for L1 (Ethereum Mainnet)
 * Priority: PROVIDER_URL env var > Infura > Alchemy > QuickNode > Public endpoints
 * @param envUrl - URL from environment variable (optional)
 * @returns PublicClient
 * @throws Error if no provider is available
 */
export async function createL1Client(envUrl?: string): Promise<PublicClient> {
  const endpoints: Array<{ url: string; name: string }> = [];

  // Priority 1: Environment variable (Infura or custom)
  if (envUrl) {
    endpoints.push({ url: envUrl, name: 'Environment (PROVIDER_URL)' });
  }

  // Priority 2-N: Public endpoints as fallback
  L1_PUBLIC_ENDPOINTS.forEach((url, index) => {
    endpoints.push({ url, name: `L1 Public Endpoint ${index + 1}` });
  });

  for (const { url, name } of endpoints) {
    const client = await tryClient(url, name, mainnet);
    if (client) {
      return client;
    }
  }

  throw new Error(
    'Unable to connect to any L1 provider. Please check your network connection or provide a valid PROVIDER_URL.'
  );
}

/**
 * Creates a client with fallback chain for L2 (Linea Mainnet)
 * Priority: LINEA_PROVIDER_URL env var > Linea official > Public endpoints
 * @param envUrl - URL from environment variable (optional)
 * @returns PublicClient
 * @throws Error if no provider is available
 */
export async function createL2Client(envUrl?: string): Promise<PublicClient> {
  const endpoints: Array<{ url: string; name: string }> = [];

  // Priority 1: Environment variable (Infura or custom)
  if (envUrl) {
    endpoints.push({ url: envUrl, name: 'Environment (LINEA_PROVIDER_URL)' });
  }

  // Priority 2-N: Public endpoints as fallback
  L2_PUBLIC_ENDPOINTS.forEach((url, index) => {
    endpoints.push({ url, name: `L2 Public Endpoint ${index + 1}` });
  });

  for (const { url, name } of endpoints) {
    const client = await tryClient(url, name, linea);
    if (client) {
      return client;
    }
  }

  throw new Error(
    'Unable to connect to any L2 provider. Please check your network connection or provide a valid LINEA_PROVIDER_URL.'
  );
}

/**
 * Creates both L1 and L2 clients with fallback chains
 * @param l1EnvUrl - L1 URL from environment variable (optional)
 * @param l2EnvUrl - L2 URL from environment variable (optional)
 * @returns Object containing both clients
 */
export async function createClients(
  l1EnvUrl?: string,
  l2EnvUrl?: string
): Promise<{ l1Client: PublicClient; l2Client: PublicClient }> {
  logger.info('Initializing clients with fallback chain...');

  const [l1Client, l2Client] = await Promise.all([createL1Client(l1EnvUrl), createL2Client(l2EnvUrl)]);

  return { l1Client, l2Client };
}
