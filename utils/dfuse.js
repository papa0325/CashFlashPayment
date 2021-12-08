const axios = require('axios');
const querystring = require('querystring');
const path = require('path');

// Config
const config = require(path.join(__dirname, '..', 'lib', 'config'));

// Models
const db_model = {
    client: require(path.join(__dirname, '..', 'models', 'client'))
};

// Utils
const utils = {
    crypto: require(path.join(__dirname, '..', 'utils', 'crypto')),
};

exports.getLastBlock = async () => {
    try {
        const client = await this.checkToken();
        const params = {
            time: (new Date()).toISOString(),
            comparator: 'lt',
        };
        const response = await axios.get(config.CURRENCY.EOS.baseEndpoint + '/v0/block_id/by_time' + '?' + querystring.stringify(params), {
            headers: {
                'content-type': 'application/json',
                //'Authorization': 'Bearer ' + client.token
            }
        });

        return Number(response.data.block.num);
    } catch (e) {
        console.log('Error: ', e.response ? e.response.data ? e.response.data : '' : '');
    }
};

exports.getTransactions = async (start_block, block_count) => {
    try {
        console.info('*** [INFO]', 'Parsing blocks from ' + start_block + ' to ' + (start_block + block_count) + ' (' + block_count + ' blocks)');

        let transactions = [];
        let cursor = '';
        let res = [];
        let countRequest = 0;
        const limit = config.CURRENCY.EOS.limit_block;
        let low = -block_count;
        let high = -1;
        let job = true;
        do {
            countRequest++;
            console.log ('Step-------',countRequest);

            const data = JSON.stringify({
                query: "query ($query: String!, $cursor: String, $limit: Int64, $low: Int64, $high: Int64, $irreversibleOnly: Boolean) {\n  searchTransactionsBackward(query: $query, lowBlockNum: $low, highBlockNum: $high, limit: $limit, cursor: $cursor, irreversibleOnly: $irreversibleOnly) {\n    results {\n      cursor\n      trace {\n        block {\n          num\n          id\n          confirmed\n          timestamp\n          previous\n        }\n        id\n        matchingActions {\n          account\n          name\n          json\n          seq\n          receiver\n        }\n      }\n    }\n  }\n}",
                variables: {"query":"(account:eosio.token OR account:cftcashflash) action:transfer -data.quantity:'0.0001 EOS'","low":low,"high":high,"cursor":cursor,"limit":limit,"irreversibleOnly":true}
                })
            const response = await axios({
                method: 'post',
                headers: {
                    'Content-Type': "application/json"
                },
                url: config.CURRENCY.EOS.baseEndpoint + "/graphql",
                data
            });
            if (response.data.errors) job = false;
            if (response.status === 200) {
                if (response.data.data) {
                    if (response.data.data.searchTransactionsBackward) {
                        if (response.data.data.searchTransactionsBackward !== null) {
                            res = response.data.data.searchTransactionsBackward.results;
                            if (res.length > 0) {
                                if (res.trace) {
                                    if (res.block) {
                                        high = res.trace.block.num
                                    };
                                };
                                if (res[res.length - 1].cursor) cursor =  res[res.length - 1].cursor;
                                console.log(cursor)
                            } else job = false;
                            transactions = transactions.concat(res);
                            console.log('TXs: ', res.length);
                            if (res.length < limit) break;
                        } else job = false;
                    }
                }
            } else break;
        } while (res.length === limit && job)
        return {transactions};
    } catch (e) {
        console.log('Error: ', e);
    }
};

exports.checkToken = async () => {
    let client = await db_model.client.findOne({isActive: true});

    if (client.token === '' || Math.round(new Date().getTime()/1000.0) > client.expires_at) {
        const result = await this.refreshToken();
        if (result.nModified === 1) {
            client = await db_model.client.findOne({isActive: true});
        }
    }
    return client
};

exports.refreshToken = async () => {
    try {
        const response = await axios(config.CURRENCY.EOS.authEndpoint + '/v1/auth/issue', {
            method: "POST",
            data: JSON.stringify({
                api_key: config.CURRENCY.EOS.api_key
            }),
            headers: {
                'content-type': 'application/json'
            }
        });
        return await db_model.client.updateOne({isActive: true}, {
            $set: {
                token: response.data.token,
                expires_at: response.data.expires_at
            }
        });
    } catch (e) {
        console.log('Error: ', e);
    }
};

exports.readConfig = async () => {
    try {
        const network = config.CURRENCY.EOS.dfuse_api_network || 'api.testnet.eos.io';
        const guaranteed = config.CURRENCY.EOS.push_guaranteed || 'in-block';

        const dfuseApiKeyNative = config.CURRENCY.EOS.api_key_eosnative;
        if (dfuseApiKeyNative === undefined) {
            console.log(
                "You must have a 'process.env.DFUSE_API_KEY' environment variable containing your dfuse API key."
            );
        }
        let client = await db_model.client.findOne({isActive: true});
        client = JSON.parse(JSON.stringify(client));
        const privateKey = utils.crypto.decrypt(client.manager.private_key, process.env.TOKEN_MANAGER_KEY_EOS);
        if (privateKey === undefined) {
            console.log(
                "You must have a 'SIGNING_PRIVATE_KEY' environment variable containing private used to sign."
            );
        }

        const transferFrom = config.CURRENCY.EOS.baseAccountName;
        if (transferFrom === undefined) {
            console.log(
                "You must have a 'TRANSFER_FROM_ACCOUNT' environment variable containing account that is going to send token."
            );
        }

        return {
            network,
            guaranteed,
            dfuseApiKeyNative,
            privateKey,
            transferFrom,
    }
    } catch (e) {
        console.log('Error: ', e);
    }
};

