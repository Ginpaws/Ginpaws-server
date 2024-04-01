import { BN } from 'bn.js';

import {
    Liquidity,
    DEVNET_PROGRAM_ID,
    Token,
    TOKEN_PROGRAM_ID,
    MARKET_STATE_LAYOUT_V3,
} from '@raydium-io/raydium-sdk';
import {
    Keypair,
    PublicKey,
} from '@solana/web3.js';

import {
    connection,
    makeTxVersion,
    PROGRAMIDS,
    wallet,
} from '../config';

import {
    buildAndSendTx,
    getWalletTokenAccount,
} from '../utils';

import {
    createMarket, createNewMarketInstructions
} from '../createMarket';

import TOKEN from '../token/tokens.json';
import fs from 'fs';

const ZERO = new BN(0)
type BN = typeof ZERO

type CalcStartPrice = {
    addBaseAmount: BN
    addQuoteAmount: BN
}

function calcMarketStartPrice(input: CalcStartPrice) {
    return input.addBaseAmount.toNumber() / 10 ** 6 / (input.addQuoteAmount.toNumber() / 10 ** 6)
}

type LiquidityPairTargetInfo = {
    baseToken: Token
    quoteToken: Token
    targetMarketId: PublicKey
}

function getMarketAssociatedPoolKeys(input: LiquidityPairTargetInfo) {
    return Liquidity.getAssociatedPoolKeys({
        version: 4,
        marketVersion: 3,
        baseMint: input.baseToken.mint,
        quoteMint: input.quoteToken.mint,
        baseDecimals: input.baseToken.decimals,
        quoteDecimals: input.quoteToken.decimals,
        marketId: input.targetMarketId,
        programId: PROGRAMIDS.AmmV4,
        marketProgramId: DEVNET_PROGRAM_ID.OPENBOOK_MARKET,
    })
}

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestTxInputInfo = LiquidityPairTargetInfo &
    CalcStartPrice & {
        startTime: number // seconds
        walletTokenAccounts: WalletTokenAccounts
        wallet: PublicKey
    }

async function ammCreatePool(input: TestTxInputInfo) {
    // -------- step 1: make instructions --------
    const initPoolInstructionResponse = await Liquidity.makeCreatePoolV4InstructionV2Simple({
        connection,
        programId: PROGRAMIDS.AmmV4,
        marketInfo: {
            marketId: input.targetMarketId,
            programId: PROGRAMIDS.OPENBOOK_MARKET,
        },
        baseMintInfo: input.baseToken,
        quoteMintInfo: input.quoteToken,
        baseAmount: input.addBaseAmount,
        quoteAmount: input.addQuoteAmount,
        startTime: new BN(Math.floor(input.startTime)),
        ownerInfo: {
            feePayer: input.wallet,
            wallet: input.wallet,
            tokenAccounts: input.walletTokenAccounts,
            useSOLBalance: true,
        },
        associatedOnly: false,
        checkCreateATAOwner: true,
        makeTxVersion,
        feeDestinationId: new PublicKey('3XMrhbv989VxAMi3DErLV9eJht1pHppW5LbKxe9fkEFR'), // only mainnet use this
    })

    return { ammCreatePoolInstructions: initPoolInstructionResponse.innerTransactions }
}

