import assert from 'assert';

import {
    jsonInfo2PoolKeys,
    Liquidity,
    LiquidityPoolKeys,
    Percent,
    Token,
    TOKEN_PROGRAM_ID,
    TokenAmount,
} from '@raydium-io/raydium-sdk';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
    connection,
    makeTxVersion,
} from '../config';
import { formatAmmKeysById } from '../liquidity/getActivePools';

import TOKEN from '../token/tokens.json';
import { getWalletTokenAccount } from '../utils';

// import {
//     buildAndSendTx,
//     getWalletTokenAccount,
// } from './utils';

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = {
    outputToken: Token
    targetPool: string
    inputTokenAmount: TokenAmount
    slippage: Percent
    walletTokenAccounts: WalletTokenAccounts
    wallet: PublicKey
}

async function swapOnlyAmm(input: TestTxInputInfo) {
    // -------- pre-action: get pool info --------
    const targetPoolInfo = await formatAmmKeysById(input.targetPool)
    assert(targetPoolInfo, 'cannot find the target pool')
    const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys

    // -------- step 1: coumpute amount out --------
    const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
        poolKeys: poolKeys,
        poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
        amountIn: input.inputTokenAmount,
        currencyOut: input.outputToken,
        slippage: input.slippage,
    })

    // -------- step 2: create instructions by SDK function --------
    const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
        connection,
        poolKeys,
        userKeys: {
            tokenAccounts: input.walletTokenAccounts,
            owner: input.wallet,
        },
        amountIn: input.inputTokenAmount,
        amountOut: minAmountOut,
        fixedSide: 'in',
        makeTxVersion,
    })

    console.log('amountOut:', amountOut.toFixed(), '  minAmountOut: ', minAmountOut.toFixed())

    // return { txids: await buildAndSendTx(innerTransactions) }
    return { innerTransactions };
}

export async function createSwapInstruction(inputToken: string, outputToken: string, targetPool: string, inputAmount: number, wallet: string) {
    // const inputToken = "FoYABswkz62t6jxjhi2StkXjvo7GL8Jas5r4qL4jtogi"
    // const outputToken = "So11111111111111111111111111111111111111112" // RAY
    // const targetPool = 'Ds6V5H4dSkhbMe5v8BVhsmMSF2r3Z6dtuTF3LSAZhvj6' // USDC-RAY pool
    const inputTokenInfo = TOKEN.find((i) => i.mint === inputToken)
    const outputTokenInfo = TOKEN.find((i) => i.mint === outputToken)
    const outputTokenClass = new Token(TOKEN_PROGRAM_ID, outputToken, outputTokenInfo.decimals, outputTokenInfo.symbol, outputTokenInfo.name)
    const inputTokenClass = new Token(TOKEN_PROGRAM_ID, inputToken, inputTokenInfo.decimals, inputTokenInfo.symbol, inputTokenInfo.name)
    const inputTokenAmount = new TokenAmount(inputTokenClass, inputAmount)
    const slippage = new Percent(1, 100)
    const walletPubkey = new PublicKey(wallet)
    const walletTokenAccounts = await getWalletTokenAccount(connection, walletPubkey)

    const instructions = await swapOnlyAmm({
        outputToken: outputTokenClass,
        targetPool,
        inputTokenAmount,
        slippage,
        walletTokenAccounts,
        wallet: walletPubkey,
    });
    return instructions;
    console.log(instructions);
}

// howToUse();


