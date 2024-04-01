// query data from API

import axios from 'axios';
import {
    buildSimpleTransaction,
    findProgramAddress,
    InnerSimpleV0Transaction,
    SPL_ACCOUNT_LAYOUT,
    TOKEN_PROGRAM_ID,
    TokenAccount,
} from '@raydium-io/raydium-sdk';
import {
    BlockheightBasedTransactionConfirmationStrategy,
    Commitment,
    Connection,
    Keypair,
    PublicKey,
    RpcResponseAndContext,
    SendOptions,
    SignatureResult,
    Signer,
    Transaction,
    TransactionExpiredBlockheightExceededError,
    TransactionStatus,
    VersionedTransaction,
} from '@solana/web3.js';

import {
    addLookupTableInfo,
    makeTxVersion,
    wallet,
    connection,
} from '../config';
import { buildAndSendMultipleTx, combineInstructions, loadInnerSimpleV0Transaction } from '../utils';

async function fetchData(body) {
    const response = await axios.post("http://localhost:8080/x_ab", body);
    return response.data;
}

export async function sendTx(
    connection: Connection,
    payer: Keypair | Signer,
    txs: (VersionedTransaction | Transaction)[],
    options?: SendOptions
): Promise<string[]> {
    const txids: string[] = [];
    for (const iTx of txs) {
        if (iTx instanceof VersionedTransaction) {
            iTx.sign([payer]);
            txids.push(await connection.sendTransaction(iTx, options));
        } else {
            txids.push(await connection.sendTransaction(iTx, [payer], options));
        }
    }
    return txids;
}

export async function buildAndSendTx(innerSimpleV0Transaction: InnerSimpleV0Transaction[], options?: SendOptions) {
    const willSendTx = await buildSimpleTransaction({
        connection,
        makeTxVersion,
        payer: wallet.publicKey,
        innerTransactions: innerSimpleV0Transaction,
        // addLookupTableInfo: addLookupTableInfo,
    })
    return await sendTx(connection, wallet, willSendTx, options)
}

function isInnerSimpleV0Transaction(obj: any): obj is InnerSimpleV0Transaction[] {
    // return true if the object matches the structure of InnerSimpleV0Transaction
    for (const item of obj) {
        if (!item.instructions) return false;
        if (!item.signers) return false;
        if (!item.instructionTypes) return false;
    }
    return true;
}

async function main(body: object) {
    const data = await fetchData(body);
    console.log(data);
    const innerTransactions = loadInnerSimpleV0Transaction(data);
    const instructions = combineInstructions(innerTransactions);
    console.log(instructions);
    const txids = await buildAndSendTx(instructions);
    console.log(txids);
}

main({
    "tokenIn": {
        "symbol": "WSOL",
        "address": "HSvEJfU8hXUWFRodbVbRfwYb2p4DwSwpiMaoB7UDRVD4",
        "decimals": 9,
        "name": "Wrapped Solana",
        "logoURI": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        "coingeckoId": "solana",
        "assetAddress": "So11111111111111111111111111111111111111112",
        "balance": "cb6eeb"
    },
    "amountTokenIn": "100",
    "tokenOut1": {
        "symbol": "BTC",
        "address": "9T7uw5dqaEmEC4McqyefzYsEg5hoC4e2oV8it1Uc4f1U",
        "decimals": 6,
        "name": "Wrapped Bitcoin (Sollet)",
        "logoURI": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E/logo.png",
        "coingeckoId": "bitcoin",
        "assetAddress": "4gGKgUYvGkCT62Cu1zfPspuR7VPNPYrigXFmF9KTPji8",
        "balance": "00"
    },
    "tokenOut2": {
        "symbol": "USDC",
        "address": "V8vPw3sRHwN7YPpcEfwsNP8zirDzMYCBU4vfkzFusDw",
        "decimals": 6,
        "name": "USD Coin",
        "logoURI": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
        "coingeckoId": "usd-coin",
        "assetAddress": "5ihkgQGjKvWvmMtywTgLdwokZ6hqFv5AgxSyYoCNufQW",
        "balance": "6d0979"
    },
    "wallet": wallet.publicKey.toBase58()
})