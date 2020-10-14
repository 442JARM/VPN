const CryptoJS = require(`crypto-js`),
    randomBytes = require(`randombytes`);

const secretTo256 = (rawSharedSecret) =>
    CryptoJS.SHA256(rawSharedSecret).toString(CryptoJS.enc.Base64);

const encryptObj = (msgObj, sharedSecret) =>
    CryptoJS.AES.encrypt(JSON.stringify(msgObj), sharedSecret).toString();

const decryptObj = (cipher, sharedSecret) =>
    JSON.parse(CryptoJS.AES.decrypt(cipher, sharedSecret).toString(CryptoJS.enc.Utf8));

const encryptString = (plain, sessionKey) =>
    CryptoJS.AES.encrypt(plain, sessionKey).toString();

const decryptString = (cipher, sessionKey) =>
    CryptoJS.AES.decrypt(cipher, sessionKey).toString(CryptoJS.enc.Utf8);

const hashObjWithHmac = (msgObj, sharedSecret) =>
    CryptoJS.HmacSHA256(JSON.stringify(msgObj), sharedSecret).toString();

const hashStringWithHmac = (plain, sessionKey) =>
    CryptoJS.HmacSHA256(plain, sessionKey).toString();

const getRandomBytes = (size) =>
    randomBytes(size || 32);

module.exports = {
    secretTo256,
    encryptObj,
    decryptObj,
    hashObjWithHmac,
    hashStringWithHmac,
    encryptString,
    decryptString,
    getRandomBytes
};
