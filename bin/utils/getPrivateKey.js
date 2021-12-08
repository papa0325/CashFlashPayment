const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
// Utils
global.utils = {
    crypto: require(path.join(__dirname, '..', '..', 'utils', 'crypto')),
};

async function getPrivateKey(hashKey, pass) {
    try {
        console.log(utils.crypto.decrypt(hashKey, pass === '0' ? process.env.TOKEN_MANAGER_KEY_EOS : process.env.CRYPTO_KEY));
    } catch (e) {
        console.error('error:', e);
    }
}

rl.question('Input hash key password  ', (hashKey) => {
    rl.question('Input number password manager or client (0 - manager, 1 - client) ', (pass) => {
        getPrivateKey(hashKey, pass);
        rl.close();
    });
});

