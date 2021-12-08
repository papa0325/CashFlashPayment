const router = require('express').Router();
const boolean = require('boolean');
const rateLimit = require("express-rate-limit");
const path = require('path');
const fs = require('fs');
const os = require('os');

const rateLimiter = rateLimit({
    windowMs: 2 * 1000, // 2 sec
    max: 1, // 1 request
    statusCode: 420,
    message: "too many requests",
    onLimitReached: (req, res, options) => {
        console.info('[RESPONSE]', 'too many requests', '{420}');
    }
});

router.get('/', utils.auth.checkOTP, (req, res) => {
    try {
        return res.sendStatus(200);
    } catch (e) {
        console.error('[ERROR]', e.toString());
        console.info('[RESPOND]', '{500}');
        return res.status(500).send('internal server error');
    }
});

// router.get('/test', async (req, res) => {
//     try {
//         const accounts = await db_model.account.find({currency: 'btc', $or: [{balance: {$exists: true, $ne: '0'}}, {balance_pending: {$exists: true, $ne: '0'}}]}, {_id: false, address: true, balance: true, balance_pending: true}).lean();
//         res.json(accounts);
//     } catch (e) {
//         console.error('[ERROR]', e.toString());
//         console.info('[RESPOND]', '{500}');
//         return res.status(500).send('internal server error');
//     }
// });

module.exports = router;
