const mongoose = require('mongoose');

const buyCFTfromEOSSchema = new mongoose.Schema({
    client_id: {type: String},
    order_id: {type: String},
    currency_sell: {type: String},
    currency_buy: {type: String},
    from: {type: String},
    to: {type: String},
    isTokenTransferTx: {type: Boolean},
    amount_requested:  {type: String},
    amount_buy:  {type: String},
    amount_estimated:  {type: String},
    rate:   {type: String},

    token_balance: {
        current_EOS: {type: String},
        current_CFT: {type: String},
        current_issuer_EOS: {type: String},
        current_issuer_CFT: {type: String}
    },

    createdTimestamp: {type: Number},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now}
}, {
    autoIndex: false,
    collection: 'buyCFTfromEOS',
    versionKey: false
});

module.exports = mongoose.model('buyCFTfromEOS', buyCFTfromEOSSchema);
