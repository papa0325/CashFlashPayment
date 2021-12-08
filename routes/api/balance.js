const router = require('express').Router();
const BN = require('bignumber.js');
BN['config']({EXPONENTIAL_AT: 1e+9});

router.get('/balance', async (req, res) => {
    try {
        const _currency = (typeof req.query.currency !== 'undefined') ? req.query.currency.toLowerCase() : null;

        if (_currency) {
            const client_active_currencies = req._client.currencies.filter(item => item.isActive).map(item => item.symbol);
            if (client_active_currencies.indexOf(_currency) !== -1) {
                switch (_currency) {
                    case 'eth': {
                        const _symbol = (typeof req.query.symbol !== 'undefined') ? req.query.symbol : null;

                        if (_symbol) {
                            const token = Object.values(config.TOKENS.ETH).find(el => {
                                return el.SYMBOL.toLowerCase() === _symbol.toLowerCase();
                            });
                            if (typeof token !== 'undefined') {
                                const client_currency = req._client.currencies.find(item => item.symbol.toLowerCase() === 'eth');
                                if (typeof client_currency !== 'undefined') {
                                    const client_token = client_currency.tokens.find(item => item.symbol.toLowerCase() === _symbol.toLowerCase() && item.isActive);
                                    if (typeof client_token !== 'undefined') {
                                        const balance = await rpc.eth.contractMethod({
                                            contract: {
                                                abi: config.CURRENCY.ETH.ABI.ERC20,
                                                address: token.ADDRESS
                                            },
                                            name: 'balanceOf',
                                            params: [client_token.manager.address]
                                        });

                                        const result = {
                                            current: balance,
                                            decimals: token.DECIMALS
                                        };

                                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: ' + JSON.stringify(result), '{200}');
                                        return res.status(200).json(result);
                                    } else {
                                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: invalid params', '{400}');
                                        return res.status(400).send('invalid params');
                                    }
                                } else {
                                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: invalid params', '{400}');
                                    return res.status(400).send('invalid params');
                                }
                            } else {
                                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: invalid params', '{400}');
                                return res.status(400).send('invalid params');
                            }
                        } else {
                            const accounts = await db_model.account.find({currency: 'eth', client_id: req._client.id, $or: [{balance: {$exists: true, $ne: '0'}}, {balance_pending: {$exists: true, $ne: '0'}}]}).lean();

                            const result = {
                                current: (accounts.reduce((acc, account) => new BN(acc).plus(new BN(account.balance)), 0)).toString(),
                                pending: (accounts.reduce((acc, account) => new BN(acc).plus(new BN(account.balance_pending)), 0)).toString()
                            };

                            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: ' + JSON.stringify(result), '{200}');
                            return res.status(200).json(result);
                        }
                    }
                    default:
                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: invalid params', '{400}');
                        return res.status(400).send('invalid params');
                }
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: invalid params', '{400}');
                return res.status(400).send('invalid params');
            }
        } else {
            const client_active_currencies = req._client.currencies.filter(item => item.isActive).map(item => item.symbol);
            const accounts = await db_model.account.find({client_id: req._client.id, currency: {$in: client_active_currencies}, $or: [{balance: {$exists: true, $ne: '0'}}, {balance_pending: {$exists: true, $ne: '0'}}]}).lean();
            let result = {};
            for (const item of client_active_currencies) {
                const filteredAccounts = accounts.filter(account => account.currency === item);

                result[item] = {
                    current: (filteredAccounts.reduce((acc, account) => new BN(acc).plus(new BN(account.balance)), 0)).toString(),
                    pending: (filteredAccounts.reduce((acc, account) => new BN(acc).plus(new BN(account.balance_pending)), 0)).toString()
                };
            }
            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: ' + JSON.stringify(result), '{200}');
            return res.status(200).json(result);
        }
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
});

module.exports = router;
