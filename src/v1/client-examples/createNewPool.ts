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
    Connection,
    Keypair,
    PublicKey,
    SendOptions,
    Signer,
    Transaction,
    VersionedTransaction,
} from '@solana/web3.js';

import {
    addLookupTableInfo,
    makeTxVersion,
    wallet,
    connection,
} from '../config';

import { getMarketID } from './createNewMarket';

async function fetchData(baseToken: string, quoteToken: string, address: string, targetMarketId: string, addBaseAmount: number, addQuoteAmount: number) {
    const response = await axios.post(`http://localhost:3000/createNewPool`, {
        "baseToken": baseToken,
        "quoteToken": quoteToken,
        "wallet": address,
        "addBaseAmount": addBaseAmount.toString(),
        "addQuoteAmount": addQuoteAmount.toString(),
        "marketId": targetMarketId
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

function loadInnerSimpleV0Transaction(objarray: any): InnerSimpleV0Transaction[] {
    // load obj to a InnerSimpleV0Transaction[]
    objarray.forEach((element: InnerSimpleV0Transaction) => {
        element.instructions = element.instructions.map((i: any) => {
            i.programId = new PublicKey(i.programId);
            if (i.keys) {
                i.keys = i.keys.map((a: any) => {
                    a.pubkey = new PublicKey(a.pubkey);
                    return a;
                });
            }
            if (i.data) {
                i.data = Buffer.from(i.data, 'base64');
            }
            return i;
        });
    });
    return objarray;
}

// function isSendOptions(obj: any): obj is SendOptions {
//     // return true if the object matches the structure of SendOptions
// }

const getConfirmation = async (connection: Connection, tx: string) => {
    const result = await connection.getSignatureStatus(tx, {
        searchTransactionHistory: true,
    });
    return result.value?.confirmationStatus || 'confirmed';
};

const getError = async (connection: Connection, tx: string) => {
    const result = await connection.getSignatureStatus(tx, {
        searchTransactionHistory: true,
    });
    return result.value?.err;
}

export async function createNewPool(baseToken: string, quoteToken: string, addBaseAmount: number, addQuoteAmount: number) {
    let targetMarketId: string = "";
    let Count = 0;
    while (targetMarketId === "") {
        if (Count < 10) {
            try {
                targetMarketId = await getMarketID(baseToken, quoteToken);
                ++Count;
            } catch (e) {
                console.log(e);
            }
        } else {
            throw new Error("Failed to get Market ID");
        }
    }
    const data = await fetchData(
        baseToken,
        quoteToken,
        wallet.publicKey.toString(), targetMarketId.toString(),
        addBaseAmount,
        addQuoteAmount);
    const ammCreatePoolInstructions = loadInnerSimpleV0Transaction(data.ammCreatePoolInstructions);
    const txIds = await buildAndSendTx(ammCreatePoolInstructions);
    for (const tx of txIds) {
        const latestBlockHash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: tx,
        });
        const error = await getError(connection, tx);
        if (error) throw new Error(`Error: ${error}`);
    }
    const txInfos = await connection.getParsedTransaction(txIds[0], { maxSupportedTransactionVersion: 0 });
    const ammId = txInfos?.transaction.message.accountKeys[1].pubkey.toBase58();
    return ammId;
}

// createNewPool("So11111111111111111111111111111111111111112", "FoYABswkz62t6jxjhi2StkXjvo7GL8Jas5r4qL4jtogi");