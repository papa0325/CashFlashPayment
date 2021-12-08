const mongoose = require('mongoose');

const ipnSchema = new mongoose.Schema({
    client_id: {type: String},

    status: {type: Number},

    address: {type: String},
    tx_id: {type: String},
    blockNumber: {type: String},
    currency: {type: String},
    amount: {type: String},

    vout: {type: Number},

    isSentNotify: {type: Boolean, default: false},
    attemptSendNotify: {type: Number, default: 0},
    attemptSendNotifyTimestamp: {type: Number},

    isSentResult: {type: Boolean, default: false},
    attemptSendResult: {type: Number, default: 0},
    attemptSendResultTimestamp: {type: Number},

    isTokenTransferTx: {type: Boolean},
    token: {
        symbol: {type: String},
        amount: {type: String},
        contract_address: {type: String},
        decimals: {type: Number}
    },

    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now},
}, {
    autoIndex: false,
    collection: 'ipn',
    versionKey: false
});

module.exports = mongoose.model('ipn', ipnSchema);
