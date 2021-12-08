const Web3 = require('web3');
const path = require('path');
const web3 = new Web3();
// Utils
global.utils = {
    crypto: require(path.join(__dirname, '..', '..', 'utils', 'crypto')),
};

(async () => {
    try {
        const account = web3.eth.accounts.create();

        const address = account.address;
        console.log('address:', address);
        const privateKey = account.privateKey;
        console.log('privateKey:', privateKey);

        const privateKeyManagerAccount = utils.crypto.encrypt(privateKey, process.env.TOKEN_MANAGER_KEY_ETH);
        console.log('privateKeyManagerAccount',privateKeyManagerAccount);
    } catch (e) {
        console.error('error:', e);
    }
})();
