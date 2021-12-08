const btoa = require('btoa');
const atob = require('atob');
const speakeasy = require('speakeasy');
const path = require('path');

const clientIdentification = async (req, res, next) => {
    try {
        const _authorization = (typeof req.headers.authorization !== 'undefined') ? req.headers.authorization : null;
        if (_authorization) {
            const authorization_arr = _authorization.split(' ');
            if (authorization_arr.length === 2) {
                const auth_type = authorization_arr[0];
                if (auth_type === 'Basic') {
                    const auth_credentials = atob(authorization_arr[1]);
                    const auth_credentials_arr = auth_credentials.split(':');
                    if (auth_credentials_arr.length === 2) {
                        const client_id = auth_credentials_arr[0];
                        const client_password = auth_credentials_arr[1];

                        const client = await db_model.client.findOne({isActive: true, id: client_id, password: client_password});

                        if (client) {
                        // if (client && client.ip === req.ip) {
                            res.set('authorization', getServiceIdentificationString(client.service_id, client.service_password));
                            req._client = client;
                            utils.helpers.printRequestInfoLine(req);
                            return next();
                        }
                    }
                }
            }
        }
        utils.helpers.printRequestInfoLine(req);
        console.info('[RESPONSE]', '< CLIENT NOT IDENTIFIED >', 'CONTENT: forbidden', '{401}');
        return res.status(401).send('forbidden');
    } catch (e) {
        utils.helpers.writeLog('utils', 'error', null, e);
        console.error('[ERROR]', '< CLIENT NOT IDENTIFIED >', e.toString());
        console.info('[RESPONSE]', '< CLIENT NOT IDENTIFIED >', 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
};

const checkOTP = (req, res, next) => {
    try {
        const _otp = (typeof req.headers.otp !== 'undefined') ? req.headers.otp : null;
        if (_otp) {
            const verified = speakeasy.totp.verify({
                secret: req._client.twofa_key,
                encoding: 'base32',
                token: _otp,
                window: req._client.twofa_window
            });
            if(verified){
                return next();
            }
        }
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: forbidden', '{402}');
        return res.status(402).send('forbidden');
    } catch (e) {
        utils.helpers.writeLog('utils', 'error', req._client, e);
        console.error('[ERROR]', utils.helpers.getClientInfoByReq(req), e.toString());
        console.info('[RESPONSE]', utils.helpers.getClientInfoByReq(req), 'CONTENT: internal server error', '{500}');
        return res.status(500).send('internal server error');
    }
};

const getServiceIdentificationString = (id, password) => {
    try {
        return 'Basic ' + btoa(id + ':' + password);
    } catch (e) {
        throw e;
    }
};

module.exports = {
    clientIdentification: clientIdentification,
    checkOTP: checkOTP,
    getServiceIdentificationString: getServiceIdentificationString
};