const router = require('express').Router();

router.get('/block', async (req, res) => {
    try {
        const _currency = (typeof req.query.currency !== 'undefined') ? req.query.currency.toLowerCase() : null;

        if (_currency) {
            const client_active_currencies = req._client.currencies.filter(item => item.isActive).map(item => item.symbol);
            if (client_active_currencies.indexOf(_currency) !== -1) {
                switch (_currency) {
                    case 'eos': {
                        const block = await db_model.block.findOne({currency: _currency}, {_id: false}).lean();

                        const result = (block.number).toString();

                        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: ' + result, '{200}');
                        return res.status(200).send(result);
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

            const result = await db_model.block.find({currency: {$in: client_active_currencies}}, {_id: false}).lean();

            console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: ' + JSON.stringify(result), '{200}');
            return res.status(200).send(result);
        }
    } catch (e) {
        utils.helpers.writeLog('api', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
});

module.exports = router;
