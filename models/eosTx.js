const mongoose = require('mongoose');

const eosTxSchema = new mongoose.Schema({
    client_id: {type: String},

    address: {type: String},
    tx_id: {type: String},
    blockNumber: {type: String},
    amount: {type: String},

    isTokenTransferTx: {type: Boolean},
    token: {
        symbol: {type: String},
        amount: {type: String},
        contract_address: {type: String},
        decimals: {type: Number}
    },

    confirmed: {type: Boolean, default: false},
    failed: {type: Boolean, default: false},
    confirmations: {type: Number, default: 0},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now}
}, {
    autoIndex: false,
    collection: 'eosTx',
    versionKey: false
});

module.exports = mongoose.model('eosTx', eosTxSchema);
