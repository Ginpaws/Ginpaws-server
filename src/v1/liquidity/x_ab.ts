import assert from 'assert';

import {
    CurrencyAmount,
    jsonInfo2PoolKeys,
    Liquidity,
    LiquidityPoolKeys,
    Percent,
    swapInstruction,
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
import fs from 'fs';
import { create } from '@metaplex-foundation/mpl-candy-machine';
import { createSwapInstruction } from '../swap/swapTokens';
import { createAddLiquidityInstruction } from './addLiquidity';

// import {
//     buildAndSendTx,
//     getWalletTokenAccount,
// } from './utils';

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = {
    outputToken: Token
    targetPool: string
    inputTokenXXAmount: TokenAmount
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
        amountIn: input.inputTokenXXAmount,
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
        amountIn: input.inputTokenXXAmount,
        amountOut: minAmountOut,
        fixedSide: 'in',
        makeTxVersion,
    })

    console.log('amountOut:', amountOut.toFixed(), '  minAmountOut: ', minAmountOut.toFixed())

    // return { txids: await buildAndSendTx(innerTransactions) }
    return { innerTransactions };
}

export async function createXAB(inputTokenX: string, outputTokenA: string, outputTokenB: string, wallet: string, inputAmount: number) {
    let instructions = [];
    const inputTokenXInfo = TOKEN.find((i) => i.mint === inputTokenX)
    const outputTokenAInfo = TOKEN.find((i) => i.mint === outputTokenA)
    const outputTokenBInfo = TOKEN.find((i) => i.mint === outputTokenB)

    if (!inputTokenXInfo || !outputTokenAInfo || !outputTokenBInfo) {
        throw new Error('cannot find the token info')
    }

    const outputTokenAClass = new Token(TOKEN_PROGRAM_ID, outputTokenA, outputTokenAInfo.decimals, outputTokenAInfo.symbol, outputTokenAInfo.name)
    const outputTokenBClass = new Token(TOKEN_PROGRAM_ID, outputTokenB, outputTokenBInfo.decimals, outputTokenBInfo.symbol, outputTokenBInfo.name)
    const inputTokenXClass = new Token(TOKEN_PROGRAM_ID, inputTokenX, inputTokenXInfo.decimals, inputTokenXInfo.symbol, inputTokenXInfo.name)
    const inputTokenXAmount = new TokenAmount(inputTokenXClass, inputAmount)
    const slippage = new Percent(1, 100)
    const walletPubkey = new PublicKey(wallet)
    const walletTokenAccounts = await getWalletTokenAccount(connection, walletPubkey)

    const inputTokenXAAmount = new TokenAmount(inputTokenXClass, inputAmount / 2);
    const inputTokenXBAmount = new TokenAmount(inputTokenXClass, inputAmount / 2);

    let targetPoolXA: string;
    if (fs.existsSync('src/v1/liquidity/pair/pair' + inputTokenXInfo.symbol + outputTokenAInfo.symbol + '.json')) {
        targetPoolXA = JSON.parse(fs.readFileSync('src/v1/liquidity/pair/pair' + inputTokenXInfo.symbol + outputTokenAInfo.symbol + '.json', 'utf8'))[0];
    } else if (fs.existsSync('src/v1/liquidity/pair/pair' + outputTokenAInfo.symbol + inputTokenXInfo.symbol + '.json')) {
        targetPoolXA = JSON.parse(fs.readFileSync('src/v1/liquidity/pair/pair' + outputTokenAInfo.symbol + inputTokenXInfo.symbol + '.json', 'utf8'))[0];
    }
    const targetPoolInfoXA = await formatAmmKeysById(targetPoolXA)
    const poolKeysXA = jsonInfo2PoolKeys(targetPoolInfoXA) as LiquidityPoolKeys
    const currencyOutA = new Token(TOKEN_PROGRAM_ID, outputTokenA, outputTokenAInfo.decimals, outputTokenAInfo.symbol, outputTokenAInfo.name)
    // -------- step 1: coumpute amount out --------
    const { amountOut: amountOutA, minAmountOut: minAmountOutA } = Liquidity.computeAmountOut({
        poolKeys: poolKeysXA,
        poolInfo: await Liquidity.fetchInfo({ connection, poolKeys: poolKeysXA }),
        amountIn: inputTokenXAAmount,
        currencyOut: currencyOutA,
        slippage: slippage,
    })

    let targetPoolXB: string;
    if (fs.existsSync('src/v1/liquidity/pair/pair' + inputTokenXInfo.symbol + outputTokenBInfo.symbol + '.json')) {
        targetPoolXB = JSON.parse(fs.readFileSync('src/v1/liquidity/pair/pair' + inputTokenXInfo.symbol + outputTokenBInfo.symbol + '.json', 'utf8'))[0];
    } else if (fs.existsSync('src/v1/liquidity/pair/pair' + outputTokenBInfo.symbol + inputTokenXInfo.symbol + '.json')) {
        targetPoolXB = JSON.parse(fs.readFileSync('src/v1/liquidity/pair/pair' + outputTokenBInfo.symbol + inputTokenXInfo.symbol + '.json', 'utf8'))[0];
    }
    const targetPoolInfoXB = await formatAmmKeysById(targetPoolXB)
    const poolKeysXB = jsonInfo2PoolKeys(targetPoolInfoXB) as LiquidityPoolKeys
    const currencyOutB = new Token(TOKEN_PROGRAM_ID, outputTokenB, outputTokenBInfo.decimals, outputTokenBInfo.symbol, outputTokenBInfo.name)
    // -------- step 1: coumpute amount out --------
    const { amountOut: amountOutB, minAmountOut: minAmountOutB } = Liquidity.computeAmountOut({
        poolKeys: poolKeysXB,
        poolInfo: await Liquidity.fetchInfo({ connection, poolKeys: poolKeysXB }),
        amountIn: inputTokenXBAmount,
        currencyOut: currencyOutB,
        slippage: slippage,
    })

    let targetPoolAB: string;
    if (fs.existsSync('src/v1/liquidity/pair/pair' + outputTokenAInfo.symbol + outputTokenBInfo.symbol + '.json')) {
        targetPoolAB = JSON.parse(fs.readFileSync('src/v1/liquidity/pair/pair' + outputTokenAInfo.symbol + outputTokenBInfo.symbol + '.json', 'utf8'))[0];
    } else if (fs.existsSync('src/v1/liquidity/pair/pair' + outputTokenBInfo.symbol + outputTokenAInfo.symbol + '.json')) {
        targetPoolAB = JSON.parse(fs.readFileSync('src/v1/liquidity/pair/pair' + outputTokenBInfo.symbol + outputTokenAInfo.symbol + '.json', 'utf8'))[0];
    }
    const targetPoolInfoAB = await formatAmmKeysById(targetPoolAB)
    const poolKeysAB = jsonInfo2PoolKeys(targetPoolInfoAB) as LiquidityPoolKeys
    const extraPoolInfoAB = await Liquidity.fetchInfo({ connection, poolKeys: poolKeysAB })
    let { maxAnotherAmount, anotherAmount, liquidity } = Liquidity.computeAnotherAmount({
        poolKeys: poolKeysAB,
        poolInfo: { ...targetPoolInfoAB, ...extraPoolInfoAB },
        amount: amountOutA,
        anotherCurrency: outputTokenBClass,
        slippage: slippage,
    })


    instructions = instructions.concat(await createSwapInstruction(
        inputTokenX,
        outputTokenA,
        targetPoolXA,
        inputAmount / 2,
        wallet,
    ));
    instructions = instructions.concat(await createSwapInstruction(
        inputTokenX,
        outputTokenB,
        targetPoolXB,
        inputAmount / 2,
        wallet,
    ));

    if (amountOutB.sub(anotherAmount).raw.toNumber() > 0) {
        const addLiquidityABInstruction = await createAddLiquidityInstruction(
            outputTokenA,
            outputTokenB,
            wallet,
            amountOutA.raw.toNumber(),
        );
        instructions = instructions.concat(addLiquidityABInstruction);
        // swap remain B to X
        const swapBtoXInstruction = await createSwapInstruction(
            outputTokenB,
            inputTokenX,
            targetPoolXB,
            amountOutB.sub(anotherAmount).raw.toNumber(),
            wallet,
        );
        instructions = instructions.concat(swapBtoXInstruction);
    } else {
        const poolKeysAB = jsonInfo2PoolKeys(targetPoolInfoAB) as LiquidityPoolKeys
        const extraPoolInfoAB = await Liquidity.fetchInfo({ connection, poolKeys: poolKeysAB })
        let { maxAnotherAmount, anotherAmount, liquidity } = Liquidity.computeAnotherAmount({
            poolKeys: poolKeysAB,
            poolInfo: { ...targetPoolInfoAB, ...extraPoolInfoAB },
            amount: amountOutB,
            anotherCurrency: outputTokenAClass,
            slippage: slippage,
        });
        assert(amountOutA.sub(anotherAmount).raw.toNumber() >= 0, 'amountOutA.sub(anotherAmount).raw.toNumber() < 0');
        const addLiquidityABInstruction = await createAddLiquidityInstruction(
            outputTokenB,
            outputTokenA,
            wallet,
            amountOutB.raw.toNumber(),
        );
        instructions = instructions.concat(addLiquidityABInstruction);
        // swap remain A to X
        if (amountOutA.sub(anotherAmount).raw.toNumber() > 0) {
            const swapAtoXInstruction = await createSwapInstruction(
                outputTokenA,
                inputTokenX,
                targetPoolXA,
                amountOutA.sub(anotherAmount).raw.toNumber(),
                wallet,
            );
            instructions = instructions.concat(swapAtoXInstruction);
        }
    }
    return instructions;
}



// howToUse();


