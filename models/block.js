const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
    currency: {type: String},
    number: {type: Number},
    timestamp: {type: Number},
    updated: {type: Date}
}, {
    autoIndex: false,
    collection: 'block',
    versionKey: false
});

module.exports = mongoose.model('block', blockSchema);
