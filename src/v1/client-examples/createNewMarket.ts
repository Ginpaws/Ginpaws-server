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
import { loadInnerSimpleV0Transaction } from '../utils';

async function fetchData(address: string, baseToken: string, quoteToken: string) {
    const response = await axios.get(
      `http://localhost:8080/createNewMarket?baseToken=${baseToken}&quoteToken=${quoteToken}&wallet=${address}`
    );
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

const getError = async (connection: Connection, tx: string) => {
    const result = await connection.getSignatureStatus(tx, {
        searchTransactionHistory: true,
    });
    return result.value?.err;
}

export async function getMarketID(baseToken: string, quoteToken: string) {
    const data = await fetchData(wallet.publicKey.toString(), baseToken, quoteToken);
    const createMarketInstruction = loadInnerSimpleV0Transaction(data);
    const options: SendOptions = data.SendOptions;
    const txids = await buildAndSendTx(createMarketInstruction, options);
    // wait until the transaction is confirmed
    for (const tx of txids) {
        const latestBlockHash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: tx,
        });
        const error = await getError(connection, tx);
        if (error) throw new Error(`Error: ${error}`);
    }
    const txInfos = await connection.getParsedTransaction(txids[1], { maxSupportedTransactionVersion: 0 })
    // do next step
    return txInfos?.transaction.message.accountKeys[1].pubkey.toBase58() || '';
}

// try {
//     getMarketID();
// } catch(err) {
//     console.log(err);
// }