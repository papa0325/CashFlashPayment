const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const boolean = require('boolean');

const rateLimiter = rateLimit({
    windowMs: 1 * 1000, //1 sec
    max: 10, // 3 requests
    statusCode: 420,
    message: 'too many requests',
    onLimitReached: (req, res, options) => {
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: too many requests', '{420}');
    }
});

router.get('/address', rateLimiter, async (req, res) => {
    try {
        const _address = (typeof req.query.address !== 'undefined') ? req.query.address.toLowerCase() : null;
        const _currency = (typeof req.query.currency !== 'undefined') ? req.query.currency.toLowerCase() : null;
        const _reserve = (typeof req.query.reserve !== 'undefined') ? req.query.reserve : null;

        const checkReg = new RegExp(/^[a-z1-5]{12}$/g);

        if (_address) {
            if (!checkReg.test(_address)) {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid format address', '{400}');
                return res.status(400).send('Invalid format address');
            }
            const addressExist = await db_model.account.findOne({address: _address.toLowerCase()});
            if (addressExist) {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Address exist', '{400}');
                return res.status(400).send('Address exist');
            }
        }
        if (_currency) {
            const client_currency_index = req._client.currencies.findIndex(el => {
                return el.symbol === _currency && el.isActive === true;
            });

            if (client_currency_index !== -1) {
                switch (_currency) {
                    case 'eos': {
                        let data = {
                            currency: 'eos',
                            address: _address,
                            client_id: req._client.id,
                            tokens: [{
                                symbol : 'cft',
                                balance : '0',
                                balance_in : '0',
                                balance_out : '0',
                                decimals : 4
                            }]
                        };

                        const createdDate = new Date();

                        const isReserve = boolean(_reserve);
                        data.isReserve = isReserve;
                        if (!isReserve) {
                            data.expires = modules.time.addToDate(createdDate, req._client.currencies[client_currency_index].lifeTime, 'seconds');
                            data.expiresTimestamp = modules.time.dateTimestamp(createdDate) + req._client.currencies[client_currency_index].lifeTime;
                        }

                        await db_model.account.create(data);

                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: ' + _address, '{200}');
                        return res.status(200).send(_address);
                    }
                    default:
                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (currency)', '{400}');
                        return res.status(400).send('Invalid params (currency)');
                }
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (currency not found)', '{400}');
                return res.status(400).send('Invalid params (currency not found)');
            }
        } else {
            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (no currency)', '{400}');
            return res.status(400).send('CONTENT: Invalid params (no currency)');
        }
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
});

router.get('/addresses-list', async (req, res) => {
    try {
        const _currency = (typeof req.query.currency !== 'undefined') ? req.query.currency.toLowerCase() : null;
        const _reverse = (typeof req.query.reverse !== 'undefined') ? req.query.reverse : null;
        const _reserve = (typeof req.query.reserve !== 'undefined') ? req.query.reserve : null;
        const _includeZeroBalance = (typeof req.query.includeZeroBalance !== 'undefined') ? req.query.includeZeroBalance : null;
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
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (offset)', '{400}');
                return res.status(400).send('Invalid params (offset)');
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

        let query = {
            client_id: req._client.id
        };

        if (_reserve) {
            query.isReserve = boolean(_reserve);
        }

        if (!_includeZeroBalance || (_includeZeroBalance && !boolean(_includeZeroBalance))) {
            query = {
                ...query,
                $or: [{balance: {$exists: true, $ne: '0'}}, {balance_pending: {$exists: true, $ne: '0'}}]
            };
        }

        if (_currency) {
            const client_active_currencies = req._client.currencies.filter(item => item.isActive).map(item => item.symbol);
            if (client_active_currencies.indexOf(_currency) !== -1) {
                switch (_currency) {
                    case 'eos': {
                        const accounts = await db_model.account.find({currency: 'eos', ...query}, {
                            _id: false,
                            tokens: true,
                            currency: true,
                            address: true,
                            balance: true,
                            balance_pending: true,
                            isReserve: true
                        }).skip(_offset).limit(_limit).sort({created: sort}).lean();
                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT (length): ' + accounts.length, '{200}');
                        return res.status(200).json(accounts);
                    }
                    default:
                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (currency)', '{400}');
                        return res.status(400).send('Invalid params (currency)');
                }
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (currency not found)', '{400}');
                return res.status(400).send('Invalid params (currency not found)');
            }
        } else {
            const client_active_currencies = req._client.currencies.filter(item => item.isActive).map(item => item.symbol);
            const accounts = await db_model.account.find({currency: {$in: client_active_currencies}, ...query}, {
                _id: false,
                currency: true,
                address: true,
                balance: true,
                balance_pending: true,
                isReserve: true
            }).skip(_offset).limit(_limit).sort({created: sort}).lean();
            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT (length): ' + accounts.length, '{200}');
            return res.status(200).json(accounts);
        }
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
});

router.get('/address-info', async (req, res) => {
    try {
        const _currency = (typeof req.query.currency !== 'undefined') ? req.query.currency.toLowerCase() : null;
        const _address = (typeof req.query.address !== 'undefined') ? req.query.address.toLowerCase() : null;

        if (_currency && _address) {
            const client_active_currencies = req._client.currencies.filter(item => item.isActive).map(item => item.symbol);
            if (client_active_currencies.indexOf(_currency) !== -1) {
                switch (_currency) {
                    case 'eos': {
                        const account = await db_model.account.findOne({
                            currency: 'eos',
                            address: _address,
                            client_id: req._client.id
                        }, {
                            _id: false,
                            currency: true,
                            balance: true,
                            balance_pending: true,
                            address: true,
                            tokens: true,
                            isReserve: true,
                            tx_in: true,
                            tx_out: true,
                            created: true,
                            updated: true
                        }).lean();
                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT (found): ' + account ? 'true' : 'false', '{200}');
                        return res.status(200).json(account);
                    }
                    default:
                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (currency)', '{400}');
                        return res.status(400).send('Invalid params (currency)');
                }
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (currency not found)', '{400}');
                return res.status(400).send('Invalid params (currency not found)');
            }
        } else {
            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: Invalid params (currency or address must be present)', '{400}');
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

