const path = require('path');

// Config
const config = require(path.join(__dirname, '..', '..', 'lib', 'config'));

// Utils
const crypto = require(path.join(__dirname, '..', '..', 'utils', 'crypto'));
const db = require(path.join(__dirname, '..', '..', 'utils', 'db'));

// Models
const db_model = {
    account: require(path.join(__dirname, '..', '..', 'models', 'account'))
};

const oldCryptoKey = '';
const newCryptoKey = '';

(async() => {
    try {
        console.info('****************************************************************************************************');
        console.info('[INFO]', 'Start crypto key update script');
        await db.connect();

        const accounts = await db_model.account.find({});
        if (accounts.length !== 0) {
            console.info('[INFO]', 'Start processing accounts (' + accounts.length + ')');
            let counter = 1;
            for (const account of accounts) {
                try {
                    console.info('*** [INFO]', 'Processing account: currency: ' + account.currency + ', address: ' + account.address + ' (' + counter + '/' + accounts.length + ')');
                    account.set({
                        privateKey: crypto.encrypt(crypto.decrypt(account.privateKey, oldCryptoKey), newCryptoKey),
                        updated: Date.now()
                    });
                    await account.save();
                    counter++;
                } catch (e) {
                    console.error('[ERROR]', e.toString());
                }
            }
            console.info('[INFO]', 'End processing accounts');
        } else {
            console.info('[INFO]', 'Accounts not found');
        }
        console.info('[INFO]', 'End crypto key update script');
    } catch (e) {
        console.error('[ERROR]', e);
        await db.disconnect();
        process.exit(1);
    }
})();