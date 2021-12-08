const router = require('express').Router();
const boolean = require('boolean');

router.get('/ipn', async (req, res) => {
    try {
        const _currency = (typeof req.query.currency !== 'undefined') ? req.query.currency.toLowerCase() : null;
        const _address = (typeof req.query.address !== 'undefined') ? req.query.address : null;
        const _reverse = (typeof req.query.reverse !== 'undefined') ? req.query.reverse : null;
        let _limit = (typeof req.query.limit !== 'undefined') ? req.query.limit : null;
        let _offset = (typeof req.query.offset !== 'undefined') ? req.query.offset : null;

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

        if (_offset) {
            if(utils.helpers.stringIsPositiveInteger(_offset)) {
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

        let query = {
            client_id: req._client.id
        };

        const client_active_currencies = req._client.currencies.filter(item => item.isActive).map(item => item.symbol);
        if (_currency) {
            if (client_active_currencies.indexOf(_currency) !== -1) {
                query.currency = _currency;
            } else {
                console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: invalid params', '{400}');
                return res.status(400).send('invalid params');
            }
        } else {
            query.currency = {$in: client_active_currencies};
        }

        if (_address) query.address = _currency && _currency === 'eth' ? _address.toLowerCase() : _address;

        const IPNs = await db_model.ipn.find(query, {_id: false, client_id: false, attemptSendNotifyTimestamp: false, attemptSendResultTimestamp: false}).skip(_offset).limit(_limit).sort({created: sort}).lean();

        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT (length): ' + IPNs.length, '{200}');
        return res.status(200).json(IPNs);
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
});

module.exports = router;