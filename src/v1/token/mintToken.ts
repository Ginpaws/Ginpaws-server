import { createMint, mintTo, getOrCreateAssociatedTokenAccount, getAccount } from '@solana/spl-token';

import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

import { connection, rpcUrl, wallet } from "../config";


async function main() {
    const mint = new PublicKey("APVzwCVzgRHvGGp26jnCNg87au9QWHrXoeSJYg87obqu");

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        mint,
        wallet.publicKey
    )

    console.log(tokenAccount.address.toBase58());

    const tokenAccountInfo = await getAccount(
        connection,
        tokenAccount.address
    )

    console.log(tokenAccountInfo.amount);


    // await mintTo(
    //     connection,
    //     wallet,
    //     mint,
    //     tokenAccount.address,
    //     wallet.publicKey,
    //     100000000000 // because decimals for the mint are set to 9 
    // )

    // console.log("Successfully minted 100000000000 tokens");
}

main();