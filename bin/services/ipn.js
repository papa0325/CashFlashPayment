const axios = require('axios');
const path = require('path');

// Config
const config = require(path.join(__dirname, '..', '..', 'lib', 'config'));

// Utils
const utils = {
    db: require(path.join(__dirname, '..', '..', 'utils', 'db')),
    helpers: require(path.join(__dirname, '..', '..', 'utils', 'helpers')),
    auth: require(path.join(__dirname, '..', '..', 'utils', 'auth'))
};

// Modules
const modules = require(path.join(__dirname, '..', '..', 'modules'));

// Models
const db_model = {
    client: require(path.join(__dirname, '..', '..', 'models', 'client')),
    ipn: require(path.join(__dirname, '..', '..', 'models', 'ipn'))
};

(async() => {
    try {
        console.info('****************************************************************************************************');
        console.info('[INFO]', 'Start IPN service');
        await utils.db.connect();
        await recursiveChecker();
    } catch (e) {
        utils.helpers.writeLog('ipn', 'error', null, e);
        console.error('[ERROR]', e.toString());
        await utils.db.disconnect();
        process.exit(1);
    }
})();

let iteration = 1;
const startTime = new Date();
async function recursiveChecker() {
    try {
        // PRINT UPTIME
        utils.helpers.printUptimeLine(iteration, startTime);

        // BASIC LOGIC
        await basicLogic();

        iteration++;
        return await recursiveChecker();
    } catch (e) {
        throw e;
    }
}

// Functions
const basicLogic = async function () {
    try {
        const IPNs = await db_model.ipn.find({
            $or: [
                {
                    status: 0,
                    isSentNotify: false,
                    attemptSendNotify: {$lt: 3},
                    $or: [
                        {attemptSendNotifyTimestamp: {$exists: false}},
                        {attemptSendNotifyTimestamp: {$lt: modules.time.nowTimestamp() - config.IPN.FREEZE.NOTIFY}}
                    ]
                },
                {
                    status: 1,
                    isSentResult: false,
                    attemptSendResult: {$lt: 5},
                    $or: [
                        {attemptSendResultTimestamp: {$exists: false}},
                        {attemptSendResultTimestamp: {$lt: modules.time.nowTimestamp() - config.IPN.FREEZE.RESULT}}
                    ]
                },
                {
                    status: 2,
                    isSentResult: false,
                    attemptSendResult: {$lt: 5},
                    $or: [
                        {attemptSendResultTimestamp: {$exists: false}},
                        {attemptSendResultTimestamp: {$lt: modules.time.nowTimestamp() - config.IPN.FREEZE.RESULT}}
                    ]
                }
            ]
        });
        if (IPNs.length !== 0) {
            console.info('[INFO]', 'Start sending IPNs (' + IPNs.length + ')');
            let success_ipn_count = 0;
            let failed_ipn_count = 0;
            let counter = 1;
            for (const ipn of IPNs) {
                try {
                    console.info('*** [INFO]', 'Processing ' + counter + '/' + IPNs.length);
                    counter++;

                    const client = await db_model.client.findOne({id: ipn.client_id}).lean();
                    try {
                        let data = {
                            currency: ipn.currency,
                            address: ipn.address,
                            amount: ipn.amount,
                            tx_id: ipn.tx_id,
                            status: ipn.status
                        };
                        if (data.currency === 'eos') {
                            data.isTokenTransferTx = ipn.isTokenTransferTx;
                            if (ipn.isTokenTransferTx) {
                                data.amount = ipn.token.amount;
                                data.symbol = ipn.token.symbol;
                                data.contract_address = ipn.token.contract_address;
                                data.decimals = ipn.token.decimals;
                            }
                        }
                        const response = await axios({
                            method: 'post',
                            headers: {
                                'Authorization': utils.auth.getServiceIdentificationString(client.service_id, client.service_password)
                            },
                            url: client.ipn_url,
                            data: data
                        });
                        if (response.status === 200 || response.status === 202) {
                            console.info(utils.helpers.emptyIndent(4) + '[INFO]', utils.helpers.getClientInfo(client), 'IPN successfully sent');
                            if (ipn.status === 0) {
                                ipn.set({isSentNotify: true});
                            } else {
                                ipn.set({isSentResult: true});
                            }
                            success_ipn_count++;
                        } else {
                            console.warn(utils.helpers.emptyIndent(4) + '[WARNING]', utils.helpers.getClientInfo(client), 'IPN sending failed. Client returned invalid status code');
                            failed_ipn_count++;
                        }
                    } catch (e) {
                        utils.helpers.writeLog('ipn', 'error', client, e);
                        console.error(utils.helpers.emptyIndent(4) + '[ERROR]', utils.helpers.getClientInfo(client), e.toString());
                        failed_ipn_count++;
                    }

                    if (ipn.status === 0) {
                        ipn.set({
                            attemptSendNotify: ipn.attemptSendNotify + 1,
                            attemptSendNotifyTimestamp: modules.time.nowTimestamp(),
                            updated: Date.now()
                        });
                    } else {
                        ipn.set({
                            attemptSendResult: ipn.attemptSendResult + 1,
                            attemptSendResultTimestamp: modules.time.nowTimestamp(),
                            updated: Date.now()
                        });
                    }

                    await ipn.save();
                } catch (e) {
                    utils.helpers.writeLog('ipn', 'error', null, e);
                    console.error(utils.helpers.emptyIndent(4) + '[ERROR]', e.toString());
                    failed_ipn_count++;
                }
            }
            console.info('[INFO]', 'End sending IPNs (success: ' + success_ipn_count + ', failed: ' + failed_ipn_count + ')');
        } else {
            console.info('[INFO]', 'IPNs to send not found');
            console.info('[INFO]', 'Timeout: ' + config.IPN.TIMEOUT + ' seconds');
            await utils.helpers.delay(config.IPN.TIMEOUT * 1000);
        }
    } catch (e) {
        throw e
    }
};
