global.fetch = require('node-fetch');
global.WebSocket = require('ws');
const path = require('path');
const router = require('express').Router();
const BN = require('bignumber.js');
BN['config']({EXPONENTIAL_AT: 1e+9});
const coinSelect = require('coinselect');
const coinSelect_SPLIT = require('coinselect/split');
const axios = require('axios');
const rateLimit = require("express-rate-limit");
const boolean = require('boolean');

const rateLimiter = rateLimit({
    windowMs: 2 * 1000, // 2 sec
    max: 1, // 1 request
    statusCode: 420,
    message: "too many requests",
    onLimitReached: (req, res, options) => {
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: too many requests', '{420}');
    }
});

const rateLimiterTransfer = rateLimit({
    windowMs: 1 * 1000, // 1 sec
    max: 100, // 1 request
    statusCode: 420,
    message: "too many requests",
    onLimitReached: (req, res, options) => {
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: too many requests', '{420}');
    }
});

// Utils
const utils = {
    dfuse: require(path.join(__dirname, '..', '..', 'utils', 'dfuse')),
    helpers: require(path.join(__dirname, '..', '..', 'utils', 'helpers')),
    crypto: require(path.join(__dirname, '..', '..', 'utils', 'crypto')),
    auth: require(path.join(__dirname, '..', '..', 'utils', 'auth')),
};

// Models
const db_model = {
    account: require(path.join(__dirname, '..', '..', 'models', 'account')),
    client: require(path.join(__dirname, '..', '..', 'models', 'client')),
    withdraw: require(path.join(__dirname, '..', '..', 'models', 'withdraw')),
    eosInternalTokenTransfer: require(path.join(__dirname, '..', '..', 'models', 'eosInternalTokenTransfer')),
    buyCFTfromEOS: require(path.join(__dirname, '..', '..', 'models', 'buyCFTfromEOS')),
};

