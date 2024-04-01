import assert from 'assert';

import {
    CurrencyAmount,
    InnerSimpleV0Transaction,
    jsonInfo2PoolKeys,
    Liquidity,
    LiquidityPoolKeys,
    Percent,
    Token,
    TOKEN_PROGRAM_ID,
    TokenAmount
} from '@raydium-io/raydium-sdk';
import { Keypair, PublicKey } from '@solana/web3.js';

import Decimal from 'decimal.js';
import {
    connection,
    makeTxVersion,
    wallet
} from '../config';
import { formatAmmKeysById } from './getActivePools';
import {
    buildAndSendTx,
    getWalletTokenAccount,
} from '../utils';

import TOKEN from '../token/tokens.json';
import fs from 'fs';

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = {
    baseToken: Token
    quoteToken: Token
    targetPool: string
    inputTokenAmount: TokenAmount
    slippage: Percent
    walletTokenAccounts: WalletTokenAccounts
    walletPublickey: PublicKey
}

export async function addLiquidity(
    input: TestTxInputInfo
) {
    const targetPoolInfo = await formatAmmKeysById(input.targetPool)
    assert(targetPoolInfo, 'cannot find the target pool')

    // -------- step 1: compute another amount --------
    const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
    const extraPoolInfo = await Liquidity.fetchInfo({ connection, poolKeys })
    const { maxAnotherAmount, anotherAmount, liquidity } = Liquidity.computeAnotherAmount({
        poolKeys,
        poolInfo: { ...targetPoolInfo, ...extraPoolInfo },
        amount: input.inputTokenAmount,
        anotherCurrency: input.quoteToken,
        slippage: input.slippage,
    })

    console.log('will add liquidity info', {
        liquidity: liquidity.toString(),
        liquidityD: new Decimal(liquidity.toString()).div(10 ** extraPoolInfo.lpDecimals),
    })

    // -------- step 2: make instructions --------
    const addLiquidityInstructionResponse = await Liquidity.makeAddLiquidityInstructionSimple({
        connection,
        poolKeys,
        userKeys: {
            owner: input.walletPublickey,
            payer: input.walletPublickey,
            tokenAccounts: input.walletTokenAccounts,
        },
        amountInA: input.inputTokenAmount,
        amountInB: maxAnotherAmount,
        fixedSide: 'a',
        makeTxVersion,
    })

    return {
        addLiquidityInstructions: addLiquidityInstructionResponse.innerTransactions
    }
}

export async function createAddLiquidityInstruction(inputTokenA: string, inputTokenB: string, wallet: string, amount: number) {
    const inputTokenAInfo = TOKEN.find((i) => i.mint === inputTokenA)
    const inputTokenBInfo = TOKEN.find((i) => i.mint === inputTokenB)
    if (!inputTokenAInfo || !inputTokenBInfo) {
        throw new Error('cannot find the token info')
    }
    let path: string;
    if (inputTokenAInfo.symbol > inputTokenBInfo.symbol) {
        path = 'src/v1/liquidity/pair/pair' + inputTokenAInfo.symbol + inputTokenBInfo.symbol + '.json';
    } else {
        path = 'src/v1/liquidity/pair/pair' + inputTokenBInfo.symbol + inputTokenAInfo.symbol + '.json';
    }
    let pairId: string;
    if (fs.existsSync(path)) {
        pairId = JSON.parse(fs.readFileSync(path, 'utf8'))[0];
    }
    return await addLiquidity({
        baseToken: new Token(TOKEN_PROGRAM_ID, inputTokenA, inputTokenAInfo.decimals, inputTokenAInfo.symbol, inputTokenAInfo.name),
        quoteToken: new Token(TOKEN_PROGRAM_ID, inputTokenB, inputTokenBInfo.decimals, inputTokenBInfo.symbol, inputTokenBInfo.name),
        targetPool: pairId,
        inputTokenAmount: new TokenAmount(new Token(TOKEN_PROGRAM_ID, inputTokenA, inputTokenAInfo.decimals, inputTokenAInfo.symbol, inputTokenAInfo.name), amount),
        slippage: new Percent(1, 100),
        walletTokenAccounts: await getWalletTokenAccount(connection, new PublicKey(wallet)),
        walletPublickey: new PublicKey(wallet)
    });
}