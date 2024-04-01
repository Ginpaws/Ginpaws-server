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
import { combineInstructions, loadInnerSimpleV0Transaction } from '../utils';

async function fetchData(inputTokenA: string, inputTokenB: string, wallet: string, amount: number) {
    const response = await axios.post(`http://localhost:3000/addLiquidity`, {
        inputTokenA,
        inputTokenB,
        wallet,
        amount
    });
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

export async function main(inputTokenA: string, inputTokenB: string, wallet: string, amount: number) {
    const data = await fetchData(inputTokenA, inputTokenB, wallet, amount);
    const innerTransactions = loadInnerSimpleV0Transaction(data);
    const instructions = combineInstructions(innerTransactions);
    console.log(instructions);
    // const txIds = await buildAndSendTx(instructions);
    // console.log(txIds);
}

main("HSvEJfU8hXUWFRodbVbRfwYb2p4DwSwpiMaoB7UDRVD4",
    "V8vPw3sRHwN7YPpcEfwsNP8zirDzMYCBU4vfkzFusDw",
    wallet.publicKey.toBase58(),
    1000);