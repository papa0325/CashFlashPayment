const router = require('express').Router();
const boolean = require('boolean');

router.get('/tx', async (req, res) => {
    try {
        const _currency = (typeof req.query.currency !== 'undefined') ? req.query.currency.toLowerCase() : null;
        const _address = (typeof req.query.address !== 'undefined') ? req.query.address : null;
        const _reverse = (typeof req.query.reverse !== 'undefined') ? req.query.reverse : null;
        let _limit = (typeof req.query.limit !== 'undefined') ? req.query.limit : null;
        let _skip = (typeof req.query.skip !== 'undefined') ? req.query.skip : null;

        if (_limit) {
            if(utils.helpers.stringIsPositiveInteger(_limit)) {
                _limit = parseInt(req.query.limit);
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: invalid params', '{400}');
                return res.status(400).send('invalid params');
            }
        } else {
            _limit = 10;
        }

        if (_skip) {
            if(utils.helpers.stringIsPositiveInteger(_skip)) {
                _skip = parseInt(req.query.skip);
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: invalid params', '{400}');
                return res.status(400).send('invalid params');
            }
        } else {
            _skip = 0;
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

        if (_currency) {
            const client_active_currencies = req._client.currencies.filter(item => item.isActive).map(item => item.symbol);
            if (client_active_currencies.indexOf(_currency) !== -1) {
                switch (_currency) {
                    case 'eth': {
                        if (_address) query.address = _address.toLowerCase();
                        const txs = await db_model.ethTx.find(query, {_id: false}).skip(_skip).limit(_limit).sort({created: sort}).lean();

                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT (length): ' + txs.length, '{200}');
                        return res.status(200).json(txs);
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
