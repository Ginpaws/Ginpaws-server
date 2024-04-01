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
} from './config';

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

export async function getWalletTokenAccount(connection: Connection, wallet: PublicKey): Promise<TokenAccount[]> {
    const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
        programId: TOKEN_PROGRAM_ID,
    });
    return walletTokenAccount.value.map((i) => ({
        pubkey: i.pubkey,
        programId: i.account.owner,
        accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
    }));
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

export async function buildAndSendMultipleTx(innerSimpleV0Transaction: InnerSimpleV0Transaction[], options?: SendOptions) {
    const tx = new Transaction();
    innerSimpleV0Transaction.forEach((i) => {
        i.instructions.forEach((j) => {
            tx.add(j);
        });
    })
    return await sendTx(connection, wallet, [tx], options);
}

export function getATAAddress(programId: PublicKey, owner: PublicKey, mint: PublicKey) {
    const { publicKey, nonce } = findProgramAddress(
        [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    );
    return { publicKey, nonce };
}

export async function sleepTime(ms: number) {
    console.log((new Date()).toLocaleString(), 'sleepTime', ms)
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function loadInnerSimpleV0Transaction(objarray: any): InnerSimpleV0Transaction[] {
    // load objarray to a InnerSimpleV0Transaction[]
    objarray.forEach((obj: any) => {
        if (obj.innerTransactions) {
            obj.innerTransactions.forEach((element: InnerSimpleV0Transaction) => {
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
        }
    });
    return objarray;
}

export function combineInstructions(objarray: any) {
    // combine instructions to a single array
    const instructions: any = [];
    objarray.forEach((obj: any) => {
        if (obj.innerTransactions) {
            obj.innerTransactions.forEach((element: InnerSimpleV0Transaction) => {
                instructions.push({
                    instructions: element.instructions,
                    signers: element.signers,
                    instructionTypes: element.instructionTypes,
                });
            });
        }
    });
    return instructions;
}