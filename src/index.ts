import MevShareClient, { IPendingTransaction } from '@flashbots/mev-share-client'
import { Contract, JsonRpcProvider, Wallet } from 'ethers'
import { UNISWAP_FACTORY_ABI } from './abi'

require('dotenv').config()

// Configuration
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545'
const FB_REPUTATION_PRIVATE_KEY = process.env.FB_REPUTATION_KEY || Wallet.createRandom().privateKey
const UNISWAP_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'

// Setup
const provider = new JsonRpcProvider(RPC_URL)
const authSigner = new Wallet(FB_REPUTATION_PRIVATE_KEY, provider)
const uniswapFactoryContract = new Contract(UNISWAP_FACTORY_ADDRESS, UNISWAP_FACTORY_ABI, provider)
const mevShareClient = MevShareClient.useEthereumMainnet(authSigner)

// Tokens
const tokens: {[index: string]: string} = {
    'usdc': '0x7EA2be2df7BA6E54B1A9C70676f668455E329d29',
    'weth': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    'grt': '0xc944E90C64B2c07662A292be6244BDf05Cda44a7',
    'wbtc': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    'usdt': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'dai': '0x6B175474E89094C44Da98b954EedeAC495271d0F'
}

// Pair type
type Pair = {
    sellToken: string,
    buyToken: string,
    pairAddress: string,
    sellTokenName: string,
    buyTokenName: string
}

// Check if a transaction is related to a specific pair
function transactionIsRelatedToPair( pendingTx: IPendingTransaction, pairAddress: string ) {
    return pendingTx.to === pairAddress || ((pendingTx.logs || []).some(log => log.address === pairAddress))
}

// Main function
async function main() {
    let pairs: Pair[] = []

    // Generate all possible pairs from the tokens list
    for (const sellTokenName in tokens) {
        for (const buyTokenName in tokens) {
            if (sellTokenName !== buyTokenName) {
                const pairAddress = (await uniswapFactoryContract.getPair(tokens[sellTokenName], tokens[buyTokenName])).toLowerCase()
                pairs.push({ sellToken: tokens[sellTokenName], buyToken: tokens[buyTokenName], pairAddress, sellTokenName, buyTokenName })
            }
        }
    }

    // Transaction event listener
    mevShareClient.on('transaction', async ( pendingTx: IPendingTransaction ) => {
        for (const pair of pairs) {
            if (transactionIsRelatedToPair(pendingTx, pair.pairAddress)) {
                // Log transaction details if it is related to one of the pairs
                console.log(`It's a match: ${ pendingTx.hash } for pair ${ pair.sellTokenName } / ${ pair.buyTokenName }`)
                console.log('tx.hash: ' + pendingTx.hash)
                console.log('tx.logs: ', pendingTx.logs)
                console.log('tx.to: ' + pendingTx.to)
                console.log('tx.functionSelector: ' + pendingTx.functionSelector)
                console.log('tx.callData: ' + pendingTx.callData)
                console.log('\n')
                break
            } else {
                // Just to show that the script is running
                // console.log('No match: ' + pendingTx.hash)
            }
        }
    })
}

// Run the main function
main()
