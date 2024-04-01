import { connection, rpcUrl, wallet, wallet2 } from "../config";
import { TokenStandard, createAndMint } from '@metaplex-foundation/mpl-token-metadata'
import { percentAmount, generateSigner, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCandyMachine } from '@metaplex-foundation/mpl-candy-machine';
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import base58 from 'bs58';
import TOKEN from '../token/tokens.json';
import fs from 'fs';
import { PublicKey } from "@solana/web3.js";
import { createNewMarket } from "../createMarket";
import { getMarketID } from "./createNewMarket";
import { createNewPool } from "./createNewPool";

async function main() {
    try {
        for (let i = 1; i < TOKEN.length; i++) {
            const token = TOKEN[i];
            const umi = createUmi(rpcUrl);
            const secret: string = process.env.PRIVATE_KEY || '';
            const userWallet = umi.eddsa.createKeypairFromSecretKey(base58.decode(secret));
            const userWalletSigner = createSignerFromKeypair(umi, userWallet);

            const mint = generateSigner(umi);
            umi.use(signerIdentity(userWalletSigner));
            umi.use(mplCandyMachine())
            await createAndMint(umi, {
                mint,
                authority: umi.identity,
                name: token.name,
                symbol: token.symbol,
                uri: "",
                sellerFeeBasisPoints: percentAmount(0),
                decimals: token.decimals,
                amount: parseInt(token.supply),
                tokenOwner: userWallet.publicKey,
                tokenStandard: TokenStandard.Fungible,
            }).sendAndConfirm(umi).then(() => {
                console.log(`Successfully created ${parseInt(token.supply.toString()) / (10 ** token.decimals)} tokens ${token.name} to ${wallet.publicKey.toBase58()} at "${mint.publicKey}"`);
            });
            token.mint = mint.publicKey;
            const toTokenAccount = await getOrCreateAssociatedTokenAccount(connection, wallet, new PublicKey(token.mint), wallet2.publicKey);
            await mintTo(
                connection,
                wallet,
                new PublicKey(token.mint),
                toTokenAccount.address,
                wallet.publicKey,
                parseInt(token.supply.toString())
            );
            console.log(`Successfully minted ${parseInt(token.supply.toString()) / (10 ** token.decimals)} tokens ${token.name} to ${wallet2.publicKey.toBase58()} account at "${mint.publicKey}"`);
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
    fs.writeFileSync('./src/v1/token/tokens.json', JSON.stringify(TOKEN, null, 2));
}

main();

