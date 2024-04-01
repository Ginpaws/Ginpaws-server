import {
    MarketV2,
    Token,
    TOKEN_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { Keypair, PublicKey, SendOptions } from '@solana/web3.js';

import {
    connection,
    makeTxVersion,
    PROGRAMIDS,
    // wallet,
} from './config';
import TOKEN from './token/tokens.json';
import { buildAndSendTx } from './utils';

type TestTxInputInfo = {
    baseToken: Token
    quoteToken: Token
    walletPublicKey: PublicKey
}

export async function createMarket(input: TestTxInputInfo) {
    // -------- step 1: make instructions --------
    const createMarketInstruments = await MarketV2.makeCreateMarketInstructionSimple({
        connection,
        wallet: input.walletPublicKey,
        baseInfo: input.baseToken,
        quoteInfo: input.quoteToken,
        lotSize: 1, // default 1
        tickSize: 0.00001, // default 0.01
        dexProgramId: PROGRAMIDS.OPENBOOK_MARKET,
        makeTxVersion,
    })
    const SendOptions: SendOptions = {
        skipPreflight: true,
    }

    // return { txids: await buildAndSendTx(createMarketInstruments.innerTransactions, SendOptions) }
    return { createMarketInstruments: createMarketInstruments.innerTransactions, SendOptions }
}

export async function createNewMarketInstructions(baseTokenMint: string, quoteTokenMint: string, wallet: string) {
    const baseTokenInfo = TOKEN.find((i) => i.mint === baseTokenMint)
    const quoteTokenInfo = TOKEN.find((i) => i.mint === quoteTokenMint)
    if (!baseTokenInfo || !quoteTokenInfo) {
        throw new Error('cannot find the token info')
    }
    const baseTokenClass: Token = new Token(TOKEN_PROGRAM_ID, baseTokenMint, baseTokenInfo.decimals, baseTokenInfo.symbol, baseTokenInfo.name);
    const quoteTokenClass: Token = new Token(TOKEN_PROGRAM_ID, quoteTokenMint, quoteTokenInfo.decimals, quoteTokenInfo.symbol, quoteTokenInfo.name);
    const walletPublicKey = new PublicKey(wallet)
    return await createMarket({
        baseToken: baseTokenClass,
        quoteToken: quoteTokenClass,
        walletPublicKey
    });
}

export async function createNewMarket(baseTokenMint: string, quoteTokenMint: string, wallet: string) {
    const instructions = await createNewMarketInstructions(baseTokenMint, quoteTokenMint, wallet);
    return { txids: await buildAndSendTx(instructions.createMarketInstruments, instructions.SendOptions) }
}