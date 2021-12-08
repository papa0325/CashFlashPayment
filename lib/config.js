const path = require('path');
require('dotenv').config({path: path.join(__dirname, '..', '.env')});

module.exports = {
    CURRENCY: {
        EOS: {
            api_key: process.env.DFUSE_APIKEY,
            api_key_eosnative: process.env.DFUSE_APIKEY_EOSNATIVE,
            authEndpoint: process.env.AUTH_ENDPOINT,
            baseEndpoint: process.env.BASE_ENDPOINT,
            dfuse_api_network: process.env.DFUSE_API_NETWORK,
            transfer_quantity: '0.0001 EOS',
            push_guaranteed: 'in-block',
            baseAccountName: process.env.BASE_ACCOUNT,
            FILTER_TIMEOUT: 5,
            ADDRESS:  process.env.CONTRACT_ADDRESS,
            symbol: 'EOS',
            DECIMALS: 4,
            issuer_cft_acc: process.env.ISSUER_CFT_ACCOUNT,
            base_name_currency: process.env.BASE_NAME_CURRENCY,
            token_name_currency: process.env.TOKEN_NAME_CURRENCY,
            back_blocks: 400,
            limit_block: 100
        }
    },
    TOKENS: {
        EOS: {
            CFT: {
                SYMBOL: 'CFT',
                ADDRESS: process.env.CONTRACT_ADDRESS_TOKEN,
                DECIMALS: 4
            }
        }
    },
    IPN: {
        TIMEOUT: 30, // 30 sec
        FREEZE: {
            NOTIFY:  2 * 60, // 2 min
            RESULT: 3 * 60 // 3 min
        }
    },
    PATH: {
        FOLDERS: {
            KEYS: {
                HEAD: path.join(__dirname, '..', 'keys'),
                CURRENCY: {
                    EOS: path.join(__dirname, '..', 'keys', 'EOS'),
                }
            },
            LOGS: {
                HEAD: path.join(__dirname, '..', 'logs'),
                ACCESS: path.join(__dirname, '..', 'logs', 'access'),
                FILES: {
                    FILTERS: path.join(__dirname, '..', 'logs', 'filters.log'),
                    FILTERS_ERR: path.join(__dirname, '..', 'logs', 'filters.errors.log'),
                    IPN: path.join(__dirname, '..', 'logs', 'ipn.log'),
                    IPN_ERR: path.join(__dirname, '..', 'logs', 'ipn.errors.log'),
                    API: path.join(__dirname, '..', 'logs', 'api.log'),
                    API_ERR: path.join(__dirname, '..', 'logs', 'api.errors.log'),
                    UTILS: path.join(__dirname, '..', 'logs', 'utils.log'),
                    UTILS_ERR: path.join(__dirname, '..', 'logs', 'utils.errors.log'),
                    TOKEN_TRANSFER: path.join(__dirname, '..', 'logs', 'tokenTransfer.log'),
                    TOKEN_TRANSFER_ERR: path.join(__dirname, '..', 'logs', 'tokenTransfer.errors.log')
                }
            }
        }
    }
};

