const path = require('path');
const BN = require('bignumber.js');
BN['config']({EXPONENTIAL_AT: 1e+9});

// Config
const config = require(path.join(__dirname, '..', '..', 'lib', 'config'));

// Utils
const utils = {
    db: require(path.join(__dirname, '..', '..', 'utils', 'db')),
    helpers: require(path.join(__dirname, '..', '..', 'utils', 'helpers')),
    dfuse: require(path.join(__dirname, '..', '..', 'utils', 'dfuse')),
};

// Modules
const modules = require(path.join(__dirname, '..', '..', 'modules'));

// Models
const db_model = {
    client: require(path.join(__dirname, '..', '..', 'models', 'client')),
    account: require(path.join(__dirname, '..', '..', 'models', 'account')),
    block: require(path.join(__dirname, '..', '..', 'models', 'block')),
    ipn: require(path.join(__dirname, '..', '..', 'models', 'ipn')),
    eosTx: require(path.join(__dirname, '..', '..', 'models', 'eosTx'))
};

(async () => {
    try {
        console.info('****************************************************************************************************');
        console.info('[INFO]', 'Start filter (EOS) service');
        await utils.db.connect();
        await recursiveChecker();
    } catch (e) {
        utils.helpers.writeLog('filter', 'error', null, e);
        console.error('[ERROR]', e.toString());
        await utils.db.disconnect();
        process.exit(1);
    }
})();


let iteration = 1;
const startTime = new Date();

async function recursiveChecker() {
    try {
        // PRINT UPTIME
        utils.helpers.printUptimeLine(iteration, startTime);

        // BASIC LOGIC
        await basicLogic();

        iteration++;
        return await recursiveChecker();
    } catch (e) {
        throw e;
    }
}

