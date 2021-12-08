const Web3 = require('web3');

const web3 = new Web3();

const keystore = '';
const password = '';

(async () => {
    try {
        const wallet = await web3.eth.accounts.decrypt(keystore, password, true);
        console.log('Private key:', wallet.privateKey);
    } catch (e) {
        console.error('error:', e);
    }
})();