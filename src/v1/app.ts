import express from 'express';
import { createNewMarket, createNewMarketInstructions } from './createMarket';
import TOKEN from './token/tokens.json';
import fs from 'fs';
import { formatAmmKeysById } from './liquidity/getActivePools';
import { createNewPoolInstruction } from './liquidity/createNewPool';
import { createSwapInstruction } from './swap/swapTokens';
import { createAddLiquidityInstruction } from './liquidity/addLiquidity';

const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});

app.get("/createNewMarket", async (req, res) => {
    if (!req.query.baseToken || !req.query.quoteToken || !req.query.wallet) {
        return res.status(400).send("baseToken, quoteToken, and wallet are required");
    }
    const baseToken = req.query.baseToken.toString();
    const quoteToken = req.query.quoteToken.toString();
    const baseTokenInfo = TOKEN.find((i) => i.mint === baseToken)
    const quoteTokenInfo = TOKEN.find((i) => i.mint === quoteToken)
    if (!baseTokenInfo || !quoteTokenInfo) {
        res.status(400).send('cannot find the token info');
    }
    const wallet = req.query.wallet.toString();
    if (!baseToken || !quoteToken || !wallet) {
        return res.status(400).send("baseToken, quoteToken, and wallet are required");
    }
    const newMarketInstructions = await createNewMarketInstructions(baseToken, quoteToken, wallet);
    res.send(newMarketInstructions);
})

app.post("/createNewPool", async (req, res) => {
    console.log(req.body);
    const baseToken = req.body.baseToken.toString();
    const quoteToken = req.body.quoteToken.toString();
    const baseTokenInfo = TOKEN.find((i) => i.mint === baseToken)
    const quoteTokenInfo = TOKEN.find((i) => i.mint === quoteToken)
    if (!baseTokenInfo || !quoteTokenInfo) {
        res.status(400).send('cannot find the token info');
    }
    const path = 'src/v1/liquidity/pair' + baseTokenInfo.symbol + quoteTokenInfo.symbol + '.json';
    const pairExists = fs.existsSync(path);
    if (pairExists) {
        const pool_id = fs.readFileSync(path, 'utf8');
        const pool = await formatAmmKeysById(pool_id);
        if (pool) res.status(400).send('pool already exists');
    }


    if (!req.body.marketId) {
        return res.status(400).send("marketId is required");
    }
    const marketId = req.body.marketId.toString();

    const wallet = req.body.wallet.toString();
    if (!wallet) {
        return res.status(400).send("wallet is required");
    }
    const addBaseAmount = parseInt(req.body.addBaseAmount);
    if (!addBaseAmount) {
        return res.status(400).send("addBaseAmount is required");
    }
    const addQuoteAmount = parseInt(req.body.addQuoteAmount);
    if (!addQuoteAmount) {
        return res.status(400).send("addQuoteAmount is required");
    }
    try {
        const instruction = await createNewPoolInstruction(
            baseToken,
            quoteToken,
            wallet,
            addBaseAmount,
            addQuoteAmount,
            marketId,
        );
        res.send(instruction);
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
})

app.get("/getActivePool", async (req, res) => {
    if (!req.query.id) {
        return res.status(400).send("id is required");
    }
    const id = req.query.id.toString();
    const pool = await formatAmmKeysById(id);
    res.send(pool);
})

app.get("/swap", async (req, res) => {
    if (!req.query.inputToken || !req.query.outputToken || !req.query.wallet) {
        return res.status(400).send("inputToken, outputToken, and wallet are required");
    }
    if (!req.query.targetPool) {
        return res.status(400).send("targetPool is required");
    }
    if (!req.query.inputTokenAmount) {
        return res.status(400).send("inputTokenAmount is required");
    }
    const inputToken = req.query.inputToken.toString();
    const outputToken = req.query.outputToken.toString();
    const targetPool = req.query.targetPool.toString();
    const inputAmount = parseInt(req.query.inputTokenAmount.toString());
    const wallet = req.query.wallet.toString();
    const instructions = await createSwapInstruction(inputToken, outputToken, targetPool, inputAmount, wallet);
    res.send(instructions);
})

app.get("/x_ab", async (req, res) => {
    if (!req.query.x || !req.query.a || !req.query.b) {
        return res.status(400).send("x, a, and b are required");
    }
    if (!req.query.inputTokenAmount) {
        return res.status(400).send("inputTokenAmount is required");
    }
})

app.post("/addLiquidity", async (req, res) => {
    const { inputTokenA, inputTokenB, wallet, amount } = req.body;
    if (!inputTokenA || !inputTokenB || !wallet || !amount) {
        return res.status(400).send("inputTokenA, inputTokenB, wallet, and amount are required");
    }
    const instructions = await createAddLiquidityInstruction(inputTokenA, inputTokenB, wallet, amount);
    res.send(instructions);
})