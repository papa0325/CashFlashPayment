const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const makeDir = require('make-dir');
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");

// Utils
global.utils = {
    auth: require(path.join(__dirname, 'utils', 'auth')),
    crypto: require(path.join(__dirname, 'utils', 'crypto')),
    db: require(path.join(__dirname, 'utils', 'db')),
    helpers: require(path.join(__dirname, 'utils', 'helpers'))
};

// Config
global.config = require(path.join(__dirname, 'lib', 'config'));

// Modules
global.modules = require(path.join(__dirname, 'modules'));

// Models
global.db_model = {
    client: require(path.join(__dirname, 'models', 'client')),
    account: require(path.join(__dirname, 'models', 'account')),
    block: require(path.join(__dirname, 'models', 'block')),
    ipn: require(path.join(__dirname, 'models', 'ipn')),
    withdraw: require(path.join(__dirname, 'models', 'withdraw')),
    eosTx: require(path.join(__dirname, 'models', 'eosTx'))
};

const app = express();

// Middleware's
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Static
app.use(express.static(path.join(__dirname, 'public')));

// TEST ROUTE
app.use('/Jw7zrM9s2S9bt3sc', require(path.join(__dirname, 'routes', 'test')));

// Middleware's
app.use(rateLimit({
    windowMs: 5 * 1000, // 5 sec
    max: 30, // 30 request
    statusCode: 420,
    message: "too many requests"
}));
app.use(slowDown({
    windowMs: 5 * 1000, // 5 sec
    delayAfter: 20, // 20 request
    delayMs: 500
}));
app.use((req, res, next) => {
    utils.helpers.writeAccessLog(req);
    next();
});
app.use(utils.auth.clientIdentification);

// Routes
app.use('/api', require(path.join(__dirname, 'routes', 'api')));
app.use((req, res) => {
    console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: route is not found or unavailable', '{430}');
    return res.status(430).send('route is not found or unavailable');
});

async function makeFolderStructure() {
    try {
        // KEYS
        await Promise.all([
            makeDir(config.PATH.FOLDERS.KEYS.HEAD),
        ]);

        //LOGS
        await Promise.all([
            await makeDir(config.PATH.FOLDERS.LOGS.HEAD)
        ]);

        console.info('[INFO]', 'Folder structure created successfully');
    } catch (e) {
        throw e;
    }
}

function startServer() {
    return new Promise ((resolve, reject) => {
        const HOST = process.env.SERVER_HOST || '127.0.0.1';
        const PORT = process.env.SERVER_PORT || '3000';
        app.listen(PORT, HOST, () => {
            console.info('[INFO]', 'Server start successfully, ' + HOST + ':' + PORT);
            resolve();
        }).on('error', e => {
            reject(e);
        });
    });
}

(async () => {
    try {
        await utils.db.connect();
        await makeFolderStructure();
        await startServer();
        console.info('****************************************************************************************************');
    } catch (e) {
        utils.helpers.writeLog('api', 'error', null, e);
        console.error('[ERROR]', e.toString());
        await utils.db.disconnect();
        process.exit(1);
    }
})();
