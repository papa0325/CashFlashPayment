const mongoose = require('mongoose');
const path = require('path');

// Config
const _config = require(path.join(__dirname, '..', 'lib', 'config'));

exports.connect = async () => {
    try {
        let mongooseOptions = {
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
            autoIndex: false ,
            useUnifiedTopology: true,
            family: 4,
            poolSize: 200
        };
        if (process.env.DB_AUTH_REQUIRED === 'true') {
            mongooseOptions.auth = {
                authSource: process.env.DB_SOURCE
            };
            mongooseOptions.user = process.env.DB_USER;
            mongooseOptions.pass = process.env.DB_PASSWORD;
        }

        await mongoose.connect(`mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`, mongooseOptions);
        console.info('[INFO]', 'Connection to database successfully');
    } catch (e) {
        throw e;
    }
};

exports.disconnect = async () => {
    try {
        await mongoose.disconnect();
        console.info('[INFO]', 'Disconnect from database successfully');
    } catch (e) {
        throw e;
    }
};