export async function createNewPoolInstruction(baseToken: string, quoteToken: string, wallet: string, addBaseAmount: number, addQuoteAmount: number, marketId: string) {
    const startTime = Math.floor(Date.now() / 1000) + 60 // start after 1 minutes
    const baseTokenInfo = TOKEN.find((i) => i.mint === baseToken)
    const quoteTokenInfo = TOKEN.find((i) => i.mint === quoteToken)
    const addBaseAmountBN = new BN(addBaseAmount);
    const addQuoteAmountBN = new BN(addQuoteAmount)
    const baseTokenClass: Token = new Token(TOKEN_PROGRAM_ID, baseToken, baseTokenInfo.decimals, baseTokenInfo.symbol, baseTokenInfo.name);
    const quoteTokenClass: Token = new Token(TOKEN_PROGRAM_ID, quoteToken, quoteTokenInfo.decimals, quoteTokenInfo.symbol, quoteTokenInfo.name);
    const targetMarketId = new PublicKey(marketId)

    const walletPubkey = new PublicKey(wallet)
    const walletTokenAccounts = await getWalletTokenAccount(connection, walletPubkey)

    const marketBufferInfo: any = await connection.getAccountInfo(targetMarketId)

    const { baseMint, quoteMint, baseLotSize, quoteLotSize } = MARKET_STATE_LAYOUT_V3.decode(marketBufferInfo.data)

    if (baseMint.toString() !== baseToken || quoteMint.toString() !== quoteToken) {
        throw new Error('Market does not match the token');
    }

    const associatedPoolKeys = getMarketAssociatedPoolKeys({
        baseToken: baseTokenClass,
        quoteToken: quoteTokenClass,
        targetMarketId,
    })

    const { id: ammId, lpMint } = associatedPoolKeys
    console.log('ammId', ammId.toBase58())
    console.log('lp mint', lpMint.toBase58())
    const isAlreadyInited = Boolean((await connection.getAccountInfo(new PublicKey(ammId)))?.data.length)
    if (isAlreadyInited) {
        throw new Error('Pool already exists');
    }

    return await ammCreatePool({
        startTime,
        addBaseAmount: addBaseAmountBN,
        addQuoteAmount: addQuoteAmountBN,
        baseToken: baseTokenClass,
        quoteToken: quoteTokenClass,
        targetMarketId,
        wallet: walletPubkey,
        walletTokenAccounts,
    });
}

async function howToUse() {
    const baseToken = TOKEN[1] // USDC
    const quoteToken = TOKEN[2] // USDT

    // check if pair of token exists
    const path = 'src/v1/liquidity/pair' + baseToken.symbol + quoteToken.symbol + '.json';
    const pairExists = fs.existsSync(path);
    if (pairExists) {
        return;
    }

    const addBaseAmount = new BN(10 * (10 ** 6)) // 10 / 10 ** 6,
    const addQuoteAmount = new BN(10 * (10 ** 6)) // 10 / 10 ** 6,
    const startTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // start from 7 days later
    const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey)

    /* do something with start price if needed */
    const startPrice = calcMarketStartPrice({ addBaseAmount, addQuoteAmount })

    /* do something with market associated pool keys if needed */
    const baseTokenClass: Token = new Token(TOKEN_PROGRAM_ID, baseToken.mint, baseToken.decimals, baseToken.name, baseToken.symbol);
    const quoteTokenClass: Token = new Token(TOKEN_PROGRAM_ID, quoteToken.mint, quoteToken.decimals, quoteToken.name, quoteToken.symbol);
    let targetMarketId: PublicKey;
    // targetMarketId = accounts[1];

    // if (targetMarketId) {
    //     console.log('targetMarketId', targetMarketId.toBase58());
    // } else {
    //     console.log('targetMarketId is null');
    // }

    // const targetMarketId = new PublicKey("AKR6KsXZciTWzzJu6k5zyAmUNzHuiu7DvG5crzJsLNuD")

    // console.log('targetMarketId', targetMarketId.toBase58())

    // const associatedPoolKeys = getMarketAssociatedPoolKeys({
    //     baseToken: baseTokenClass,
    //     quoteToken: quoteTokenClass,
    //     targetMarketId,
    // })

    // await ammCreatePool({
    //     startTime,
    //     addBaseAmount,
    //     addQuoteAmount,
    //     baseToken: baseTokenClass,
    //     quoteToken: quoteTokenClass,
    //     targetMarketId,
    //     wallet,
    //     walletTokenAccounts,
    // }).then(({ txids }) => {
    //     /** continue with txids */
    //     console.log('txids', txids)
    // })
}

howToUse();