const path = require('path');
const fs = require('fs');
const os = require('os');

// Config
const _config = require(path.join(__dirname, '..', 'lib', 'config'));

// Modules
const _modules = require(path.join(__dirname, '..', 'modules'));

const getRequestParams = req => {
    switch (req.method) {
        case 'GET':
            return JSON.stringify(req.query);
        case 'POST':
            return JSON.stringify(req.body);
        default:
            return {};
    }
};
exports.getRequestParams = getRequestParams;
const getClientInfoByReq = req => {
    return '< CLIENT: \'' + req._client.desc + '\' >'
};
exports.getClientInfoByReq = getClientInfoByReq;
exports.getClientInfo = client => {
    return '< CLIENT: \'' + client.desc + '\' >'
};

exports.delay = ms => new Promise(resolve => setTimeout(resolve, ms));

exports.emptyIndent = n => {
    return '\u00A0'.repeat(n);
};

exports.stringIsPositiveInteger = str => {
    const n = Math.floor(Number(str));
    return n !== Infinity && String(n) === str && n >= 0;
};

exports.printUptimeLine = (iteration, startTime) => {
    try {
        const uptime = _modules.time.from(startTime);
        return console.info('*************** ITERATION ' + iteration + ' | UPTIME: ' + uptime.days + 'd ' + uptime.hours + 'h ' + uptime.minutes + 'm ' + uptime.seconds + 's ***************');
    } catch (e) {
        throw e
    }
};

exports.printRequestInfoLine = req => {
    return console.info('[REQUEST]', _modules.time.now(), (typeof req._client !== 'undefined') ? getClientInfoByReq(req) : '< CLIENT NOT IDENTIFIED >', 'METHOD: ' + req.method + ' | ROUTE: ' + (req.baseUrl + req.path) + ' | PARAMS: ' + getRequestParams(req));
};

exports.writeAccessLog = req => {
    try {
        fs.appendFileSync(_config.PATH.FOLDERS.LOGS.ACCESS, `${_modules.time.now()} IP: ${req.ip} | AUTH: ${req.headers.authorization} ${typeof req.headers.otp !== 'undefined' ?  '| OTP: ' + req.headers.otp : ''}| METHOD: ${req.method} | ROUTE: ${req.baseUrl + req.path} | PARAMS: ${getRequestParams(req)}${os.EOL}`);
    } catch (e) {
        console.error('>>>>>>>>>> ERROR (writeAccessLog) <<<<<<<<<<\n', e);
    }
};

exports.writeLog = (target, type, client, content) => {
    try {
        if (!type || !target || !content) {
            return;
        }

        const targets = {
            filter: [_config.PATH.FOLDERS.LOGS.FILES.FILTERS, _config.PATH.FOLDERS.LOGS.FILES.FILTERS_ERR],
            ipn: [_config.PATH.FOLDERS.LOGS.FILES.IPN, _config.PATH.FOLDERS.LOGS.FILES.IPN_ERR],
            api: [_config.PATH.FOLDERS.LOGS.FILES.API, _config.PATH.FOLDERS.LOGS.FILES.API_ERR],
            tokenTransfer: [_config.PATH.FOLDERS.LOGS.FILES.TOKEN_TRANSFER, _config.PATH.FOLDERS.LOGS.FILES.TOKEN_TRANSFER_ERR],
            utils: [_config.PATH.FOLDERS.LOGS.FILES.UTILS, _config.PATH.FOLDERS.LOGS.FILES.UTILS_ERR]
        };
        if ((Object.keys(targets).indexOf(target) === -1)) {
            return;
        }

        const types = {
            info: 0,
            error: 1
        };
        if ((Object.keys(types).indexOf(type) === -1)) {
            return;
        }
        fs.appendFileSync(targets[target][types[type]], `${_modules.time.now()} ${client ? ('CLIENT: ' + client.desc + ' | ') : ''}${type === 'error' ? (content.stack || content) : content}${os.EOL}`);
    } catch (e) {
        console.error('>>>>>>>>>> ERROR (writeLog) <<<<<<<<<<\n', e);
    }
};