// Badma protection middleware
const checker = async (req, res, next) => {
    try {
        const _id = (typeof req.query.id !== 'undefined') ? req.query.id : null;
        const _amount = (typeof req.query.amount !== 'undefined') ? req.query.amount : null;
        const _to = (typeof req.query.to !== 'undefined') ? req.query.to : null;
        const _from = (typeof req.query.from !== 'undefined') ? req.query.from : null;
        const _currency = (typeof req.query.currency !== 'undefined') ? req.query.currency.toLowerCase() : null;
        const _symbol = (typeof req.query.symbol !== 'undefined') ? req.query.symbol : null;
        const _memo = (typeof req.query.memo !== 'undefined') ? req.query.memo : 'Transaction with push from CashFlash';
        
        const _isTokenTransferTx = (typeof req.query.isTokenTransferTx !== 'undefined') ? req.query.isTokenTransferTx : null;
        if (_id && _id !== '') {
            const order_by_id = await db_model.withdraw.findOne({client_id: req._client.id, order_id: _id});
            if (!order_by_id) {
                req._id = _id;
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: order is already processed', '{415}');
                return res.status(415).send('order is already processed');
            }
        } else {
            req._id = '';
        }

        if (_amount) {
            const amount_BN = new BN(_amount);
            if (amount_BN.isPositive() && amount_BN.isInteger() && !amount_BN.isZero()) {
                // if (amount_BN.isPositive() && amount_BN.isInteger()) {
                req._amount = _amount;
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (amount format)', '{400}');
                return res.status(400).send('Invalid params (amount format)');
            }
        } else {
            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (amount)', '{400}');
            return res.status(400).send('Invalid params (amount)');
        }

        req._from = _from;
        req._memo = _memo;

        if (_currency && _to) {
            const client_currency_index = req._client.currencies.findIndex(el => {
                return el.symbol.toLowerCase() === _currency && el.isActive;
            });
            if (client_currency_index !== -1) {
                req._currency = _currency;
                req._client_currency_index = client_currency_index;
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (currency)', '{400}');
                return res.status(400).send('Invalid params (currency)');
            }

            let withdrawals_query = {};

            req._symbol = _symbol;
            if (_symbol) {
                if (boolean(_isTokenTransferTx)) {
                    const token = Object.values(config.TOKENS.EOS).find(el => {
                        return el.SYMBOL.toLowerCase() === _symbol.toLowerCase();
                    });
                    if (typeof token !== 'undefined') {

                        const client_token_index = req._client.currencies[client_currency_index].tokens.findIndex(item => {
                            return item.symbol.toLowerCase() === _symbol.toLowerCase() && item.isActive
                        });
                        if (client_token_index !== -1) {
                            req._symbol = _symbol.toLowerCase();
                            req._token = token;
                            req._client_token_index = client_token_index;

                            withdrawals_query.createdTimestamp = {$gte: modules.time.nowTimestamp() - req._client.currencies[client_currency_index].tokens[client_token_index].withdraw_freeze};
                            withdrawals_query.isTokenTransferTx = true;
                        } else {
                            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (token not found)', '{400}');
                            return res.status(400).send('Invalid params (token not found)');
                        }
                    } else {
                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (token not found)', '{400}');
                        return res.status(400).send('Invalid params (token not found)');
                    }
                } else {
                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (isTokenTransferTx not found)', '{400}');
                    return res.status(400).send('Invalid params (isTokenTransferTx not found)');
                }
            } else {
                withdrawals_query.createdTimestamp = {$gte: modules.time.nowTimestamp() - req._client.currencies[client_currency_index].withdraw_freeze};
            }

            const withdrawals = await db_model.withdraw.find({
                client_id: req._client.id,
                currency: _currency,
                to: _to,
                ...withdrawals_query
            });
            if (withdrawals.length === 0) {
                switch (_currency) {
                    case 'eos': {
                        req._to = _to;

                        if (_symbol) {
                            if (!req._client.currencies[client_currency_index].tokens[req._client_token_index].isBusy) {
                                req._client.set({
                                    updated: Date.now()
                                });
                                req._client.currencies[client_currency_index].tokens[req._client_token_index].set({
                                    isBusy: true
                                });
                                await req._client.save();
                                return next();
                            } else {
                                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: tokens is busy', '{410}');
                                return res.status(410).send('tokens is busy');
                            }
                        } else {
                            if (!req._client.currencies[client_currency_index].isBusy) {
                                req._client.set({
                                    updated: Date.now()
                                });
                                req._client.currencies[client_currency_index].set({
                                    isBusy: true
                                });
                                await req._client.save();
                                return next();
                            } else {
                                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: currency is busy', '{410}');
                                return res.status(410).send('currency is busy');
                            }
                        }
                    }
                    default:
                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (currency)', '{400}');
                        return res.status(400).send('Invalid params (currency)');
                }
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'too many withdraw to the same address', '{421}');
                return res.status(421).send('too many withdraw to the same address');
            }
        } else {
            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (currency, to)', '{400}');
            return res.status(400).send('Invalid params (currency, to)');
        }
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
};