// Functions
const basicLogic = async function () {
    try {
        const client = await db_model.client.findOne({isActive: true});
        // Blocks
        const processedBlock = await db_model.block.findOne({currency: 'eos'});
        let latestBlock = await utils.dfuse.getLastBlock();
        if (latestBlock === undefined) {
            latestBlock = Number(processedBlock.number) + 20;
        }
        const block_count = latestBlock - Number(processedBlock.number);
        if (block_count > 0) {
            const response = await utils.dfuse.getTransactions(processedBlock.number - config.CURRENCY.EOS.back_blocks, block_count);

            if (response.transactions !== null) { 
                if (response.transactions.length > 0) {
                    for (let j = 0; j < response.transactions.length; j++) {
                        const matchingActions = response.transactions[j].trace.matchingActions;
                        const txId = response.transactions[j].trace.id;
                        const blockNumber = response.transactions[j].trace.block.num;
                        if (matchingActions.length > 0) {
                            for (let i = 0; i < matchingActions.length; i++) {
                                if (matchingActions[i].json !== null) {
                                    const dataDeposit = matchingActions[i].json;
                                    let currency = dataDeposit.quantity.split(' ')[1].toLowerCase();
    
                                    // Заглушка для тестовой сети
                                    // const memo = dataDeposit.memo.split(' ');
                                    // if (memo.length === 2) {
                                    //     dataDeposit.memo = memo[0];
                                    //     currency = memo[1].toLowerCase();
                                    // } else if (memo.length === 1) {
                                    //     currency = 'eos'
                                    // }
    
                                    const upBalance = Number(dataDeposit.quantity.split(' ')[0].split('.')[0] +
                                        dataDeposit.quantity.split(' ')[0].split('.')[1]).toString();
    
                                    const account = await db_model.account.findOne({
                                        address: dataDeposit.memo
                                    });
                                    if (account && client.manager.address === matchingActions[i].receiver) {
                                        switch (currency) {
                                            case 'eos': {
                                                await db_model.account.updateOne({
                                                    address: dataDeposit.memo,
                                                }, {
                                                    $set: {
                                                        balance: (new BN(account.balance).plus(new BN(upBalance))).toString(),
                                                        balance_in: (new BN(account.balance_in).plus(new BN(upBalance))).toString(),
                                                    }
                                                });
                                                const data = {
                                                    client_id: account.client_id,
                                                    isTokenTransferTx: false,
                                                    address: account.address,
                                                    tx_id: txId,
                                                    blockNumber,
                                                    amount: upBalance.toString(),
                                                };
    
                                                await db_model.ipn.create({
                                                    ...data,
                                                    currency: 'eos',
                                                    status: 2
                                                });
                                                await db_model.eosTx.create({
                                                    ...data,
                                                    confirmed: true,
                                                    failed: false
                                                });
                                                console.info(utils.helpers.emptyIndent(4) + '[INFO]', utils.helpers.getClientInfo(client), 'NEW INCOME TRANSACTION | address: '
                                                    + dataDeposit.memo + ', amount: ' + (new BN(upBalance).shiftedBy(-config.CURRENCY.EOS.DECIMALS)).toString() + ' ' +
                                                    currency + ', TX id: ' + txId + ', block: ' + blockNumber);
                                            }
                                                break;
                                            case 'cft': {
                                                const tokenIndex = account.tokens.findIndex(item => item.symbol === currency.toLowerCase());
                                                if (tokenIndex !== -1) {
                                                    account.tokens[tokenIndex].set({
                                                        balance: (new BN(account.tokens[tokenIndex].balance).plus(new BN(upBalance))).toString(),
                                                        balance_in: (new BN(account.tokens[tokenIndex].balance_in).plus(new BN(upBalance))).toString()
                                                    });
                                                } else {
                                                    account.tokens.push({
                                                        symbol: currency.toLowerCase(),
                                                        balance: upBalance,
                                                        balance_in: upBalance,
                                                        balance_out: '0'
                                                    });
                                                }
                                                account.set({
                                                    updated: Date.now()
                                                });
                                                account.tx_in.push(txId);
                                                await account.save();
    
                                                const data = {
                                                    client_id: account.client_id,
                                                    isTokenTransferTx: true,
                                                    address: account.address,
                                                    tx_id: txId,
                                                    blockNumber,
                                                    token: {
                                                        amount: upBalance.toString(),
                                                        symbol: config.TOKENS.EOS.CFT.SYMBOL.toLowerCase(),
                                                        decimals: config.TOKENS.EOS.CFT.DECIMALS
                                                    }
                                                };
    
                                                await db_model.ipn.create({
                                                    ...data,
                                                    currency: 'eos',
                                                    status: 2
                                                });
                                                await db_model.eosTx.create({
                                                    ...data,
                                                    confirmed: true,
                                                    failed: false
                                                });
                                                console.info(utils.helpers.emptyIndent(4) + '[INFO]', utils.helpers.getClientInfo(client), 'NEW INCOME TRANSACTION | address: '
                                                    + dataDeposit.memo + ', amount: ' + (new BN(upBalance).shiftedBy(-config.TOKENS.EOS.CFT.DECIMALS)).toString() + ' ' +
                                                    currency + ', TX id: ' + txId + ', block: ' + blockNumber);
                                            }
                                                break;
                                            default: {
                                                console.info('[RESPONSE]', utils.helpers.getClientInfo(client), 'CONTENT: Invalid params (currency or token not found)', '{400}');
                                            }
                                                break;
                                        }
                                    }
                                }
                            }
                            
                        }
                    }
                }
            } else {
                console.info('[INFO]', 'Transactions not found');
            }
            await db_model.block.updateOne({currency: 'eos'}, {
                $set: {
                    number: latestBlock,
                    timestamp: Math.round(new Date().getTime() / 1000.0)
                }
            });
            console.info('[INFO]', 'Next iteration in ' + config.CURRENCY.EOS.FILTER_TIMEOUT + ' sec');
            await utils.helpers.delay(config.CURRENCY.EOS.FILTER_TIMEOUT * 1000);
        }

    } catch (e) {
        await utils.helpers.delay(config.CURRENCY.EOS.FILTER_TIMEOUT * 1000);
        throw e;
    }
};