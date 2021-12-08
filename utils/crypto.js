const crypto = require("crypto");
const path = require('path');

// Config
const _config = require(path.join(__dirname, '..', 'lib', 'config'));

exports.encrypt = (data, key) => {
    let cipher = crypto.createCipher('aes-256-cbc', (typeof key !== 'undefined') ? key : process.env.CRYPTO_KEY);
    let crypted = cipher.update(data, 'utf-8', 'hex');
    crypted += cipher.final('hex');

    return crypted;
};

exports.decrypt = (data, key) => {
    let decipher = crypto.createDecipher('aes-256-cbc', (typeof key !== 'undefined') ? key : process.env.CRYPTO_KEY);
    let decrypted = decipher.update(data, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
};
