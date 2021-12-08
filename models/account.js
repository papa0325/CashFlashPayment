const mongoose = require('mongoose');
// const autoIncrement = require('mongoose-auto-increment');
//
// autoIncrement.initialize(mongoose);

const accountSchema = new mongoose.Schema({
    client_id: {type: String},
    // custom_id: {type: Number},

    isReserve: {type: Boolean, required: true, default: false},
    isFixed: {type: Boolean, required: true, default: false},

    currency: {type: String, required: true},
    address: {type: String, required: true, unique: true},
    balance: {type: String, default: '0'},
    balance_in: {type: String, default: '0'},
    balance_out: {type: String, default: '0'},
    balance_pending: {type: String, default: '0'},

    tokens: [{
        symbol: {type: String},
        balance: {type: String},
        balance_in: {type: String},
        balance_out: {type: String},
        contract_address: {type: String},
        decimals: {type: Number}
    }],

    private_key: {type: String},
    tx_in: {type: Array, default: []},
    tx_out: {type: Array, default: []},

    expires: {type: Date},
    expiresTimestamp: {type: Number},

    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now}
}, {
    autoIndex: false,
    collection: 'account',
    versionKey: false
});

// accountSchema.plugin(autoIncrement.plugin, {model: 'account', field: 'custom_id', startAt: 10, incrementBy: 10});

module.exports = mongoose.model('account', accountSchema);