const checkerBuyToken = async (req, res, next) => {
    try {
        const _id = (typeof req.query.id !== 'undefined') ? req.query.id : null;
        const _amount_eos = (typeof req.query.amountEos !== 'undefined') ? req.query.amountEos : null;
        const _amount_cft = (typeof req.query.amountCft !== 'undefined') ? req.query.amountCft : null;
        const _from = (typeof req.query.from !== 'undefined') ? req.query.from : null;
        if (_id && _id !== '') {
            const order_by_id = await db_model.buyCFTfromEOS.findOne({client_id: req._client.id, order_id: _id});
            if (!order_by_id) {
                req._id = _id;
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: order buy token CFT from EOS is already processed', '{415}');
                return res.status(415).send('order buy token CFT from EOS is already processed');
            }
        } else {
            req._id = '';
        }

        if (_amount_eos) {
            const amount_eos_BN = new BN(_amount_eos);
            if (amount_eos_BN.isPositive() && amount_eos_BN.isInteger() && !amount_eos_BN.isZero()) {
                req._amount_eos = _amount_eos;
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (amount eos format)', '{400}');
                return res.status(400).send('Invalid params (amount eos format)');
            }
        } else {
            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (amount eos)', '{400}');
            return res.status(400).send('Invalid params (amount eos)');
        }

        if (_amount_cft) {
            const amount_cft_BN = new BN(_amount_cft);
            if (amount_cft_BN.isPositive() && amount_cft_BN.isInteger() && !amount_cft_BN.isZero()) {
                req._amount_cft = _amount_cft;
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (amount cft format)', '{400}');
                return res.status(400).send('Invalid params (amount cft format)');
            }
        } else {
            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (amount cft)', '{400}');
            return res.status(400).send('Invalid params (amount cft)');
        }

        req._from = _from;

        const client_currency_index = req._client.currencies.findIndex(el => {
            return el.symbol.toLowerCase() === 'eos' && el.isActive;
        });

        if (client_currency_index !== -1) {
            req._client_currency_index = client_currency_index;
        } else {
            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (currency "eos")', '{400}');
            return res.status(400).send('Invalid params (currency "eos")');
        }

        if (!req._client.currencies[client_currency_index].isBusy) {
            req._client.set({
                updated: Date.now()
            });
            req._client.currencies[client_currency_index].set({
                isBusy: true
            });
            await req._client.save();
            return next();
        } else {
            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: currency is busy', '{410}');
            return res.status(410).send('currency is busy');
        }
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
};

router.get('/transfer', rateLimiterTransfer, utils.auth.checkOTP, checker, async (req, res) => {
    try {
        const _id = req._id;
        const _amount = req._amount;
        const _to = req._to;
        const _from = req._from;
        const _currency = req._currency;
        const _symbol = req._symbol;
        const account_to = await db_model.account.findOne({
            address: _to
        });
        const account = await db_model.account.findOne({
            address: _from
        });
        const amount_BN = new BN(_amount);
        let balance_token_BN;
        switch (_currency) {
            case 'eos': {
                try {
                    if (_symbol) {
                        try {
                            if (account && account_to) {
                                const tokenIndex = account.tokens.findIndex(item => item.symbol === _symbol.toLowerCase());
                                if (tokenIndex !== -1) {
                                    balance_token_BN = new BN(account.tokens[tokenIndex].balance);
                                } else {
                                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: token not found', '{400}');
                                    return res.status(400).send('token not found');
                                }
                                const diff = amount_BN.isZero() ? balance_token_BN : balance_token_BN.minus(amount_BN);

                                if (diff.isPositive()) {
                                    try {
                                        const value = amount_BN.isZero() ? balance_token_BN.minus(amount_BN) : amount_BN;
                                        const current_balance_from = new BN(account.tokens[tokenIndex].balance).minus(value).toString();
                                        const current_balance_to =  new BN(account_to.tokens[tokenIndex].balance).plus(value).toString();

                                        if (tokenIndex !== -1) {
                                            account.tokens[tokenIndex].set({
                                                balance: current_balance_from,
                                                balance_out: (new BN(account.tokens[tokenIndex].balance_out).plus(value)).toString(),
                                                updated: Date.now()
                                            });

                                            account_to.tokens[tokenIndex].set({
                                                balance: current_balance_to,
                                                balance_in: (new BN(account_to.tokens[tokenIndex].balance_in).plus(value)).toString(),
                                                updated: Date.now()
                                            });

                                        }

                                        await db_model.eosInternalTokenTransfer.create({
                                            client_id: req._client.id,
                                            order_id: _id,
                                            currency: 'oes',
                                            from: _from,
                                            to: _to,
                                            isTokenTransferTx: true,
                                            amount_requested: _amount,
                                            amount_estimated: value.toString(),
                                            amount_transfer: value.toString(),
                                            "token.symbol": req._token.SYMBOL.toLowerCase(),
                                            "token.contract_address": req._token.ADDRESS,
                                            "token.decimals": req._token.DECIMALS,

                                            token_balance: {
                                                current_from: current_balance_from,
                                                current_to: current_balance_to
                                            },

                                            createdTimestamp: modules.time.nowTimestamp()
                                        });
                                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT (status): {200}');

                                        await account.save();
                                        await account_to.save();
                                        return res.status(200).json({
                                            currency: _currency,
                                            from: account.address,
                                            to: account_to.address,
                                            amount: value.toString(),
                                            current_balance_from,
                                            current_balance_to,
                                            token: req._token.SYMBOL
                                        });
                                    } catch (e) {
                                        utils.helpers.writeLog('api', 'error', req._client, e);
                                        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
                                        return res.status(500).send('internal server error');
                                    }
                                } else {
                                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: insufficient funds', '{450}');
                                    return res.status(450).send('insufficient funds');
                                }
                            } else {
                                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Accounts not found', '{450}');
                                return res.status(450).send('Accounts not found');
                            }
                        } catch (e) {
                            utils.helpers.writeLog('api', 'error', req._client, e);
                            console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
                            return res.status(500).send('internal server error');
                        } finally {
                            req._client.set({
                                updated: Date.now()
                            });
                            req._client.currencies[req._client_currency_index].tokens[req._client_token_index].set({
                                isBusy: false
                            });
                            await req._client.save();
                        }
                    } else {
                        try {
                            if (account && account_to) {
                                balance_token_BN = new BN(account.balance);
                                const diff = amount_BN.isZero() ? balance_token_BN : balance_token_BN.minus(amount_BN);
                                if (diff.isPositive()) {
                                    try {
                                        const value = amount_BN.isZero() ? balance_token_BN.minus(amount_BN) : amount_BN;
                                        await db_model.account.findByIdAndUpdate(account._id, {
                                            $set: {
                                                balance: new BN(account.balance).minus(value),
                                                balance_out: new BN(account.balance_out).plus(value),
                                                updated: Date.now()
                                            }
                                        });
                                        await db_model.account.findByIdAndUpdate(account_to._id, {
                                            $set: {
                                                balance: new BN(account_to.balance).plus(value),
                                                balance_in: new BN(account_to.balance_in).plus(value),
                                                updated: Date.now()
                                            }
                                        });

                                        await db_model.eosInternalTokenTransfer.create({
                                            client_id: req._client.id,
                                            order_id: _id,
                                            currency: 'oes',
                                            from: _from,
                                            to: _to,
                                            isTokenTransferTx: false,
                                            amount_requested: _amount,
                                            amount_estimated: value.toString(),
                                            amount_transfer: value.toString(),

                                            token_balance: {
                                                current_from: new BN(account.balance).minus(value).toString(),
                                                current_to: new BN(account_to.balance).plus(value).toString()
                                            },

                                            createdTimestamp: modules.time.nowTimestamp()
                                        });
                                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT (status): {200}');
                                        const current_balance_from = new BN(account.balance).minus(value).toString();
                                        const current_balance_to = new BN(account_to.balance).plus(value).toString();
                                        return res.status(200).json({
                                            from: account.address,
                                            to: account_to.address,
                                            amount: value.toString(),
                                            current_balance_from,
                                            current_balance_to,
                                            currency: _currency
                                        });
                                    } catch (e) {
                                        utils.helpers.writeLog('api', 'error', req._client, e);
                                        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
                                        return res.status(500).send('internal server error');
                                    }
                                } else {
                                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: insufficient funds', '{450}');
                                    return res.status(450).send('insufficient funds');
                                }
                            } else {
                                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Accounts not found', '{450}');
                                return res.status(450).send('Accounts not found');
                            }
                        } catch (e) {
                            utils.helpers.writeLog('api', 'error', req._client, e);
                            console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
                            return res.status(500).send('internal server error');
                        } finally {
                            req._client.set({
                                updated: Date.now()
                            });
                            req._client.currencies[req._client_currency_index].set({
                                isBusy: false
                            });
                            await req._client.save();
                        }
                    }
                } catch (e) {
                    utils.helpers.writeLog('api', 'error', req._client, e);
                    console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
                    return res.status(500).send('internal server error');
                } finally {
                    req._client.set({
                        updated: Date.now()
                    });
                    req._client.currencies[req._client_currency_index].set({
                        isBusy: false
                    });
                    await req._client.save();
                }
            }
                break;
        }
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
});

router.get('/withdraw', rateLimiter, utils.auth.checkOTP, checker, async (req, res) => {
    try {
        const _id = req._id;
        const _amount = req._amount;
        const _to = req._to;
        const _from = req._from;
        const _currency = req._currency;
        const _symbol = req._symbol;
        const _memo = req._memo;

        // init dFuse
        const {createDfuseClient} = require('@dfuse/client');
        const configDfuse = await utils.dfuse.readConfig();
        const clientDfuse = createDfuseClient({apiKey: configDfuse.dfuseApiKeyNative, network: configDfuse.network});
        const customizedFetch = async (input, init) => {
            if (init === undefined) {
                init = {}
            }
            if (init.headers === undefined) {
                init.headers = {}
            }
            const apiTokenInfo = await clientDfuse.getTokenInfo();
            const headers = init.headers;
            headers["Authorization"] = `Bearer ${apiTokenInfo.token}`;
            headers["X-Eos-Push-Guarantee"] = config.CURRENCY.EOS.push_guaranteed;
            return fetch(input, init)
        };
        const {Api, JsonRpc} = require('eosjs');
        const {JsSignatureProvider} = require('eosjs/dist/eosjs-jssig');
        const {TextDecoder, TextEncoder} = require('text-encoding');
        const rpc = new JsonRpc(clientDfuse.endpoints.restUrl, {fetch: customizedFetch});
        // end init dFuse
        const signatureProvider = new JsSignatureProvider([configDfuse.privateKey]);
        const amount_BN = new BN(_amount);
        const account = await db_model.account.findOne({
            address: _from
        });
        let balance_token_BN;
        switch (_currency) {
            case 'eos': {
                try {
                    if (_symbol) {
                        try {
                            const tokenIndex = account.tokens.findIndex(item => item.symbol === _symbol.toLowerCase());
                            if (tokenIndex !== -1) {
                                balance_token_BN = new BN(account.tokens[tokenIndex].balance);
                            } else {
                                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: token not found', '{400}');
                                return res.status(400).send('token not found');
                            }
                            const diff = amount_BN.isZero() ? balance_token_BN : balance_token_BN.minus(amount_BN);
                            if (diff.isPositive()) {
                                try {
                                    const value = amount_BN.isZero() ? balance_token_BN.minus(amount_BN) : amount_BN;

                                    const transferAction = {
                                        account: config.TOKENS.EOS.CFT.ADDRESS,
                                        name: "transfer",
                                        authorization: [
                                            {
                                                actor: config.CURRENCY.EOS.baseAccountName,
                                                permission: "active"
                                            }
                                        ],
                                        data: {
                                            from: config.CURRENCY.EOS.baseAccountName,
                                            to: _to,
                                            quantity: value.shiftedBy(-config.TOKENS.EOS.CFT.DECIMALS).toFixed(4).toString() + ' ' + config.CURRENCY.EOS.token_name_currency,
                                            memo: _memo
                                        }
                                    };

                                    const api = new Api({
                                        rpc,
                                        signatureProvider,
                                        textDecoder: new TextDecoder(),
                                        textEncoder: new TextEncoder()
                                    });
                                    const transaction = await api.transact(
                                        {actions: [transferAction]},
                                        {
                                            blocksBehind: 360,
                                            expireSeconds: 3600
                                        }
                                    );
                                    const result = [{
                                        tx_id: transaction.transaction_id,
                                        amount: _amount
                                    }];
                                    if (typeof transaction.transaction_id !== 'undefined') {
                                        await db_model.withdraw.create({
                                            client_id: req._client.id,
                                            order_id: _id,
                                            currency: 'eos',
                                            to: _to,
                                            isTokenTransferTx: true,

                                            "token.symbol": req._token.SYMBOL.toLowerCase(),
                                            "token.contract_address": req._token.ADDRESS,
                                            "token.decimals": req._token.DECIMALS,

                                            amount_requested: _amount,
                                            amount_estimated: value.toString(),
                                            amount_sent: value.toString(),

                                            token_balance: {
                                                current: balance_token_BN.minus(value).toString()
                                            },

                                            txs: result,
                                            createdTimestamp: modules.time.nowTimestamp()
                                        });

                                        if (tokenIndex !== -1) {
                                            account.tokens[tokenIndex].set({
                                                balance: balance_token_BN.minus(value).toString(),
                                                balance_out: (new BN(account.tokens[tokenIndex].balance_out).plus(value)).toString()
                                            });
                                        }
                                        account.set({
                                            updated: Date.now()
                                        });
                                        account.tx_out.push(transaction.transaction_id);
                                        await account.save();

                                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: ' + JSON.stringify(result), '{200}');
                                        return res.status(200).json(result);
                                    }
                                } catch (e) {
                                    utils.helpers.writeLog('api', 'error', req._client, e);
                                    console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
                                    return res.status(500).send('internal server error');
                                }
                            } else {
                                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: insufficient funds', '{450}');
                                return res.status(450).send('insufficient funds');
                            }
                        } catch (e) {
                            utils.helpers.writeLog('api', 'error', req._client, e);
                            console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
                            return res.status(500).send('internal server error');
                        } finally {
                            req._client.set({
                                updated: Date.now()
                            });
                            req._client.currencies[req._client_currency_index].tokens[req._client_token_index].set({
                                isBusy: false
                            });
                            await req._client.save();
                        }
                    } else {
                        balance_token_BN = new BN(account.balance);
                        const diff = amount_BN.isZero() ? balance_token_BN : balance_token_BN.minus(amount_BN);
                        if (diff.isPositive()) {
                            try {
                                const value = amount_BN.isZero() ? balance_token_BN.minus(amount_BN) : amount_BN;

                                const transferAction = {
                                    account: config.CURRENCY.EOS.ADDRESS,
                                    name: "transfer",
                                    authorization: [
                                        {
                                            actor: config.CURRENCY.EOS.baseAccountName,
                                            permission: "active"
                                        }
                                    ],
                                    data: {
                                        from: config.CURRENCY.EOS.baseAccountName,
                                        to: _to,
                                        quantity: (new BN(value).shiftedBy(-config.CURRENCY.EOS.DECIMALS)).toFixed(4).toString() + ' ' + config.CURRENCY.EOS.base_name_currency,
                                        memo: _memo
                                    }
                                };
                                const api = new Api({
                                    rpc,
                                    signatureProvider,
                                    textDecoder: new TextDecoder(),
                                    textEncoder: new TextEncoder()
                                });
                                const transaction = await api.transact(
                                    {actions: [transferAction]},
                                    {
                                        blocksBehind: 360,
                                        expireSeconds: 3600
                                    }
                                );
                                const result = [{
                                    tx_id: transaction.transaction_id,
                                    amount: _amount
                                }];
                                if (typeof transaction.transaction_id !== 'undefined') {
                                    await db_model.withdraw.create({
                                        client_id: req._client.id,
                                        order_id: _id,
                                        currency: 'eos',
                                        to: _to,
                                        isTokenTransferTx: false,
                                        amount_requested: _amount,
                                        amount_estimated: value.toString(),
                                        amount_sent: value.toString(),

                                        token_balance: {
                                            current: balance_token_BN.minus(value).toString()
                                        },

                                        txs: result,
                                        createdTimestamp: modules.time.nowTimestamp()
                                    });
                                    await db_model.account.findByIdAndUpdate(account._id, {
                                        $set: {
                                            balance: (new BN(account.balance).minus(value)).toString(),
                                            balance_out: (new BN(account.balance_out).plus(value)).toString(),
                                            updated: Date.now()
                                        },
                                        $push: {
                                            tx_out: transaction.transaction_id
                                        }
                                    });
                                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: ' + JSON.stringify(result), '{200}');
                                    return res.status(200).json(result);
                                }
                            } catch (e) {
                                utils.helpers.writeLog('api', 'error', req._client, e);
                                console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
                                return res.status(500).send(`internal server error ${e.toString()}`);
                            }
                        } else {
                            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: insufficient funds', '{450}');
                            return res.status(450).send('insufficient funds');
                        }
                    }
                } catch (e) {
                    utils.helpers.writeLog('api', 'error', req._client, e);
                    console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
                    return res.status(500).send('internal server error');
                } finally {
                    req._client.set({
                        updated: Date.now()
                    });
                    req._client.currencies[req._client_currency_index].set({
                        isBusy: false
                    });
                    await req._client.save();
                }
            }
        }
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send(`internal server error ${e.toString()}`);
    }
});

router.get('/buytoken', rateLimiter, utils.auth.checkOTP, checkerBuyToken, async (req, res) => {
    try {
        const _id = req._id;
        const _amount_eos = req._amount_eos;
        const _amount_cft = req._amount_cft;
        const _from = req._from;

        const account = await db_model.account.findOne({
            address: _from
        });

        const account_issuer = await db_model.account.findOne({
            address: config.CURRENCY.EOS.issuer_cft_acc
        });

        const amount_BN = new BN(_amount_eos);
        const balance_BN = new BN(account.balance);

        const tokenIndex = account.tokens.findIndex(item => item.symbol === 'cft');
        const tokenIndex_issuer = account_issuer.tokens.findIndex(item => item.symbol === 'cft');
        const balance_issuer_BN = new BN(account_issuer.tokens[tokenIndex_issuer].balance);

        const diff = amount_BN.isZero() ? balance_BN : balance_BN.minus(amount_BN);
        if (diff.isPositive()) {
            try {
                const value = amount_BN.isZero() ? balance_BN.minus(amount_BN) : amount_BN;
                const requestCFT = new BN(_amount_cft);
                const diff_issuer = balance_issuer_BN.minus(requestCFT);
                if (diff_issuer.isPositive()) {
                    try {
                        const current_EOS = new BN(account.balance).minus(value).toString();
                        const current_CFT = new BN(account.tokens[tokenIndex].balance).plus(requestCFT).toString();
                        account.set({
                            balance: current_EOS,
                            balance_out: (new BN(account.balance_out).plus(value)).toString(),
                            updated: Date.now()
                        });
                        account.tokens[tokenIndex].set({
                            balance: current_CFT,
                            balance_in: (new BN(account.tokens[tokenIndex].balance_in).plus(requestCFT)).toString(),
                            updated: Date.now()
                        });

                        account_issuer.set({
                            balance: new BN(account_issuer.balance).plus(value).toString(),
                            balance_in: (new BN(account_issuer.balance_in).plus(value)).toString(),
                            updated: Date.now()
                        });
                        account_issuer.tokens[tokenIndex_issuer].set({
                            balance: new BN(account_issuer.tokens[tokenIndex_issuer].balance).minus(requestCFT).toString(),
                            balance_in: (new BN(account_issuer.tokens[tokenIndex_issuer].balance_in).plus(requestCFT)).toString(),
                            updated: Date.now()
                        });

                        await db_model.buyCFTfromEOS.create({
                            client_id: req._client.id,
                            order_id: _id,
                            currency_sell: 'oes',
                            currency_buy: 'cft',
                            from: _from,
                            isTokenTransferTx: true,
                            amount_requested: _amount_eos.toString(),
                            amount_estimated: value.toString(),
                            amount_buy: requestCFT.toString(),
                            rate: config.CURRENCY.EOS.rate_eos_cft,

                            token_balance: {
                                current_EOS,
                                current_CFT,
                                current_issuer_EOS: new BN(account_issuer.balance).plus(value).toString(),
                                current_issuer_CFT: new BN(account_issuer.tokens[tokenIndex_issuer].balance).minus(requestCFT).toString()
                            },

                            createdTimestamp: modules.time.nowTimestamp()
                        });

                        await account.save();
                        await account_issuer.save();
                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT (status): {200}');
                        return res.status(200).json({
                            from: account.address,
                            amount_EOS: value.toString(),
                            amount_CFT: requestCFT.toString(),
                            current_EOS,
                            current_CFT
                        });

                    } catch (e) {
                        utils.helpers.writeLog('api', 'error', req._client, e);
                        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
                        return res.status(500).send('internal server error');
                    }
                } else {
                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: insufficient funds issuer account', '{450}');
                    return res.status(450).send('insufficient funds issuer account');
                }
            } catch (e) {
                utils.helpers.writeLog('api', 'error', req._client, e);
                console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
                return res.status(500).send('internal server error');
            }
        } else {
            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: insufficient funds', '{450}');
            return res.status(450).send('insufficient funds');
        }
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    } finally {
        req._client.set({
            updated: Date.now()
        });
        req._client.currencies[req._client_currency_index].set({
            isBusy: false
        });
        await req._client.save();
    }
})

router.get('/withdraw-list', async (req, res) => {
    try {
        const _id = (typeof req.query.id !== 'undefined') ? req.query.id : null;
        const _to = (typeof req.query.to !== 'undefined') ? req.query.to : null;
        const _currency = (typeof req.query.currency !== 'undefined') ? req.query.currency.toLowerCase() : null;
        const _reverse = (typeof req.query.reverse !== 'undefined') ? req.query.reverse : null;
        let _limit = (typeof req.query.limit !== 'undefined') ? req.query.limit : null;
        let _offset = (typeof req.query.offset !== 'undefined') ? req.query.offset : null;

        if (_limit) {
            if (utils.helpers.stringIsPositiveInteger(_limit)) {
                _limit = parseInt(req.query.limit);
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: invalid params', '{400}');
                return res.status(400).send('invalid params');
            }
        } else {
            _limit = 10;
        }

        if (_offset) {
            if (utils.helpers.stringIsPositiveInteger(_offset)) {
                _offset = parseInt(req.query.offset);
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: invalid params', '{400}');
                return res.status(400).send('invalid params');
            }
        } else {
            _offset = 0;
        }

        let sort;
        if (_reverse) {
            sort = boolean(_reverse) ? 'desc' : 'asc';
        } else {
            sort = 'asc';
        }

        let query = {};
        if (_id) query.order_id = _id;
        if (_currency) query.currency = _currency;
        if (_to) query.to = _currency && _currency === 'eth' ? _to.toLowerCase() : _to;

        const txs = await db_model.withdraw.find(query, {_id: false}).skip(_offset).limit(_limit).sort({created: sort});

        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT (length): ' + txs.length, '{200}');
        return res.status(200).json(txs);
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
});

router.post('/send-signed-tx', async (req, res) => {
    try {
        const _currency = (typeof req.body.currency !== 'undefined') ? req.body.currency.toLowerCase() : null;
        const _signedTransaction = (typeof req.body.signedTransaction !== 'undefined') ? req.body.signedTransaction : null;

        switch (_currency) {
            case 'eth': {
                try {
                    const result = await rpc.eth.sendSignedTransactionInstantly(_signedTransaction);
                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: ' + result, '{200}');
                    return res.status(200).send(result);
                } catch (e) {
                    utils.helpers.writeLog('api', 'error', req._client, e);
                    console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
                    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: ' + e.toString(), '{550}');
                    return res.status(550).send(e.toString());
                }
            }
            default:
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: invalid params', '{400}');
                return res.status(400).send('invalid params');
        }
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
});

module.exports = router;
