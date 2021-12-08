const speakeasy = require('speakeasy');

const secret = speakeasy.generateSecret({length: 10, name: 'Cashflash_TEST'});
console.log('Generated (base32):', secret.base32);

// const token = speakeasy.totp({
//     secret: '',
//     encoding: 'base32'
// });
// console.log('Token:', token);



