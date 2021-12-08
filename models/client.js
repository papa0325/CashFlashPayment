const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    isActive: {type: Boolean},

    id: {type: String},
    password: {type: String},
    desc: {type: String},

    token: {type: String},
    expires_at: {type: Number},

    service_id: {type: String},
    service_password: {type: String},

    ip: {type: String},
    ipn_url: {type: String},

    twofa_key: {type: String},
    twofa_window: {type: Number},

    manager: {
        address:  {type: String},
        private_key:  {type: String},
    },

    currencies: [{
        isActive: {type: Boolean},
        isBusy: {type: Boolean},
        symbol: {type: String},
        lifeTime: {type: Number}, // in seconds, 24*60*60 = 86400 (2 days)
        blocks_for_confirmation: {type: Number},
        blocks_for_change_confirmation: {type: Number},
        withdraw_freeze: {type: Number}, // in seconds
        tokens: [{
            isActive: {type: Boolean},
            isBusy: {type: Boolean},
            symbol: {type: String},
            address: {type: String},
            decimals: {type: Number},
            min_token_for_transfer: {type: String},
            withdraw_freeze: {type: Number}, // in seconds
            manager: {
                address: {type: String},
                private_key: {type: String}
            }
        }]
    }],

    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now}
}, {
    autoIndex: false,
    collection: 'client',
    versionKey: false
});

module.exports = mongoose.model('client', clientSchema);
