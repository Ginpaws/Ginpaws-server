import {
    ApiPoolInfoV4,
    LIQUIDITY_STATE_LAYOUT_V4,
    Liquidity,
    MARKET_STATE_LAYOUT_V3,
    Market,
    SPL_MINT_LAYOUT
} from '@raydium-io/raydium-sdk';
import {
    ParsedInstruction,
    PublicKey,
} from '@solana/web3.js';
import { TokenInstruction, getMint, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import fs from 'fs';
import TOKEN from '../token/tokens.json';

import { connection, wallet } from '../config';
import { getAccount } from '@solana/spl-token';

export async function formatAmmKeysById(id: string): Promise<ApiPoolInfoV4> {
    const account = await connection.getAccountInfo(new PublicKey(id))
    if (account === null) throw Error(' get id info error ')
    const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data)

    const marketId = info.marketId
    const marketAccount = await connection.getAccountInfo(marketId)
    if (marketAccount === null) throw Error(' get market info error')
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data)

    const lpMint = info.lpMint
    const lpMintAccount = await connection.getAccountInfo(lpMint)
    if (lpMintAccount === null) throw Error(' get lp mint info error')
    const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data)

    return {
        id,
        baseMint: info.baseMint.toString(),
        quoteMint: info.quoteMint.toString(),
        lpMint: info.lpMint.toString(),
        baseDecimals: info.baseDecimal.toNumber(),
        quoteDecimals: info.quoteDecimal.toNumber(),
        lpDecimals: lpMintInfo.decimals,
        version: 4,
        programId: account.owner.toString(),
        authority: Liquidity.getAssociatedAuthority({ programId: account.owner }).publicKey.toString(),
        openOrders: info.openOrders.toString(),
        targetOrders: info.targetOrders.toString(),
        baseVault: info.baseVault.toString(),
        quoteVault: info.quoteVault.toString(),
        withdrawQueue: info.withdrawQueue.toString(),
        lpVault: info.lpVault.toString(),
        marketVersion: 3,
        marketProgramId: info.marketProgramId.toString(),
        marketId: info.marketId.toString(),
        marketAuthority: Market.getAssociatedAuthority({ programId: info.marketProgramId, marketId: info.marketId }).publicKey.toString(),
        marketBaseVault: marketInfo.baseVault.toString(),
        marketQuoteVault: marketInfo.quoteVault.toString(),
        marketBids: marketInfo.bids.toString(),
        marketAsks: marketInfo.asks.toString(),
        marketEventQueue: marketInfo.eventQueue.toString(),
        lookupTableAccount: PublicKey.default.toString()
    }
}

export async function getPoolInfo(tokenInputA: string, tokenInputB: string, walletPubkey: string) {
    let tokenInputAInfo = TOKEN.find((i) => i.mint === tokenInputA);
    let tokenInputBInfo = TOKEN.find((i) => i.mint === tokenInputB);
    if (!tokenInputAInfo || !tokenInputBInfo) {
        throw Error('cannot find the token info');
    }

    let id: string;
    if (fs.existsSync('src/v1/liquidity/pair/pair' + tokenInputAInfo.symbol + tokenInputBInfo.symbol + '.json')) {
        id = JSON.parse(fs.readFileSync('src/v1/liquidity/pair/pair' + tokenInputAInfo.symbol + tokenInputBInfo.symbol + '.json', 'utf8'))[0];
    } else if (fs.existsSync('src/v1/liquidity/pair/pair' + tokenInputBInfo.symbol + tokenInputAInfo.symbol + '.json')) {
        id = JSON.parse(fs.readFileSync('src/v1/liquidity/pair/pair' + tokenInputBInfo.symbol + tokenInputAInfo.symbol + '.json', 'utf8'))[0];
    }


    const account = await connection.getAccountInfo(new PublicKey(id))
    if (account === null) throw Error(' get id info error ')
    const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data)

    const marketId = info.marketId
    const marketAccount = await connection.getAccountInfo(marketId)
    if (marketAccount === null) throw Error(' get market info error')
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data)

    const lpMint = info.lpMint
    const lpMintAccount = await connection.getAccountInfo(lpMint)
    if (lpMintAccount === null) throw Error(' get lp mint info error')
    const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data)


    const totalSupply = (await getMint(
        connection,
        info.lpMint,
    )).supply;

    const lpMintTokenAccount = await getOrCreateAssociatedTokenAccount(connection, wallet, new PublicKey(info.lpMint), new PublicKey(walletPubkey));
    const balance = (await getAccount(connection, lpMintTokenAccount.address)).amount.toString();

    return {
        id,
        baseMint: info.baseMint.toString(),
        quoteMint: info.quoteMint.toString(),
        lpMint: info.lpMint.toString(),
        lpBalance: balance,
        lpSupply: totalSupply.toString(),
        baseDecimals: info.baseDecimal.toNumber(),
        quoteDecimals: info.quoteDecimal.toNumber(),
        lpDecimals: lpMintInfo.decimals,
        baseVault: info.baseVault.toString(),
        quoteVault: info.quoteVault.toString(),
    }
}