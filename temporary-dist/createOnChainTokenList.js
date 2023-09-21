"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const winston_1 = require("winston");
require('dotenv').config();
// Logger
const logger = (0, winston_1.createLogger)({
    level: 'info',
    format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.timestamp(), winston_1.format.json()),
    transports: [new winston_1.transports.Console()],
});
// Configuration
const config = {
    PROVIDER_URL: process.env.PROVIDER_URL,
    LINEA_PROVIDER_URL: process.env.LINEA_PROVIDER_URL,
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '0x051F1D88f0aF5763fB888eC4378b4D8B29ea3319',
    L2_CONTRACT_ADDRESS: process.env.L2_CONTRACT_ADDRESS || '0x353012dc4a9A6cF55c941bADC267f82004A8ceB9',
    CONTRACT_ABI_PATH: 'scripts/abi/token-bridge-abi.json',
    ERC20_ABI_PATH: 'scripts/abi/ERC20-abi.json',
    ERC20_BYTE32_ABI_PATH: 'scripts/abi/ERC20-byte32-abi.json',
    TOKEN_LIST_PATH: 'json/linea-mainnet-token-fulllist.json',
};
// Providers
const provider = new ethers_1.ethers.providers.JsonRpcProvider(config.PROVIDER_URL);
const lineaProvider = new ethers_1.ethers.providers.JsonRpcProvider(config.LINEA_PROVIDER_URL);
// Load contract ABIs
const contractABI = loadABI(config.CONTRACT_ABI_PATH);
const erc20ContractABI = loadABI(config.ERC20_ABI_PATH);
const erc20Byte32ContractABI = loadABI(config.ERC20_BYTE32_ABI_PATH);
// Contract instances
const contract = new ethers_1.ethers.Contract(config.CONTRACT_ADDRESS, contractABI, provider);
const l2Contract = new ethers_1.ethers.Contract(config.L2_CONTRACT_ADDRESS, contractABI, lineaProvider);
// Event filters
const newTokenEventFilter = contract.filters.NewToken();
const newTokenDeployedEventFilter = contract.filters.NewTokenDeployed();
// Token info storage
const tokenInfoArray = [];
const uniqueTokenAddresses = new Set();
// Read existing token list
const existingTokenList = readExistingTokenList();
if (!existingTokenList.tokens) {
    existingTokenList.tokens = [];
}
// Add existing tokens to the set
for (const token of existingTokenList.tokens) {
    if (token.chainId === 59144) {
        uniqueTokenAddresses.add(ethers_1.ethers.utils.getAddress((_a = token.extension) === null || _a === void 0 ? void 0 : _a.rootAddress));
    }
    else if (token.chainId === 1) {
        uniqueTokenAddresses.add(ethers_1.ethers.utils.getAddress(token.address));
    }
}
// Main function
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const newTokenEvents = yield contract.queryFilter(newTokenEventFilter);
            const newTokenDeployedEvents = yield contract.queryFilter(newTokenDeployedEventFilter);
            yield processTokenEvents(newTokenEvents);
            yield processTokenEvents(newTokenDeployedEvents, true);
            updateTokenList(tokenInfoArray);
        }
        catch (error) {
            logger.error(`Error while reading events: ${error}`);
            throw error;
        }
    });
}
// Process token events
function processTokenEvents(events, isDeployedEvent = false) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const event of events) {
            try {
                const { tokenAddress, nativeTokenAddress } = getEventTokenAddresses(event, isDeployedEvent);
                const tokenInfo = yield getERC20Token(tokenAddress);
                if (tokenInfo) {
                    logger.info(tokenInfo);
                    const tokenAddressLowerCase = ethers_1.ethers.utils.getAddress(tokenAddress);
                    const LINEA_MAINNET_CHAIN_ID = 59144;
                    const ETHEREUM_MAINNET_CHAIN_ID = 1;
                    if (isDeployedEvent) {
                        tokenInfo.address = tokenAddress;
                        tokenInfo.chainId = ETHEREUM_MAINNET_CHAIN_ID;
                        tokenInfo.chainURI = 'https://etherscan.io/block/0';
                        tokenInfo.tokenId = `https://etherscan.io/address/${tokenAddress}`;
                        if (tokenInfo.extension && nativeTokenAddress) {
                            tokenInfo.extension.rootChainId = LINEA_MAINNET_CHAIN_ID;
                            tokenInfo.extension.rootChainURI = 'https://lineascan.build/block/0';
                            tokenInfo.extension.rootAddress = nativeTokenAddress;
                        }
                    }
                    else {
                        const address = yield getTokenAddressFromMapping(tokenAddressLowerCase);
                        tokenInfo.address = address;
                        tokenInfo.tokenId = `https://lineascan.build/address/${address}`;
                        if (tokenInfo.chainId === 1) {
                            uniqueTokenAddresses.add(ethers_1.ethers.utils.getAddress(tokenInfo.address)); // Add address when chainId is 1
                        }
                    }
                    if (tokenAddressLowerCase && !uniqueTokenAddresses.has(tokenAddressLowerCase)) {
                        uniqueTokenAddresses.add(tokenAddressLowerCase);
                        tokenInfoArray.push(tokenInfo);
                    }
                }
            }
            catch (error) {
                logger.error(`Error processing token event: ${error}`);
                throw error;
            }
        }
    });
}
function getERC20Token(tokenAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield fetchTokenInfo(new ethers_1.ethers.Contract(tokenAddress, erc20ContractABI, provider), tokenAddress);
        }
        catch (error) {
            logger.info(`Error calling contract with ERC20 ABI: ${error}`);
            const tokenContractAlt = new ethers_1.ethers.Contract(tokenAddress, erc20Byte32ContractABI, provider);
            try {
                return yield fetchTokenInfo(tokenContractAlt, tokenAddress, true);
            }
            catch (error) {
                logger.info(`Error calling contract with ERC20 Byte32 ABI: ${error}`);
                return undefined;
            }
        }
    });
}
function getEventTokenAddresses(event, isDeployedEvent) {
    var _a, _b, _c;
    let tokenAddress = (_a = event === null || event === void 0 ? void 0 : event.args) === null || _a === void 0 ? void 0 : _a.token;
    let nativeTokenAddress;
    if (isDeployedEvent) {
        tokenAddress = (_b = event === null || event === void 0 ? void 0 : event.args) === null || _b === void 0 ? void 0 : _b.bridgedToken;
        nativeTokenAddress = (_c = event === null || event === void 0 ? void 0 : event.args) === null || _c === void 0 ? void 0 : _c.nativeToken;
    }
    return { tokenAddress, nativeTokenAddress };
}
// Fetch token info
function fetchTokenInfo(tokenContract, tokenAddress, isERC20Byte32 = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const [symbol, decimals, name] = yield Promise.all([
            tokenContract.symbol(),
            tokenContract.decimals(),
            tokenContract.name(),
        ]);
        let parsedSymbol = symbol;
        let parsedName = name;
        if (isERC20Byte32) {
            // If it's an ERC20 Byte32 contract, parse bytes32 for symbol and name
            parsedSymbol = ethers_1.ethers.utils.parseBytes32String(symbol);
            parsedName = ethers_1.ethers.utils.parseBytes32String(name);
        }
        const tokenInfo = {
            chainId: 59144,
            chainURI: 'https://lineascan.build/block/0',
            tokenId: 'https://lineascan.build/address/',
            tokenType: ['bridged'],
            address: '',
            name: parsedName,
            symbol: parsedSymbol,
            decimals: Number(decimals),
            createdAt: getCurrentDate(),
            updatedAt: getCurrentDate(),
            extension: {
                rootChainId: 1,
                rootChainURI: 'https://etherscan.io',
                rootAddress: tokenAddress,
            },
        };
        try {
            const response = yield axios_1.default.get(`https://api.coingecko.com/api/v3/coins/1/contract/${tokenAddress.toLowerCase()}`);
            const logoURIfromCoingecko = response.data.image.large;
            if (logoURIfromCoingecko) {
                tokenInfo.logoURI = logoURIfromCoingecko;
            }
        }
        catch (error) {
            logger.info(`Error fetching logoURI from CoinGecko: ${error}`);
        }
        return tokenInfo;
    });
}
// Load ABI from file
function loadABI(abiPath) {
    try {
        const abi = JSON.parse(fs_1.default.readFileSync(abiPath).toString());
        return abi;
    }
    catch (error) {
        logger.error(`Error loading ABI from ${abiPath}: ${error}`);
        throw error;
    }
}
// Get current date as string
function getCurrentDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// Update token list
function updateTokenList(tokenInfoArray) {
    var _a;
    try {
        const existingTokenList = readExistingTokenList();
        if (!existingTokenList.tokens) {
            existingTokenList.tokens = [];
        }
        const existingTokenAddresses = new Set();
        for (const token of existingTokenList.tokens) {
            if (token.chainId === 59144) {
                existingTokenAddresses.add(ethers_1.ethers.utils.getAddress((_a = token.extension) === null || _a === void 0 ? void 0 : _a.rootAddress));
            }
            else if (token.chainId === 1) {
                existingTokenAddresses.add(ethers_1.ethers.utils.getAddress(token.address));
            }
        }
        // Filter out tokens that are already in the existing token list
        const newTokens = tokenInfoArray.filter((info) => {
            var _a;
            const addressLowerCase = ethers_1.ethers.utils.getAddress((_a = info.extension) === null || _a === void 0 ? void 0 : _a.rootAddress);
            return addressLowerCase && !existingTokenAddresses.has(addressLowerCase);
        });
        // Check if there are new tokens to add
        if (newTokens.length > 0) {
            existingTokenList.tokens = [...existingTokenList.tokens, ...newTokens];
            existingTokenList.updatedAt = getCurrentDate();
            const versions = existingTokenList.versions[0];
            versions.minor += 1; // Increment the minor version
            saveTokenList(existingTokenList);
        }
    }
    catch (error) {
        logger.error(`Error updating token list: ${error}`);
        throw error;
    }
}
// Read existing token list
function readExistingTokenList() {
    try {
        const existingTokenList = JSON.parse(fs_1.default.readFileSync(config.TOKEN_LIST_PATH).toString());
        return existingTokenList;
    }
    catch (error) {
        logger.error(`Error reading existing token list file: ${error}`);
        return {};
    }
}
// Get token address from mapping
function getTokenAddressFromMapping(nativeAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tokenAddress = yield l2Contract.nativeToBridgedToken(1, nativeAddress);
            return tokenAddress;
        }
        catch (error) {
            logger.error(`Error calling nativeToBridgedToken: ${error}`);
            throw error;
        }
    });
}
// Save token list
function saveTokenList(tokenListData) {
    fs_1.default.writeFileSync(config.TOKEN_LIST_PATH, JSON.stringify(tokenListData, null, 2));
}
// Execute the script
main();
