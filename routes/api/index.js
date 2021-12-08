const router = require('express').Router();

const address = require('./address');
const balance = require('./balance');
const tx = require('./tx');
const transfer = require('./transfer');
const block = require('./block');
const ipn = require('./ipn');

router.use(address, balance, tx, transfer, block, ipn);

module.exports = router;