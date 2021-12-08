const Web3 = require('web3');

const web3 = new Web3();

const privateKey = '';
const password = '';

(async () => {
    try {
        const keystore = web3.eth.accounts.encrypt(privateKey, password);
        console.log('Keystore:', JSON.stringify(keystore, null, 2));
    } catch (e) {
        console.error('error:', e);
    }
})();
