const path = require('path');

// Config
const config = require(path.join(__dirname, '..', '..', 'lib', 'config'));

// Utils
const crypto = require(path.join(__dirname, '..', '..', 'utils', 'crypto'));

// console.log(crypto.encrypt('', ''));
// console.log(crypto.decrypt('', ''));

// console.log(crypto.encrypt('', process.env.TOKEN_MANAGER_KEY_ETH));
// console.log(crypto.decrypt('', process.env.TOKEN_MANAGER_KEY_ETH));