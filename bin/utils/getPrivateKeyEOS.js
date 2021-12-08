const path = require('path');

// Utils
global.utils = {
    crypto: require(path.join(__dirname, '..', '..', 'utils', 'crypto')),
};

(async () => {
    try {
        const privateKey = process.env.SIGNING_PRIVATE_KEY;
        console.log('privateKey:', privateKey);

        const privateKeyManagerAccount = utils.crypto.encrypt(privateKey, process.env.TOKEN_MANAGER_KEY_EOS);
        console.log('privateKeyManagerAccount',privateKeyManagerAccount);
    } catch (e) {
        console.error('error:', e);
    }
})();
