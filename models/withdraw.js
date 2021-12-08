const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema({
    client_id: {type: String},

    order_id: {type: String},
    currency: {type: String},
    to: {type: String},

    amount_requested: {type: String},
    amount_estimated: {type: String},
    amount_sent: {type: String},

    isTokenTransferTx: {type: Boolean},

    token: {
        symbol: {type: String},
        contract_address: {type: String},
        decimals: {type: Number}
    },

    token_balance: {
        current: {type: String}
    },

    currency_balance: {
        current: {type: String},
        pending: {type: String}
    },

    txs: [{
        amount: {type: String},
        tx_id: {type: String},
        fee: {type: String},
        satoshiPerByte: {type: String}
    }],

    createdTimestamp: {type: Number},
    created: {type: Date, default: Date.now}
}, {
    autoIndex: false,
    collection: 'withdraw',
    versionKey: false
});

module.exports = mongoose.model('withdraw', withdrawSchema);
