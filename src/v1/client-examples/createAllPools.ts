import TOKEN from '../token/tokens.json';
import { createNewPool } from './createNewPool';
import fs from 'fs';

async function main() {
    for (let i = 0; i < TOKEN.length; ++i) {
        for (let j = i + 1; j < TOKEN.length; ++j) {
            let baseToken = TOKEN[i];
            let quoteToken = TOKEN[j];
            if (baseToken.symbol < quoteToken.symbol) {
                // swap baseToken and quoteToken
                const temp = baseToken;
                baseToken = quoteToken;
                quoteToken = temp;
            }
            const addBaseAmount = 10000000000;
            const addQuoteAmount = 10000000000;
            try {
                let ammId = "";
                while (ammId === "") {
                    ammId = await createNewPool(baseToken.mint, quoteToken.mint, addBaseAmount, addQuoteAmount);
                }
                // read array in json
                let ammArray = [];
                try {
                    if (fs.existsSync(`src/v1/liquidity/pair/pair${baseToken.symbol}${quoteToken.symbol}.json`))
                        ammArray = JSON.parse(fs.readFileSync(`src/v1/liquidity/pair/pair${baseToken.symbol}${quoteToken.symbol}.json`, 'utf8'));
                } catch (err) {
                    console.log(err);
                }
                ammArray.push(ammId);
                console.log(ammArray);
                fs.writeFileSync(`src/v1/liquidity/pair/pair${baseToken.symbol}${quoteToken.symbol}.json`, JSON.stringify(ammArray, null, 2));
            } catch (err) {
                console.log(err);
            }
        }
    }

}

main()