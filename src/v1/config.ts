import {
    ENDPOINT as _ENDPOINT,
    Currency,
    LOOKUP_TABLE_CACHE,
    MAINNET_PROGRAM_ID,
    ProgramId,
    RAYDIUM_MAINNET,
    Token,
    TOKEN_PROGRAM_ID,
    TxVersion,
} from '@raydium-io/raydium-sdk';

import {
    Connection,
    Keypair,
    PublicKey,
} from '@solana/web3.js';

import bs58 from 'bs58'

import dotenv from 'dotenv';

export const rpcUrl: string = 'https://api.devnet.solana.com/'
export const rpcToken: string | undefined = undefined

dotenv.config();
const privatekey = process.env.PRIVATE_KEY || '';
const privatekey2 = process.env.PRIVATE_KEY2 || '';
// console.log(Uint8Array.from(bs58.decode(privatekey)));
export const wallet = Keypair.fromSecretKey(Uint8Array.from(bs58.decode(privatekey)));
export const wallet2 = Keypair.fromSecretKey(Uint8Array.from(bs58.decode(privatekey2)));

// const secret = [193, 180, 77, 227, 46, 55, 143, 46, 201, 59, 61, 65, 144, 48, 170, 94, 112, 49, 201, 142, 130, 78, 211, 145, 117, 156, 234, 121, 86, 250, 10, 224, 167, 161, 65, 118, 238, 63, 231, 130, 129, 208, 16, 1, 153, 105, 151, 95, 103, 86, 43, 173, 123, 141, 26, 244, 65, 89, 15, 187, 218, 66, 170, 74];
// export const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));

export const connection = new Connection(rpcUrl, 'confirmed');

export const PROGRAMIDS = {
    AmmV4: new PublicKey("HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8"),
    OPENBOOK_MARKET: new PublicKey("EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj"),
}

export const ENDPOINT = _ENDPOINT;

export const RAYDIUM_MAINNET_API = RAYDIUM_MAINNET;

export const makeTxVersion = TxVersion.V0; // LEGACY

export const addLookupTableInfo = LOOKUP_TABLE_CACHE // only mainnet. other = undefined