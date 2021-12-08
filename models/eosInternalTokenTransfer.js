const mongoose = require('mongoose');

const eosInternalTokenTransferSchema = new mongoose.Schema({
    client_id: {type: String},
    order_id: {type: String},
    currency: {type: String},
    from: {type: String},
    to: {type: String},
    isTokenTransferTx: {type: Boolean},
    amount_requested:  {type: String},
    amount_estimated:  {type: String},
    amount_transfer:  {type: String},

    token: {
        symbol: {type: String},
        contract_address: {type: String},
        decimals: {type: Number}
    },

    token_balance: {
        current_from: {type: String},
        current_to: {type: String},
    },

    createdTimestamp: {type: Number},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now}
}, {
    autoIndex: false,
    collection: 'eosInternalTokenTransfer',
    versionKey: false
});

module.exports = mongoose.model('eosInternalTokenTransfer', eosInternalTokenTransferSchema);
